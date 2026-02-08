import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/**
 * GET: displayName 쿼리로 해당 템플릿의 이전 버전 목록 조회
 */
export async function GET(request: NextRequest) {
  const displayName = request.nextUrl.searchParams.get('displayName');
  if (!displayName) {
    return NextResponse.json({ error: 'displayName 쿼리가 필요합니다.' }, { status: 400 });
  }
  const history = dataStore.getTemplateHistory(displayName);
  const activeTplCode = dataStore.getTemplateActive(displayName);
  return NextResponse.json({ history, activeTplCode });
}

/**
 * POST: 이전 버전 추가 (템플릿 생성/수정 시 내부 호출)
 * body: { displayName, tplCode, content }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, tplCode, content } = body;
    if (!displayName || !tplCode || !content) {
      return NextResponse.json({ error: 'displayName, tplCode, content 필수' }, { status: 400 });
    }
    dataStore.addTemplateHistory(displayName, tplCode, content);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}
