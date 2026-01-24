import { dataStore } from '@/lib/store';
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

function getMessage(situation: ChatbotSituation | null): string {
  if (!situation) return '안녕하세요! 무엇을 도와드릴까요?';
  return dataStore.getChatbotMessage(situation)?.message ?? '안녕하세요! 무엇을 도와드릴까요?';
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

  // 임시 할인 적용
  const discountedPrice = price * 0.9;
  const discount = price - discountedPrice;
  const discountRate = discount / price * 100;

  return {
    title: room.type,
    price: price,
    currency: 'won',
    discount: discount,
    discountRate: discountRate,
    discountedPrice: discountedPrice,
    thumbnails: [{
      imageUrl: room.imageUrl || 'https://via.placeholder.com/800x600?text=Room',
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

function createRoomCarousel(checkIn: Date, checkOut: Date): KakaoOutputComponent {
  return {
    carousel: {
      type: 'commerceCard',
      items: dataStore.getRooms().map((room) => createRoomItem(room, checkIn, checkOut)),
    }
  };
}

function createHistoryItem(reservation: Reservation): KakaoListItem {
  return {
    title: `${dataStore.getRoom(reservation.roomId)?.type ?? ''} ${new Date(reservation.checkIn).toLocaleDateString()} 입실 ~ ${new Date(reservation.checkOut).toLocaleDateString()} 퇴실`,
    description: reservation.status,
    imageUrl: dataStore.getRoom(reservation.roomId)?.imageUrl ?? '',
    action: "message",
    messageText: `예약내역 조회: ${reservation.roomId}`,
    extra: {
      reservationId: reservation.id,
    },
  };
}

function createHistoryList(userId: string): KakaoOutputComponent {
  return {
    listCard: {
      header: {
        title: '예약내역',
      },
      items: dataStore.getReservations().map((reservation) => createHistoryItem(reservation)),
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
 * 메인 핸들러
 * --------------------------- */

export function handleKakaoSkillRequest(req: KakaoSkillRequest): KakaoSkillResponse {
  const utterance = req.userRequest?.utterance ?? '';
  const params = req.action?.params ?? {};
  const extra = req.action?.clientExtra ?? {};

  const situation = matchSituationFromUtterance(utterance);
  const message = getMessage(situation);

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
          createRoomCarousel(today, today)
        ],
      },
    };
  case '오늘숙박':
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          createRoomCarousel(today, tomorrow)
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
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          createHistoryList(req.userRequest?.user?.id ?? ''),
        ],
      },
    };
  default:
    if (extra.roomId && extra.checkIn && extra.checkOut && extra.totalPrice) {
      return handleReservationRequest(req);
    } else if (extra.type) {
      if (extra.type === 'saturday_day_use') {
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(`토요일 대실 예약하기 눌렀음`),
              createRoomCarousel(saturday, saturday)
            ],
          },
        };
      } else if (extra.type === 'saturday_stay') {
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(`토요일 숙박 예약하기 눌렀음`),
              createRoomCarousel(saturday, sunday)
            ],
          },
        };
      }
    } else if (extra.reservationId) {
      return {
        version: '2.0',
        template: {
          outputs: [simpleText(`${extra.reservationId} 예약내역 눌렀음`)],
        },
      };
    } else if (params.checkin && params.checkout) {
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(`예약하기-숙박-날짜선택 후 출력될 텍스트 지정 필요`),
            createRoomCarousel(getDateFromParams(params.checkin), getDateFromParams(params.checkout))
          ],
        },
      };
    } else if (params.date) {
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(`예약하기-대실-날짜선택 후 출력될 텍스트 지정 필요`),
            createRoomCarousel(getDateFromParams(params.date), getDateFromParams(params.date))
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

function handleReservationRequest(req: KakaoSkillRequest): KakaoSkillResponse {
  const extra = req.action?.clientExtra ?? {};
  const userId = req.userRequest?.user?.id ?? '';

  const checkInISO = new Date(extra.checkIn as string).toISOString();
  const checkOutISO = new Date(extra.checkOut as string).toISOString();

  // 예약 요청 저장 후 관리자에게 메세지 전송
  dataStore.addReservation({
    roomId: extra.roomId as string,
    guestName: userId,
    guestPhone: '010-0000-0000',
    checkIn: checkInISO,
    checkOut: checkOutISO,
    status: 'pending',
    totalPrice: extra.totalPrice as number,
    notes: '',
  });

  return {
    version: '2.0',
    template: {
      outputs: [simpleText(dataStore.getChatbotMessage('reservation_request')?.message ?? '')],
    },
  };
}


