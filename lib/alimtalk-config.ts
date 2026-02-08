/**
 * 알림톡 템플릿 표시 이름 및 사용 시점 (5개)
 * 표시 이름은 항상 동일하게, 내부 등록용 이름은 displayName_sanitized + timestamp
 */
export const ALIMTALK_DISPLAY_NAMES = [
  '예약 요청 알림',
  '예약 취소 알림',
  '예약 확정 안내',
  '예약 거절 안내',
  '예약 취소 안내',
] as const;

export type AlimtalkDisplayName = (typeof ALIMTALK_DISPLAY_NAMES)[number];

export const ALIMTALK_USAGE_DESCRIPTIONS: Record<AlimtalkDisplayName, string> = {
  '예약 요청 알림': '예약 요청이 들어왔을 때 관리자에게 발송되는 알림 메시지입니다.',
  '예약 취소 알림': '고객이 예약을 취소했을 때 관리자에게 발송되는 알림 메시지입니다.',
  '예약 확정 안내': '관리자가 예약을 확정했을 때 고객에게 발송되는 안내 메시지입니다.',
  '예약 거절 안내': '관리자가 예약을 거절했을 때 고객에게 발송되는 안내 메시지입니다.',
  '예약 취소 안내': '관리자가 예약을 취소했을 때 고객에게 발송되는 안내 메시지입니다.',
};

/** 템플릿별 사용 가능한 변수 설명 (추후 템플릿별로 다르게 확장 가능) */
export const ALIMTALK_VARIABLE_DESCRIPTIONS: Record<AlimtalkDisplayName, string> = {
  '예약 요청 알림': '#{변수명} 형식. 예: #{reservationId}',
  '예약 취소 알림': '#{변수명} 형식. 예: #{reservationId}, #{roomType}, #{checkIn}, #{checkOut}',
  '예약 확정 안내':
    '#{변수명} 형식. 예: #{roomType}, #{checkIn}, #{checkOut}, #{totalPrice}, #{checkInTime}, #{checkOutTime}',
  '예약 거절 안내':
    '#{변수명} 형식. 예: #{roomType}, #{checkIn}, #{checkOut}, #{checkInTime}, #{checkOutTime}',
  '예약 취소 안내':
    '#{변수명} 형식. 예: #{roomType}, #{checkIn}, #{checkOut}, #{checkInTime}, #{checkOutTime}',
};

/** 표시 이름을 내부 등록용 이름으로 변환 (타임스탬프 추가) */
export function toInternalTemplateName(displayName: string): string {
  const sanitized = displayName.replace(/\s+/g, '');
  return `${sanitized}_${Date.now()}`;
}
