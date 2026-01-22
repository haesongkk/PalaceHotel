import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  const reservations = dataStore.getReservations();
  return NextResponse.json(reservations);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reservation = dataStore.addReservation(body);
    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

