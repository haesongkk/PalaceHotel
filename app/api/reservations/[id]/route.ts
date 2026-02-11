import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { sendReservationStatusAlimtalk, sendReservationCancelledByAdminAlimtalk } from '@/lib/alimtalk';
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

  const customer = dataStore.getCustomer(reservation.customerId);
  const expanded = {
    ...reservation,
    guestName: customer?.name ?? '',
    guestPhone: customer?.phone ?? '',
    userId: customer?.userId,
  };

  console.log('[API] 예약 조회 성공:', { id: reservation.id, guestName: expanded.guestName, status: reservation.status });
  return NextResponse.json(expanded);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const statusChangeMemo =
      typeof body.statusChangeMemo === 'string' ? body.statusChangeMemo.trim() : undefined;

    // 기존 예약 정보 가져오기 (상태 변경 확인용)
    const existingReservation = dataStore.getReservation(params.id);
    if (!existingReservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const oldStatus = existingReservation.status;
    const newStatus = body.status as ReservationStatus | undefined;

    // 예약 정보 업데이트 (허용된 필드만 반영)
    const updatePayload: Partial<typeof existingReservation> = {};
    if (newStatus) {
      updatePayload.status = newStatus;
    }
    if (typeof body.guestCancellationConfirmed === 'boolean') {
      updatePayload.guestCancellationConfirmed = body.guestCancellationConfirmed;
    }
    if (body.adminMemo !== undefined) {
      updatePayload.adminMemo =
        typeof body.adminMemo === 'string' && body.adminMemo.trim() !== ''
          ? body.adminMemo.trim()
          : undefined;
    }

    const reservation = dataStore.updateReservation(params.id, updatePayload);
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const room = dataStore.getRoom(reservation.roomId);
    const roomType = room?.type ?? '객실';
    const isDayUse =
      new Date(reservation.checkIn).toDateString() === new Date(reservation.checkOut).toDateString();
    const checkInTime = room ? (isDayUse ? room.dayUseCheckIn : room.stayCheckIn) : undefined;
    const checkOutTime = room ? (isDayUse ? room.dayUseCheckOut : room.stayCheckOut) : undefined;

    const guestPhone = dataStore.getCustomer(reservation.customerId)?.phone;
    if (
      newStatus &&
      oldStatus === 'pending' &&
      (newStatus === 'confirmed' || newStatus === 'rejected')
    ) {
      if (guestPhone) {
        sendReservationStatusAlimtalk(
          guestPhone,
          newStatus,
          {
            roomType,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            totalPrice: newStatus === 'confirmed' ? reservation.totalPrice : undefined,
            checkInTime,
            checkOutTime,
            memo: newStatus === 'rejected' ? statusChangeMemo : undefined,
          }
        ).catch((error) => {
          console.error(`[알림톡 발송 실패] 예약 ${reservation.id} ${newStatus}`, error);
        });
      }
    }

    if (newStatus === 'cancelled_by_admin' && guestPhone) {
      sendReservationCancelledByAdminAlimtalk(guestPhone, {
        roomType,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        checkInTime,
        checkOutTime,
        memo: statusChangeMemo,
      }).catch((error) => {
        console.error(`[알림톡 발송 실패] 예약 ${reservation.id} 취소 안내`, error);
      });
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

