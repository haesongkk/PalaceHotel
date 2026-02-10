import type { Reservation, Room } from '@/types';
import { EFFECTIVE_STATUSES, parseISODate, startOfDay, toDateKey } from '@/lib/reservation-utils';

/** YYYY-MM-DD 문자열을 Date로 변환 (시각은 00:00:00로 정규화) */
export function parseDateKey(dateKey: string): Date {
  return startOfDay(new Date(dateKey));
}

/** 특정 객실/날짜 기준 판매 객실 수 (pending/confirmed만 포함) */
export function getDailyRoomSoldCount(
  reservations: Reservation[],
  roomId: string,
  dateKey: string,
): number {
  const dayStart = parseDateKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return reservations.filter((r) => {
    if (r.roomId !== roomId) return false;
    if (!EFFECTIVE_STATUSES.includes(r.status)) return false;

    const resStart = parseISODate(r.checkIn);
    const resEndRaw = parseISODate(r.checkOut);
    const resEnd = new Date(resEndRaw);

    // 대실(당일 이용): 체크인/체크아웃 날짜가 같으면 해당 날짜 하루만 점유
    if (resEnd.getTime() === resStart.getTime()) {
      resEnd.setDate(resEnd.getDate() + 1);
    }

    return resStart < dayEnd && resEnd > dayStart;
  }).length;
}

/** 기본 재고 + 조정치(delta)를 더한 재고 */
export function getDailyRoomAdjustedInventory(room: Room, delta: number): number {
  const baseInventory = room.inventory ?? 0;
  return baseInventory + delta;
}

/** 잔여 = 조정 재고 - 판매 수량 (최소 0) */
export function getDailyRoomRemaining(adjustedInventory: number, soldCount: number): number {
  const remaining = adjustedInventory - soldCount;
  return remaining > 0 ? remaining : 0;
}

/** Reservation 배열에서 주어진 날짜키(YYYY-MM-DD)에 머무는 예약만 필터링 */
export function filterReservationsForDate(
  reservations: Reservation[],
  dateKey: string,
): Reservation[] {
  const date = parseDateKey(dateKey);
  return reservations.filter((r) => {
    if (!EFFECTIVE_STATUSES.includes(r.status)) return false;
    const checkIn = parseISODate(r.checkIn);
    const checkOut = parseISODate(r.checkOut);

    const start = startOfDay(checkIn);
    const end = startOfDay(checkOut);

    // 대실: 같은 날짜면 하루 점유로 처리
    if (toDateKey(start) === toDateKey(end)) {
      end.setDate(end.getDate() + 1);
    }

    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return start < dayEnd && end > dayStart;
  });
}

