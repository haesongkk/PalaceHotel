import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { sendReservationStatusSMS } from '@/lib/aligo';
import type { ReservationStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservation = dataStore.getReservation(params.id);
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }
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

    // 상태가 pending에서 confirmed 또는 rejected로 변경된 경우에만 SMS 발송
    if (oldStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'rejected')) {
      // 객실 정보 가져오기
      const room = dataStore.getRoom(reservation.roomId);
      const roomType = room?.type ?? '객실';

      // 상황에 맞는 메시지 템플릿 가져오기
      const situation = newStatus === 'confirmed' ? 'reservation_confirmed' : 'reservation_rejected';
      const messageTemplate = dataStore.getChatbotMessage(situation)?.message;

      if (messageTemplate && reservation.guestPhone) {
        // SMS 발송 (비동기, 에러는 조용히 처리)
        sendReservationStatusSMS(
          reservation.guestPhone,
          messageTemplate,
          {
            roomType,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            totalPrice: newStatus === 'confirmed' ? reservation.totalPrice : undefined,
          }
        ).catch((error) => {
          console.error(`[SMS 발송 실패] 예약 ${reservation.id} ${newStatus}`, error);
          // SMS 실패해도 예약 상태는 정상 업데이트됨
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

