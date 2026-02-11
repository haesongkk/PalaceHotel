import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const messages = await dataStore.getChatbotMessages();
  return NextResponse.json(messages);
}
