import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (userId) {
    const history = dataStore.getChatHistoryByUserId(userId);
    if (!history) {
      return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
    }
    return NextResponse.json(history);
  }
  const histories = dataStore.getChatHistories();
  return NextResponse.json(histories);
}

