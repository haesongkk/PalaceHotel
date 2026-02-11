import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/** 예약 목록 반환 시 고객 정보를 customerId로 조회해 guestName/guestPhone/userId 보강 */
function expandReservationWithGuest(r: ReturnType<typeof dataStore.getReservations>[0]) {
  const customer = dataStore.getCustomer(r.customerId);
  return {
    ...r,
    guestName: customer?.name ?? '',
    guestPhone: customer?.phone ?? '',
    userId: customer?.userId,
  };
}

export async function GET() {
  const reservations = dataStore.getReservations();
  return NextResponse.json(reservations.map(expandReservationWithGuest));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.roomId || !body?.checkIn || !body?.checkOut) {
      return NextResponse.json({ error: 'roomId, checkIn, checkOut은 필수입니다.' }, { status: 400 });
    }

    const available = dataStore.isRoomAvailable(body.roomId, body.checkIn, body.checkOut);
    if (!available) {
      return NextResponse.json(
        { error: '해당 기간에는 더 이상 예약 가능한 재고가 없습니다.' },
        { status: 400 }
      );
    }

    // customerId가 있으면 사용, 없으면 guestName/guestPhone으로 고객 생성·조회 후 연결
    let customerId = body.customerId as string | undefined;
    if (!customerId) {
      const name = typeof body.guestName === 'string' ? body.guestName.trim() : '관리자 수기 예약';
      const phone = typeof body.guestPhone === 'string' ? body.guestPhone.trim() : '';
      const customer = dataStore.getOrCreateCustomerForManual(name, phone);
      customerId = customer.id;
    }

    const reservation = dataStore.addReservation({
      roomId: body.roomId,
      customerId,
      source: body.source ?? 'manual',
      reservationTypeId: body.reservationTypeId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      status: body.status ?? 'pending',
      totalPrice: body.totalPrice ?? 0,
      adminMemo: body.adminMemo,
    });
    return NextResponse.json(expandReservationWithGuest(reservation), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

