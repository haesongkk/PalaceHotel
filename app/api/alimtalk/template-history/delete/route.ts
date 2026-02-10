import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { deleteTemplate } from '@/lib/alimtalk';

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
    // 1) 알리고 실제 템플릿 삭제 시도
    try {
      await deleteTemplate(tplCode);
    } catch (e) {
      const message = e instanceof Error ? e.message : '알리고 템플릿 삭제 실패';
      // 원격 삭제가 안 되었으면 로컬 히스토리는 그대로 두고 에러 반환
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // 2) 로컬 히스토리/대표 템플릿 정리
    dataStore.deleteTemplateHistoryItem(displayName, tplCode);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
