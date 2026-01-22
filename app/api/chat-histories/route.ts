import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  const histories = dataStore.getChatHistories();
  return NextResponse.json(histories);
}

