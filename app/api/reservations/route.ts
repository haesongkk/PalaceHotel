import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  const reservations = dataStore.getReservations();
  return NextResponse.json(reservations);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 필수 필드 기본 검증
    if (!body?.roomId || !body?.checkIn || !body?.checkOut) {
      return NextResponse.json({ error: 'roomId, checkIn, checkOut은 필수입니다.' }, { status: 400 });
    }

    // 재고 초과(오버부킹) 방지: 객실 타입별 inventory를 기준으로 체크
    const available = dataStore.isRoomAvailable(body.roomId, body.checkIn, body.checkOut);
    if (!available) {
      return NextResponse.json(
        { error: '해당 기간에는 더 이상 예약 가능한 재고가 없습니다.' },
        { status: 400 }
      );
    }

    const reservation = dataStore.addReservation(body);
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

