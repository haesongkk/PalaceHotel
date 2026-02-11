import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { sendReservationStatusAlimtalk, sendReservationCancelledByAdminAlimtalk } from '@/lib/alimtalk';
import type { ReservationStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reservation = await dataStore.getReservation(params.id);
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  const customer = await dataStore.getCustomer(reservation.customerId);
  const expanded = {
    ...reservation,
    guestName: customer?.name ?? '',
    guestPhone: customer?.phone ?? '',
    userId: customer?.userId,
  };

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
    const existingReservation = await dataStore.getReservation(params.id);
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

    const reservation = await dataStore.updateReservation(params.id, updatePayload);
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const room = await dataStore.getRoom(reservation.roomId);
    const roomType = room?.type ?? '객실';
    const isDayUse =
      new Date(reservation.checkIn).toDateString() === new Date(reservation.checkOut).toDateString();
    const checkInTime = room ? (isDayUse ? room.dayUseCheckIn : room.stayCheckIn) : undefined;
    const checkOutTime = room ? (isDayUse ? room.dayUseCheckOut : room.stayCheckOut) : undefined;

    const customer = await dataStore.getCustomer(reservation.customerId);
    const guestPhone = customer?.phone;
    const userIdForChat = customer?.userId;
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
          },
          { userIdForChat }
        ).catch((error) => {
          console.error(`[알림톡 발송 실패] 예약 ${reservation.id} ${newStatus}`, error);
        });
      }
    }

    if (newStatus === 'cancelled_by_admin' && guestPhone) {
      sendReservationCancelledByAdminAlimtalk(
        guestPhone,
        {
          roomType,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          checkInTime,
          checkOutTime,
          memo: statusChangeMemo,
        },
        { userIdForChat }
      ).catch((error) => {
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
  const success = await dataStore.deleteReservation(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

