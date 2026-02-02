import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { sendReservationStatusAlimtalk } from '@/lib/alimtalk';
import type { ReservationStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservationId = params.id;
  console.log('[API] 예약 조회 요청:', reservationId);
  
  const reservation = dataStore.getReservation(reservationId);
  if (!reservation) {
    console.log('[API] 예약을 찾을 수 없음:', reservationId);
    const allReservations = dataStore.getReservations();
    console.log('[API] 현재 저장된 예약 ID 목록:', allReservations.map(r => r.id));
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }
  
  console.log('[API] 예약 조회 성공:', {
    id: reservation.id,
    guestName: reservation.guestName,
    status: reservation.status,
  });
  
  return NextResponse.json(reservation);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // 기존 예약 정보 가져오기 (상태 변경 확인용)
    const existingReservation = dataStore.getReservation(params.id);
    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const oldStatus = existingReservation.status;
    const newStatus = body.status as ReservationStatus;

    // 예약 정보 업데이트
    const reservation = dataStore.updateReservation(params.id, body);
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // 상태가 pending에서 confirmed 또는 rejected로 변경된 경우에만 고객에게 알림톡 발송
    if (
      oldStatus === 'pending' &&
      (newStatus === 'confirmed' || newStatus === 'rejected')
    ) {
      const room = dataStore.getRoom(reservation.roomId);
      const roomType = room?.type ?? '객실';

      if (reservation.guestPhone) {
        sendReservationStatusAlimtalk(
          reservation.guestPhone,
          newStatus,
          {
            roomType,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            totalPrice: newStatus === 'confirmed' ? reservation.totalPrice : undefined,
          }
        ).catch((error) => {
          console.error(`[알림톡 발송 실패] 예약 ${reservation.id} ${newStatus}`, error);
          // 알림톡 실패해도 예약 상태는 정상 업데이트됨
        });
      }
    }

    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const success = dataStore.deleteReservation(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

