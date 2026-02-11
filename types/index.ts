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
  /** 재고(객실 수량) */
  inventory: number;
  /** 정렬 순서 (작을수록 먼저, 카톡 캐로셀 노출 순서와 동일) */
  sortOrder?: number;
  prices: Record<DayOfWeek, DayPrices>; // 요일별 숙박/대실 가격
  dayUseCheckIn: string; // 대실 입실시간 (HH:mm)
  dayUseCheckOut: string; // 대실 퇴실시간 (HH:mm)
  stayCheckIn: string; // 숙박 입실시간 (HH:mm)
  stayCheckOut: string; // 숙박 퇴실시간 (HH:mm)
}

// 고객 (예약/채팅과 분리하여 관리)
export interface Customer {
  id: string;
  /** 표시 이름 */
  name: string;
  /** 연락처 */
  phone: string;
  /** 카카오 채널 사용자 ID (대화 내역·예약 연결용) */
  userId?: string;
  /** 관리자 메모 */
  memo?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// 예약 상태
export type ReservationStatus =
  | 'pending'           // 대기
  | 'confirmed'         // 확정
  | 'rejected'          // 거절
  | 'cancelled_by_guest'  // 고객 취소
  | 'cancelled_by_admin'; // 관리자 취소

// 예약 타입 (관리자 정의)
export interface ReservationType {
  id: string;
  name: string;
  /** Tailwind 색상 클래스 또는 HEX 등, 뱃지 색상용 */
  color: string;
  createdAt: string; // ISO date string
}

export interface Reservation {
  id: string;
  roomId: string;
  /** 고객 정보는 항상 customerId로 Customer에서 조회 */
  customerId: string;
  /** 예약 생성 경로 (지금은 카카오/관리자 수기 정도만 구분) */
  source?: 'kakao' | 'manual';
  /** 관리자 정의 예약 타입 ID (수기 예약용). 카톡 예약은 항상 undefined */
  reservationTypeId?: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  status: ReservationStatus;
  totalPrice: number;
  createdAt: string; // ISO date string
  /** 관리자 메모 (수기 예약용 메모 포함) */
  adminMemo?: string;
  /** 고객이 직접 예약을 취소한 경우, 관리자가 해당 취소를 확인했는지 여부 */
  guestCancellationConfirmed?: boolean;
}

/** API 응답용: 예약 + customerId로 조회한 고객 정보 (화면 표시용) */
export type ReservationWithGuest = Reservation & {
  guestName: string;
  guestPhone: string;
  userId?: string;
};

// 임시 예약 정보 타입 (전화번호 입력 대기 중)
export interface PendingReservation {
  roomId: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  totalPrice: number;
  createdAt: string; // ISO date string (만료 시간 체크용)
}

// 객실 재고 일자별 조정치
export interface RoomInventoryAdjustment {
  roomId: string;
  /** YYYY-MM-DD 형태의 날짜 문자열 */
  date: string;
  /** 해당 날짜에 대해 기본 inventory에 더해지는 조정치(음수/양수 모두 허용) */
  delta: number;
}

// 카카오톡 챗봇 멘트 타입
export type ChatbotSituation =
  | 'channel_added'
  | 'today_day_use'
  | 'today_stay'
  | 'saturday_reservation'
  | 'make_reservation'
  | 'phone_input_request'
  | 'reservation_request'
  | 'reservation_inquiry'
  | 'reservation_cancel'
  // 아래는 하드코딩 제거용 추가 상황
  | 'default_greeting'             // 상황 없을 때 기본 인사
  | 'reservation_empty'            // 예약 내역 없음
  | 'reservation_not_found'        // 해당 예약 없음
  | 'reservation_already_cancelled'// 이미 취소된 예약
  | 'reservation_cancelled_by_user'// 예약 진행 중 사용자 취소
  | 'phone_format_error'           // 전화번호 형식 오류 안내
  | 'room_sold_out'                // 재고 없음 안내
  | 'saturday_day_use_confirm'      // 토요일 대실 선택 시
  | 'saturday_stay_confirm'        // 토요일 숙박 선택 시
  | 'date_select_stay'             // 숙박 날짜선택 후
  | 'date_select_day_use';        // 대실 날짜선택 후

export interface ChatbotMessage {
  situation: ChatbotSituation;
  description: string; // 멘트가 언제 사용되는지 설명 (수정 불가)
  message: string; // 실제 멘트 내용 (수정 가능)
  updatedAt: string;
}

// 카카오톡 대화 내역 타입 (고객 정보는 customerId로 Customer에서 조회)
export interface ChatHistory {
  id: string;
  customerId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/** API 응답용: 대화 내역 + customerId로 조회한 고객 정보 (화면 표시용) */
export type ChatHistoryWithCustomer = ChatHistory & {
  userId: string;
  userName?: string;
  userPhone?: string;
  memo?: string;
};

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
  
  /** 대화 목록/렌더링용 텍스트 (botMessage.response에서 추출한 값) */
  content?: string;
}

