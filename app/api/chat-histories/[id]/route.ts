import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const history = dataStore.getChatHistory(params.id);
  if (!history) {
    return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
  }
  return NextResponse.json(history);
}

