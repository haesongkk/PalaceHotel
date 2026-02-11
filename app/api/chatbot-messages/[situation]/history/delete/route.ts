import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { ChatbotSituation } from '@/types';

/**
 * POST: 챗봇 멘트 이전 버전 삭제
 * body: { index: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { situation: string } }
) {
  try {
    const body = await request.json();
    const index = body.index;
    if (typeof index !== 'number' || index < 0) {
      return NextResponse.json({ error: 'index 필수 (number)' }, { status: 400 });
    }
    const situation = params.situation as ChatbotSituation;
    await dataStore.deleteChatbotMessageHistoryItem(situation, index);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
