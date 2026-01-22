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
  prices: Record<DayOfWeek, DayPrices>; // 요일별 숙박/대실 가격
  dayUseCheckIn: string; // 대실 입실시간 (HH:mm)
  dayUseCheckOut: string; // 대실 퇴실시간 (HH:mm)
  stayCheckIn: string; // 숙박 입실시간 (HH:mm)
  stayCheckOut: string; // 숙박 퇴실시간 (HH:mm)
  description?: string;
}

// 예약 타입
export type ReservationStatus = 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';

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

// 카카오톡 챗봇 멘트 타입
export type ChatbotSituation = 
  | 'channel_added'           // 채널 추가시
  | 'today_day_use'           // 오늘대실 선택시
  | 'today_stay'              // 오늘숙박 선택시
  | 'saturday_reservation'    // 토요일예약 선택시
  | 'make_reservation'        // 예약하기 선택시
  | 'reservation_request'     // 예약 요청시
  | 'reservation_confirmed'   // 예약 확정시
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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: string; // ISO date string
}

