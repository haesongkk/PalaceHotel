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

function toYmd(dateInput: string | Date): { year: number; month: number; day: number; weekday: number } {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.getDay(); // 0 (일) ~ 6 (토)
  return { year, month, day, weekday };
}

function calcNights(checkIn: string | Date, checkOut: string | Date): number {
  const start = startOfDay(typeof checkIn === 'string' ? new Date(checkIn) : checkIn);
  const end = startOfDay(typeof checkOut === 'string' ? new Date(checkOut) : checkOut);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

const WEEKDAY_LABELS: string[] = ['일', '월', '화', '수', '목', '금', '토'];

function formatMonthDayWithWeekday(dateInput: string | Date): string {
  const { month, day, weekday } = toYmd(dateInput);
  const label = WEEKDAY_LABELS[weekday] ?? '';
  return `${month}. ${day} (${label})`;
}

/**
 * 예약 기간 표시용 공통 포맷
 * - 같은 날짜(대실): "2. 11 (수) · 대실"
 * - 1박: "2. 11 (수) ~ 2. 12 (목) · 1박"
 * - 2박 이상: "2. 3 (월) ~ 2. 5 (수) · 2박"
 */
export function formatStayLabel(checkIn: string | Date, checkOut: string | Date): string {
  const nights = calcNights(checkIn, checkOut);
  const startLabel = formatMonthDayWithWeekday(checkIn);
  const endLabel = formatMonthDayWithWeekday(checkOut);

  if (nights === 0) {
    return `${startLabel} · 대실`;
  }

  if (nights === 1) {
    return `${startLabel} ~ ${endLabel} · 1박`;
  }

  return `${startLabel} ~ ${endLabel} · ${nights}박`;
}

/**
 * 특정 날짜에 머무는 예약 목록 반환 (재고 관리·대시보드 공통)
 * - pending, confirmed 상태만 포함
 * - 해당 날짜가 숙박 기간에 포함되면 포함 (대실 포함)
 */
export function getEffectiveReservationsForDate<T extends Reservation>(
  reservations: T[],
  date: Date
): T[] {
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
