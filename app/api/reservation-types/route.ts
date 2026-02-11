import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  const types = await dataStore.getReservationTypes();
  return NextResponse.json(types);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name ?? '').trim();
    const color = (body.color ?? '').trim();

    if (!name || !color) {
      return NextResponse.json(
        { error: '이름과 색상은 필수입니다.' },
        { status: 400 }
      );
    }

    const type = await dataStore.addReservationType({ name, color });
    return NextResponse.json(type, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

