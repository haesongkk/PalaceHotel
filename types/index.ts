// 객실 타입
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayPrices {
  stayPrice: number; // 숙박 가격
  dayUsePrice: number; // 대실 가격
}

export interface Room {
  id: string;
  imageUrl?: string; // 대표 이미지 URL
  type: string; // 예: '스탠다드', '디럭스', '스위트'
  discountRate?: number; // 할인율(%) - 없으면 0으로 간주
  prices: Record<DayOfWeek, DayPrices>; // 요일별 숙박/대실 가격
  dayUseCheckIn: string; // 대실 입실시간 (HH:mm)
  dayUseCheckOut: string; // 대실 퇴실시간 (HH:mm)
  stayCheckIn: string; // 숙박 입실시간 (HH:mm)
  stayCheckOut: string; // 숙박 퇴실시간 (HH:mm)
  description?: string;
}

// 예약 타입
export type ReservationStatus = 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'rejected';

export interface Reservation {
  id: string;
  roomId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  status: ReservationStatus;
  totalPrice: number;
  notes?: string;
  createdAt: string; // ISO date string
}

// 임시 예약 정보 타입 (전화번호 입력 대기 중)
export interface PendingReservation {
  roomId: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  totalPrice: number;
  createdAt: string; // ISO date string (만료 시간 체크용)
}

// 카카오톡 챗봇 멘트 타입
export type ChatbotSituation = 
  | 'channel_added'           // 채널 추가시
  | 'today_day_use'           // 오늘대실 선택시
  | 'today_stay'              // 오늘숙박 선택시
  | 'saturday_reservation'    // 토요일예약 선택시
  | 'make_reservation'        // 예약하기 선택시
  | 'phone_input_request'     // 전화번호 입력 요청시
  | 'reservation_request'     // 예약 요청시
  | 'reservation_confirmed'   // 예약 확정시
  | 'reservation_rejected'    // 예약 거절시
  | 'reservation_inquiry';    // 예약내역 조회시

export interface ChatbotMessage {
  situation: ChatbotSituation;
  description: string; // 멘트가 언제 사용되는지 설명 (수정 불가)
  message: string; // 실제 멘트 내용 (수정 가능)
  updatedAt: string;
}

// 카카오톡 대화 내역 타입
export interface ChatHistory {
  id: string;
  userId: string; // 카카오톡 사용자 ID
  userName?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// 카카오톡 대화 메시지 타입
export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string; // ISO date string
  
  // 사용자 메시지인 경우
  userMessage?: {
    utterance: string; // 사용자가 입력한 텍스트
    request?: Record<string, unknown>; // 전체 요청 데이터 (선택적)
  };
  
  // 봇 메시지인 경우
  botMessage?: {
    response: {
      version: '2.0';
      template?: {
        outputs: Array<Record<string, unknown>>; // KakaoOutputComponent 배열
        quickReplies?: Array<Record<string, unknown>>; // KakaoQuickReply 배열
      };
      context?: Record<string, unknown>;
      data?: Record<string, unknown>;
    };
  };
  
  // 하위 호환성을 위한 content 필드 (deprecated, 렌더링용으로만 사용)
  content?: string;
}

