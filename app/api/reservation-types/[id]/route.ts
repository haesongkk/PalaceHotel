import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (params.id === 'default') {
      return NextResponse.json(
        { error: '기본 예약 타입은 수정할 수 없습니다.' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const updates: { name?: string; color?: string } = {};
    if (typeof body.name === 'string') {
      updates.name = body.name.trim();
    }
    if (typeof body.color === 'string') {
      updates.color = body.color.trim();
    }

    const updated = await dataStore.updateReservationType(params.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Reservation type not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (params.id === 'default') {
    return NextResponse.json(
      { error: '기본 예약 타입은 삭제할 수 없습니다.' },
      { status: 400 }
    );
  }
  const success = await dataStore.deleteReservationType(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Reservation type not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

