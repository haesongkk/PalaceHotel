import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { Room } from '@/types';

export async function GET() {
  const rooms = await dataStore.getRooms();
  return NextResponse.json(rooms);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const room = await dataStore.addRoom(body);
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

