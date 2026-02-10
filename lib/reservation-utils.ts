import type { Reservation, ReservationStatus } from '@/types';

export const EFFECTIVE_STATUSES: ReservationStatus[] = ['pending', 'confirmed'];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseISODate(dateString: string): Date {
  return startOfDay(new Date(dateString));
}

export function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 특정 날짜에 머무는 예약 목록 반환 (재고 관리·대시보드 공통)
 * - pending, confirmed 상태만 포함
 * - 해당 날짜가 숙박 기간에 포함되면 포함 (대실 포함)
 */
export function getEffectiveReservationsForDate(
  reservations: Reservation[],
  date: Date
): Reservation[] {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return reservations.filter((r) => {
    if (!EFFECTIVE_STATUSES.includes(r.status)) return false;
    const resStart = parseISODate(r.checkIn);
    const resEndRaw = parseISODate(r.checkOut);
    const resEnd = new Date(resEndRaw);
    // 대실(당일 이용): 체크인/체크아웃 날짜가 같으면 해당 날짜 하루만 점유
    if (resEnd.getTime() === resStart.getTime()) {
      resEnd.setDate(resEnd.getDate() + 1);
    }
    return resStart < dayEnd && resEnd > dayStart;
  });
}
