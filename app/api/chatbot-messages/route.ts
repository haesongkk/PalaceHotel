import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  const messages = dataStore.getChatbotMessages();
  return NextResponse.json(messages);
}
