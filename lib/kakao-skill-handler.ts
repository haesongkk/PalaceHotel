import { dataStore } from '@/lib/store';
import { sendReservationNotificationAlimtalk, sendReservationCancelledAlimtalk } from '@/lib/alimtalk';
import type { ChatbotSituation, DayOfWeek, Room, Reservation, ReservationStatus, DayPrices } from '@/types';
import type {
  KakaoSkillRequest,
  KakaoSkillResponse,
  KakaoBasicCard,
  KakaoCarousel,
  KakaoQuickReply,
  KakaoListCard,
  KakaoListItem,
  KakaoCommerceCard,
  KakaoCarouselItem,
  KakaoOutputComponent,
  KakaoButton,
} from '@/types/kakao';

/* ---------------------------
 * 이미지 URL 단축 유틸리티
 * --------------------------- */

/**
 * BASE_URL 가져오기
 */
function getBaseUrl(): string {
  return (
    process.env.BASE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  ).replace(/\/$/, ''); // 끝의 슬래시 제거
}

/**
 * 이미지 URL을 짧은 경로로 변환하는 함수
 * 카카오톡 응답 크기 제한(30,720 bytes)을 준수하기 위해 필요
 * 직접 넣은 이미지(data URL)만 우리 API 경로로 변환. 외부 URL은 사용하지 않음.
 */
function shortenImageUrl(url: string | undefined | null, roomId?: string): string {
  if (!url) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/images/placeholder`;
  }

  // data URL (base64)인 경우 - roomId가 있으면 짧은 경로로 변환
  if (url.startsWith('data:') && roomId) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/images/room/${roomId}`;
  }

  // 외부 URL은 사용하지 않음 (placeholder 반환)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/images/placeholder`;
  }

  if (roomId && url.length >= 50) {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/api/images/room/${roomId}`;
  }

  return url;
}

const KEYWORD_MAP: { keyword: string; situation: ChatbotSituation }[] = [
  { keyword: '오늘대실', situation: 'today_day_use' },
  { keyword: '오늘숙박', situation: 'today_stay' },
  { keyword: '토요일예약', situation: 'saturday_reservation' },
  { keyword: '예약하기', situation: 'make_reservation' },
  { keyword: '예약내역', situation: 'reservation_inquiry' },
  { keyword: '폴백', situation: 'channel_added' },
];

function matchSituationFromUtterance(utterance: string): ChatbotSituation | null {
  const trimmed = utterance.trim();
  if (!trimmed) return 'channel_added';

  const lower = trimmed.toLowerCase();
  for (const { keyword, situation } of KEYWORD_MAP) {
    if (lower === keyword.toLowerCase()) return situation;
  }
  return null;
}

async function getMessage(situation: ChatbotSituation | null): Promise<string> {
  const fallback = await dataStore.getChatbotMessage('default_greeting');
  const defaultText = fallback?.message ?? '안녕하세요! 무엇을 도와드릴까요?';
  if (!situation) return defaultText;
  const msg = await dataStore.getChatbotMessage(situation);
  return msg?.message ?? defaultText;
}

/* ---------------------------
 * 날짜/가격 유틸
 * --------------------------- */

function getNights(checkIn: Date, checkOut: Date): number {
  const inD = startOfDay(checkIn);
  const outD = startOfDay(checkOut);
  const diffMs = outD.getTime() - inD.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 86400000); // 24*60*60*1000
}

function getRoomPrice(room: Room, date: Date, isStay: 'stay' | 'dayUse'): number {
  const dayOfWeek = getDayOfWeek(date);
  const dayPrices = room.prices[dayOfWeek];
  if (isStay === 'stay') return dayPrices.stayPrice;
  if (isStay === 'dayUse') return dayPrices.dayUsePrice;
  return 0;
}

function createRoomItem(room: Room, checkIn: Date, checkOut: Date): KakaoCarouselItem {
  const inD = startOfDay(checkIn);
  const nights = getNights(inD, checkOut);

  let price = 0;

  if (nights === 0) {
    price = getRoomPrice(room, inD, "dayUse");
  } else {
    for (let i = 0; i < nights; i++) {
      const date = new Date(inD);
      date.setDate(inD.getDate() + i);
      price += getRoomPrice(room, date, "stay");
    }
  }

  const rate = Math.min(100, Math.max(0, room.discountRate ?? 0));
  const discountedPrice = rate > 0 ? Math.round(price * (1 - rate / 100)) : price;
  const discount = price - discountedPrice;

  return {
    title: room.type,
    // 현재는 객실 설명 필드를 사용하지 않으므로 빈 문자열 전달
    description: '',
    price: price,
    currency: 'won',
    discount: discount,
    discountRate: rate,
    discountedPrice: discountedPrice,
    thumbnails: [{
      imageUrl: shortenImageUrl(room.imageUrl, room.id),
      altText: room.type,
    }],
    buttons: [
      {
        label: '예약하기',
        action: 'message',
        messageText: `${room.type} 객실 예약하기`,
        extra: {
          roomId: room.id,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          totalPrice: discountedPrice,
        },
      },
    ],
  };
}

async function createRoomCarousel(checkIn: Date, checkOut: Date): Promise<KakaoOutputComponent> {
  const rooms = await dataStore.getRooms();
  if (rooms.length === 0) {
    const msg = await dataStore.getChatbotMessage('room_sold_out');
    return simpleText(msg?.message ?? '현재 예약 가능한 객실이 없습니다. 관리자에게 문의해 주세요.');
  }
  return {
    carousel: {
      type: 'commerceCard',
      items: rooms.map((room) => createRoomItem(room, checkIn, checkOut)),
    }
  };
}

async function createHistoryItem(reservation: Reservation): Promise<KakaoListItem> {
  const room = await dataStore.getRoom(reservation.roomId);
  const title = `${room?.type ?? ''} ${new Date(
    reservation.checkIn,
  ).toLocaleDateString()} 입실 ~ ${new Date(
    reservation.checkOut,
  ).toLocaleDateString()} 퇴실`;

  return {
    title,
    description: getReservationStatusLabel(reservation.status),
    imageUrl: room ? shortenImageUrl(room.imageUrl, room.id) : undefined,
    action: 'message',
    messageText: `${title} 조회하기`,
    extra: {
      reservationId: reservation.id,
    },
  };
}

async function createHistoryList(userId: string): Promise<KakaoOutputComponent> {
  const customer = await dataStore.getCustomerByUserId(userId);
  const allReservations = await dataStore.getReservations();
  const reservations = customer
    ? allReservations.filter((r) => r.customerId === customer.id)
    : [];

  if (reservations.length === 0) {
    const emptyMsg = await dataStore.getChatbotMessage('reservation_empty');
    return simpleText(emptyMsg?.message ?? '예약 내역이 없습니다.');
  }

  return {
    listCard: {
      header: {
        title: '예약내역',
      },
      items: await Promise.all(reservations.map((reservation) => createHistoryItem(reservation))),
    },
  };
}

function button(label: string, messageText: string, extra: Record<string, unknown> = {}): KakaoButton {
  return {
    label: label,
    action: "message",
    messageText: messageText,
    extra: extra,
  };
}

function quickReply(text: string, extra: Record<string, unknown> = {}): KakaoQuickReply {
  return {
    label: text,
    action: "message",
    messageText: text,
    extra: extra,
  };
}

function quickReplyBlock(text: string, blockId: string): KakaoQuickReply {
  return {
    label: text,
    action: "block",
    messageText: text,
    blockId: blockId,
  };
}

function simpleText(text: string): KakaoOutputComponent {
  return {
    simpleText: { text: text },
  };
}

/* ---------------------------
 * 전화번호 유틸
 * --------------------------- */

/**
 * 전화번호 형식 검증
 * 010-1234-5678, 01012345678, 010 1234 5678 등 다양한 형식 지원
 */
function isValidPhoneNumber(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 숫자만 추출
  const digits = trimmed.replace(/\D/g, '');
  
  // 010, 011, 016, 017, 018, 019로 시작하고 총 10~11자리인지 확인
  if (digits.length < 10 || digits.length > 11) return false;
  if (!digits.startsWith('010') && !digits.startsWith('011') && 
      !digits.startsWith('016') && !digits.startsWith('017') && 
      !digits.startsWith('018') && !digits.startsWith('019')) {
    return false;
  }

  return true;
}

/**
 * 전화번호를 010-XXXX-XXXX 형식으로 정규화
 */
function normalizePhoneNumber(text: string): string {
  const digits = text.trim().replace(/\D/g, '');
  
  if (digits.length === 10) {
    // 0101234567 -> 010-1234-567
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 11) {
    // 01012345678 -> 010-1234-5678
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  
  // 형식이 맞지 않으면 원본 반환 (에러 처리에서 처리)
  return text.trim();
}

/* ---------------------------
 * 날짜 계산 유틸
 * --------------------------- */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getTodayDate(): Date {
  return startOfDay(new Date());
}

// 달력 기준 "내일" (오늘 00:00 기준 + 1일)
function getTomorrowDate(): Date {
  const d = getTodayDate();
  d.setDate(d.getDate() + 1);
  return startOfDay(d);
}

// 다가오는 가장 첫 토요일 (오늘이 토요일이면 오늘)
function getUpcomingSaturdayDate(): Date {
  const d = getTodayDate();
  const day = d.getDay();           // 0=일 ... 6=토
  const diff = (6 - day + 7) % 7;   // 오늘이 토요일이면 0
  d.setDate(d.getDate() + diff);
  return startOfDay(d);
}

function getUpcomingSundayDate(): Date {
  const d = getTodayDate();
  const day = d.getDay();           // 0=일 ... 6=토
  const diff = (7 - day + 7) % 7;   // 오늘이 일요일이면 0
  d.setDate(d.getDate() + diff);
  return startOfDay(d);
}

function getDateFromParams(params: string): Date {
  const obj = JSON.parse(params);
  const { userTimeZone, value } = obj;
  return startOfDay(new Date(value));
}

function getDayOfWeek(date: Date): DayOfWeek {
  if(date.getDay() === 0) return 'sunday';
  if(date.getDay() === 1) return 'monday';
  if(date.getDay() === 2) return 'tuesday';
  if(date.getDay() === 3) return 'wednesday';
  if(date.getDay() === 4) return 'thursday';
  if(date.getDay() === 5) return 'friday';
  if(date.getDay() === 6) return 'saturday';
  return 'sunday';
}

/* ---------------------------
 * 예약내역 전용 유틸/핸들러
 * --------------------------- */

function getReservationStatusLabel(status: ReservationStatus): string {
  switch (status) {
    case 'pending':
      return '대기';
    case 'confirmed':
      return '확정';
    case 'rejected':
      return '거절';
    case 'cancelled_by_guest':
      return '고객 취소';
    case 'cancelled_by_admin':
      return '관리자 취소';
    default:
      return status;
  }
}

async function createReservationDetailCard(reservation: Reservation): Promise<KakaoOutputComponent> {
  const room = await dataStore.getRoom(reservation.roomId);
  const canCancel = reservation.status === 'pending' || reservation.status === 'confirmed';

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const lines: string[] = [];
  lines.push(`예약번호: ${reservation.id}`);
  if (room) {
    lines.push(`객실: ${room.type}`);
  }
  lines.push(
    `체크인: ${formatDate(reservation.checkIn)}`,
    `체크아웃: ${formatDate(reservation.checkOut)}`,
  );
  lines.push(`상태: ${getReservationStatusLabel(reservation.status)}`);
  lines.push(`결제금액: ${reservation.totalPrice.toLocaleString('ko-KR')}원`);

  const buttons: KakaoButton[] = [];
  if (canCancel) {
    buttons.push({
      label: '예약 취소',
      action: 'message',
      messageText: '예약 취소',
      extra: {
        reservationId: reservation.id,
        action: 'cancel',
      },
    });
  }

  return {
    basicCard: {
      title: room ? `${room.type} 예약 상세` : '예약 상세',
      description: lines.join('\n'),
      thumbnail: {
        imageUrl: room ? shortenImageUrl(room.imageUrl, room.id) : shortenImageUrl(undefined, undefined),
        altText: room?.type ?? '객실',
      },
      buttons,
      buttonLayout: 'vertical',
    },
  };
}

export async function handleReservationHistorySkill(req: KakaoSkillRequest): Promise<KakaoSkillResponse> {
  const utterance = (req.userRequest?.utterance ?? '').trim();
  const extra = req.action?.clientExtra ?? {};
  const userId = req.userRequest?.user?.id ?? '';

  const inquiryMsg = await dataStore.getChatbotMessage('reservation_inquiry');
  const baseMessage = inquiryMsg?.message ?? '예약 내역을 조회해드리겠습니다.';

  const reservationId =
    typeof (extra as Record<string, unknown>).reservationId === 'string'
      ? ((extra as Record<string, unknown>).reservationId as string)
      : undefined;
  const action =
    typeof (extra as Record<string, unknown>).action === 'string'
      ? ((extra as Record<string, unknown>).action as string)
      : undefined;

  // 예약 취소 처리
  if (reservationId && action === 'cancel') {
    const notFoundMsg = await dataStore.getChatbotMessage('reservation_not_found');
    const alreadyCancelledMsg = await dataStore.getChatbotMessage('reservation_already_cancelled');
    const existing = await dataStore.getReservation(reservationId);
    if (!existing) {
      return {
        version: '2.0',
        template: {
          outputs: [simpleText(notFoundMsg?.message ?? '해당 예약을 찾을 수 없습니다.')],
        },
      };
    }

    if (existing.status === 'cancelled_by_guest' || existing.status === 'cancelled_by_admin') {
      return {
        version: '2.0',
        template: {
          outputs: [simpleText(alreadyCancelledMsg?.message ?? '이미 취소된 예약입니다.')],
        },
      };
    }

    const updated =
      (await dataStore.updateReservation(reservationId, { status: 'cancelled_by_guest' })) ?? existing;

    const room = await dataStore.getRoom(updated.roomId);
    const roomType = room?.type ?? '객실';
    sendReservationCancelledAlimtalk(updated.id, {
      roomType,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
    }).catch((err) => console.error('[알림톡] 예약 취소 알림 실패', err));

    const cancelMsg = await dataStore.getChatbotMessage('reservation_cancel');
    const cancelledByUserMsg = await dataStore.getChatbotMessage('reservation_cancelled_by_user');
    const cancelMessage = cancelMsg?.message ?? cancelledByUserMsg?.message ?? '예약이 취소되었습니다.';

    return {
      version: '2.0',
      template: {
        outputs: [simpleText(cancelMessage)],
      },
    };
  }

  // 특정 예약 상세 조회
  if (reservationId) {
    const notFoundMsg = await dataStore.getChatbotMessage('reservation_not_found');
    const reservation = await dataStore.getReservation(reservationId);
    if (!reservation) {
      return {
        version: '2.0',
        template: {
          outputs: [simpleText(notFoundMsg?.message ?? '해당 예약을 찾을 수 없습니다.'), simpleText(baseMessage)],
        },
      };
    }

    const detailCard = await createReservationDetailCard(reservation);
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(baseMessage), detailCard],
      },
    };
  }

  // 기본: 예약 목록
  const historyList = await createHistoryList(userId);
  return {
    version: '2.0',
    template: {
      outputs: [simpleText(baseMessage), historyList],
    },
  };
}

/* ---------------------------
 * 메인 핸들러
 * --------------------------- */

export async function handleKakaoSkillRequest(req: KakaoSkillRequest): Promise<KakaoSkillResponse> {
  const utterance = (req.userRequest?.utterance ?? '').trim();
  const params = req.action?.params ?? {};
  const extra = req.action?.clientExtra ?? {};

  const situation = matchSituationFromUtterance(utterance);
  const message = await getMessage(situation);

  const today = getTodayDate();
  const tomorrow = getTomorrowDate();
  const saturday = getUpcomingSaturdayDate();
  const sunday = getUpcomingSundayDate();


  switch (utterance) {
  case '오늘대실':
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          await createRoomCarousel(today, today)
        ],
      },
    };
  case '오늘숙박':
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          await createRoomCarousel(today, tomorrow)
        ],
      },
    };
  case '토요일예약':
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(message)],
        quickReplies: [
          quickReply('대실', { type: 'saturday_day_use' }),
          quickReply('숙박', { type: 'saturday_stay' }),
        ],
      },
    };
  case '예약하기':
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(message)],
        quickReplies: [
          quickReplyBlock('대실', '696cc91a29827420454073bf'),
          quickReplyBlock('숙박', '696ccaec0c338f3b8e57ac98'),
        ],
      },
    };
  case '예약내역':
    // 예약내역 관련 요청은 전용 핸들러로 위임
    return await handleReservationHistorySkill(req);
  default:
    // 전화번호 입력 처리 (임시 예약 정보가 있는 경우)
    const userId = req.userRequest?.user?.id ?? '';
    const pendingReservation = await dataStore.getPendingReservation(userId);
    
    if (pendingReservation) {
      // 취소 키워드 체크
      const lowerUtterance = utterance.toLowerCase().trim();
      if (lowerUtterance === '취소' || lowerUtterance === '예약취소') {
        await dataStore.deletePendingReservation(userId);
        const cancelledMsg = await dataStore.getChatbotMessage('reservation_cancelled_by_user');
        return {
          version: '2.0',
          template: {
            outputs: [simpleText(cancelledMsg?.message ?? '예약이 취소되었습니다.')],
          },
        };
      }

      // 전화번호 형식 검증
      if (isValidPhoneNumber(utterance)) {
        const normalizedPhone = normalizePhoneNumber(utterance);
        return await handleReservationWithPhone(req, pendingReservation, normalizedPhone);
      } else {
        const phoneErrorMsg = await dataStore.getChatbotMessage('phone_format_error');
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(phoneErrorMsg?.message ?? '전화번호 형식이 올바르지 않습니다.\n다시 입력해주세요.\n예: 010-1234-5678'),
            ],
            quickReplies: [
              quickReply('취소', {}),
            ],
          },
        };
      }
    }
    
    // 객실 선택 처리 (임시 예약 정보 저장 후 전화번호 요청)
    if (extra.roomId && extra.checkIn && extra.checkOut && extra.totalPrice) {
      return await handleRoomSelection(req);
    } else if (extra.type) {
      if (extra.type === 'saturday_day_use') {
        const msg = await dataStore.getChatbotMessage('saturday_day_use_confirm');
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(msg?.message ?? '토요일 대실 예약 가능한 객실을 안내해드리겠습니다.'),
              await createRoomCarousel(saturday, saturday)
            ],
          },
        };
      } else if (extra.type === 'saturday_stay') {
        const msg = await dataStore.getChatbotMessage('saturday_stay_confirm');
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(msg?.message ?? '토요일 숙박 예약 가능한 객실을 안내해드리겠습니다.'),
              await createRoomCarousel(saturday, sunday)
            ],
          },
        };
      }
    } else if ((extra as Record<string, unknown>).reservationId) {
      // 예약내역 리스트에서 특정 예약을 클릭한 경우
      return await handleReservationHistorySkill(req);
    } else if (params.checkin && params.checkout) {
      const msg = await dataStore.getChatbotMessage('date_select_stay');
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(msg?.message ?? '선택하신 날짜에 예약 가능한 객실입니다.'),
            await createRoomCarousel(getDateFromParams(params.checkin), getDateFromParams(params.checkout))
          ],
        },
      };
    } else if (params.date) {
      const msg = await dataStore.getChatbotMessage('date_select_day_use');
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(msg?.message ?? '선택하신 날짜에 대실 가능한 객실입니다.'),
            await createRoomCarousel(getDateFromParams(params.date), getDateFromParams(params.date))
          ],
        },
      };
    }
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(message)],
      },
    };
  }
  
}

/**
 * 객실 선택 시 임시 예약 정보 저장.
 * 재고 확인 후 전화번호 입력 요청(또는 저장된 전화번호 있으면 바로 예약 완료).
 */
async function handleRoomSelection(req: KakaoSkillRequest): Promise<KakaoSkillResponse> {
  const extra = req.action?.clientExtra ?? {};
  const userId = req.userRequest?.user?.id ?? '';
  const roomId = extra.roomId as string;
  const checkIn = new Date(extra.checkIn as string).toISOString();
  const checkOut = new Date(extra.checkOut as string).toISOString();
  const totalPrice = extra.totalPrice as number;

  // 재고 확인 (전화번호 입력 전에 먼저 체크)
  const isAvailable = await dataStore.isRoomAvailable(roomId, checkIn, checkOut);
  if (!isAvailable) {
    const soldOutMsg = await dataStore.getChatbotMessage('room_sold_out');
    const message = soldOutMsg?.message ?? '죄송합니다. 선택하신 날짜에는 남은 객실이 없습니다.\n다른 날짜를 선택하시거나 객실 타입을 변경해서 다시 시도해 주세요.';
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(message)],
      },
    };
  }

  // 임시 예약 정보 저장
  await dataStore.savePendingReservation(userId, {
    roomId,
    checkIn,
    checkOut,
    totalPrice,
  });

  // 유저별 저장 전화번호가 있으면 전화번호 입력 단계 스킵 후 바로 예약 완료 (고객 정보는 Customer에서 조회)
  const history = await dataStore.getOrCreateChatHistory(userId);
  const customer = await dataStore.getCustomer(history.customerId);
  const storedPhone = customer?.phone?.trim();
  if (storedPhone && isValidPhoneNumber(storedPhone)) {
    const pending = await dataStore.getPendingReservation(userId);
    if (pending) {
      return await handleReservationWithPhone(req, pending, normalizePhoneNumber(storedPhone));
    }
  }

  // 전화번호 입력 요청 메시지
  const phoneMsg = await dataStore.getChatbotMessage('phone_input_request');
  const message = phoneMsg?.message ?? 
    '예약을 완료하기 위해 전화번호를 입력해주세요.\n형식: 010-1234-5678';

  return {
    version: '2.0',
    template: {
      outputs: [simpleText(message)],
      quickReplies: [
        quickReply('취소', {}),
      ],
    },
  };
}

/**
 * 전화번호 입력 후 예약 완료 처리
 */
async function handleReservationWithPhone(
  req: KakaoSkillRequest,
  pendingReservation: { roomId: string; checkIn: string; checkOut: string; totalPrice: number },
  phoneNumber: string
): Promise<KakaoSkillResponse> {
  const userId = req.userRequest?.user?.id ?? '';
  const existingCustomer = await dataStore.getCustomerByUserId(userId);
  const guestNameDisplay =
    existingCustomer?.name?.trim() || (userId.length > 8 ? userId.slice(0, 8) : userId);

  // 재고 체크: 객실 타입별 재고를 초과하는 경우 예약 불가 처리
  const isAvailable = await dataStore.isRoomAvailable(
    pendingReservation.roomId,
    pendingReservation.checkIn,
    pendingReservation.checkOut
  );

  if (!isAvailable) {
    await dataStore.deletePendingReservation(userId);
    const soldOutMsg = await dataStore.getChatbotMessage('room_sold_out');
    const message = soldOutMsg?.message ?? '죄송합니다. 선택하신 날짜에는 남은 객실이 없습니다.\n다른 날짜를 선택하시거나 객실 타입을 변경해서 다시 시도해 주세요.';
    return {
      version: '2.0',
      template: {
        outputs: [simpleText(message)],
      },
    };
  }

  // 고객 마스터 생성/갱신 (이름·전화번호), 예약은 customerId만 보관
  const customer = await dataStore.getOrCreateCustomerByUserId(userId, {
    name: guestNameDisplay,
    phone: phoneNumber,
  });

  const reservation = await dataStore.addReservation({
    roomId: pendingReservation.roomId,
    customerId: customer.id,
    source: 'kakao',
    checkIn: pendingReservation.checkIn,
    checkOut: pendingReservation.checkOut,
    status: 'pending',
    totalPrice: pendingReservation.totalPrice,
  });

  // 임시 예약 정보 삭제
  await dataStore.deletePendingReservation(userId);

  // 관리자에게 알림톡 발송 (비동기, 에러는 조용히 처리)
  sendReservationNotificationAlimtalk(reservation.id).catch((error) => {
    console.error('[알림톡 발송 실패]', error);
    // 알림톡 실패해도 예약은 정상 처리됨
  });

  const reqMsg = await dataStore.getChatbotMessage('reservation_request');
  return {
    version: '2.0',
    template: {
      outputs: [simpleText(reqMsg?.message ?? '')],
    },
  };
}


