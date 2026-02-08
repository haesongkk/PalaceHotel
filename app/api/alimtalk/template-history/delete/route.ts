import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/**
 * POST: 이전 메시지 항목 삭제
 * body: { displayName, tplCode }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, tplCode } = body;
    if (!displayName || !tplCode) {
      return NextResponse.json({ error: 'displayName, tplCode 필수' }, { status: 400 });
    }
    dataStore.deleteTemplateHistoryItem(displayName, tplCode);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
