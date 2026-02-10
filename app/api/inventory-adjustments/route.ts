import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { getDailyRoomSoldCount } from '@/lib/inventory-utils';
import type { Room } from '@/types';

function toBadRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (start && end) {
    const items = dataStore.getRoomInventoryAdjustmentsInRange(start, end);
    return NextResponse.json({ items });
  }

  if (date) {
    const items = dataStore.getRoomInventoryAdjustmentsForDate(date);
    return NextResponse.json({ items });
  }

  return toBadRequest('date 또는 start/end 파라미터가 필요합니다. (YYYY-MM-DD)');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    roomId?: string;
    date?: string;
    delta?: number;
  } | null;

  if (!body) {
    return toBadRequest('유효한 JSON 본문이 필요합니다.');
  }

  const { roomId, date, delta } = body;

  if (!roomId || !date || typeof delta !== 'number' || Number.isNaN(delta)) {
    return toBadRequest('roomId, date, delta(number) 값이 모두 필요합니다.');
  }

  const room = dataStore.getRoom(roomId) as Room | undefined;
  if (!room) {
    return toBadRequest('존재하지 않는 객실입니다.');
  }

  const reservations = dataStore.getReservations();
  const soldCount = getDailyRoomSoldCount(reservations, roomId, date);
  const adjustedInventory = (room.inventory ?? 0) + delta;

  if (adjustedInventory < soldCount) {
    return toBadRequest('이미 판매된 수량보다 적게 설정할 수 없습니다.');
  }

  const saved = dataStore.setRoomInventoryAdjustment(roomId, date, delta);

  return NextResponse.json({
    roomId: saved.roomId,
    date: saved.date,
    delta: saved.delta,
    adjustedInventory,
    soldCount,
  });
}

