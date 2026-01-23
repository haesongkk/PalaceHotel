import { dataStore } from '@/lib/store';
import type { ChatbotSituation, DayOfWeek, Room, Reservation, ReservationStatus } from '@/types';
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

function createRoomItem(room: Room, checkIn: Date, checkOut: Date): KakaoCarouselItem {
  return {
    title: room.type,
    price: 30000,
    currency: 'won',
    discount: 10000,
    discountRate: 0.2,
    discountedPrice: 20000,
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
 * 메인 핸들러
 * --------------------------- */

export function handleKakaoSkillRequest(req: KakaoSkillRequest): KakaoSkillResponse {
  const utterance = req.userRequest?.utterance ?? '';
  const params = req.action?.params ?? {};
  const extra = req.action?.clientExtra ?? {};

  const situation = matchSituationFromUtterance(utterance);
  const message = getMessage(situation);

  switch (utterance) {
  case '오늘대실':
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          createRoomCarousel(new Date(), new Date())
        ],
      },
    };
  case '오늘숙박':
    return {
      version: '2.0',
      template: {
        outputs: [
          simpleText(message),
          createRoomCarousel(new Date(), new Date())
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
    if (extra.roomId && extra.checkIn && extra.checkOut) {
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(dataStore.getChatbotMessage('reservation_request')?.message ?? ''),
            simpleText(dataStore.getChatbotMessage('reservation_confirmed')?.message ?? ''),
          ],
        },
      };
    } else if (extra.type) {
      if (extra.type === 'saturday_day_use') {
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(`토요일 대실 예약하기 눌렀음`),
              createRoomCarousel(new Date(), new Date())
            ],
          },
        };
      } else if (extra.type === 'saturday_stay') {
        return {
          version: '2.0',
          template: {
            outputs: [
              simpleText(`토요일 숙박 예약하기 눌렀음`),
              createRoomCarousel(new Date(), new Date())
            ],
          },
        };
      }
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(`${extra.type} 예약하기 눌렀음`),
            createRoomCarousel(new Date(), new Date())
          ],
        },
      };
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
            simpleText(`${params.checkin} ~ ${params.checkout} 예약하기 눌렀음`),
            createRoomCarousel(new Date(), new Date())
          ],
        },
      };
    } else if (params.date) {
      return {
        version: '2.0',
        template: {
          outputs: [
            simpleText(`${params.date} 예약하기 눌렀음`),
            createRoomCarousel(new Date(), new Date())
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
