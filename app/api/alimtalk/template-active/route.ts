import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/**
 * PUT: 활성 템플릿 설정 (이전 메시지에서 "이걸로 사용" 선택 시)
 * body: { displayName, tplCode }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, tplCode } = body;
    if (!displayName || !tplCode) {
      return NextResponse.json({ error: 'displayName, tplCode 필수' }, { status: 400 });
    }
    dataStore.setTemplateActive(displayName, tplCode);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '설정 실패' }, { status: 500 });
  }
}
