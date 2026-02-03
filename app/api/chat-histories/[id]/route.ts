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

/** 유저 이름, 전화번호, 메모 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const history = dataStore.getChatHistory(params.id);
  if (!history) {
    return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
  }
  const body = await request.json();
  const updates: { userName?: string; userPhone?: string; memo?: string } = {};
  if (typeof body.userName === 'string') updates.userName = body.userName;
  if (typeof body.userPhone === 'string') updates.userPhone = body.userPhone;
  if (typeof body.memo === 'string') updates.memo = body.memo;
  const updated = dataStore.updateChatHistory(params.id, updates);
  return NextResponse.json(updated);
}

