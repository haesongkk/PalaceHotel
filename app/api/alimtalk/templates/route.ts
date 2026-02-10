import { NextRequest, NextResponse } from 'next/server';
import { getTemplateList, createTemplate, requestTemplateApproval } from '@/lib/alimtalk';
import { dataStore } from '@/lib/store';
import { toInternalTemplateName } from '@/lib/alimtalk-config';

/**
 * GET: 알림톡 템플릿 목록 조회
 */
export async function GET() {
  try {
    const list = await getTemplateList();
    return NextResponse.json(list);
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 목록 조회 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: 신규 템플릿 생성
 * body: { displayName, tpl_content } 또는 legacy { tpl_name, tpl_content, ... }
 * displayName 있으면 내부 등록용 이름 = displayName_sanitized + timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const displayName = body.displayName as string | undefined;
    const tpl_content = body.tpl_content;
    const tpl_name = body.tpl_name ?? (displayName ? toInternalTemplateName(displayName) : undefined);
    const { tpl_type, tpl_emtype, tpl_title, tpl_stitle, tpl_button } = body;

    if (!tpl_name || !tpl_content) {
      return NextResponse.json(
        { error: 'displayName(또는 tpl_name), tpl_content는 필수입니다.' },
        { status: 400 }
      );
    }
    const data = await createTemplate({
      tpl_name,
      tpl_content,
      tpl_type,
      tpl_emtype,
      tpl_title,
      tpl_stitle,
      tpl_button,
    });

    // 신규 템플릿 생성 후 바로 검수 요청까지 자동 처리
    try {
      await requestTemplateApproval(data.templtCode);
    } catch (e) {
      const message = e instanceof Error ? e.message : '검수 요청 실패';
      return NextResponse.json({ error: `검수 요청 실패: ${message}` }, { status: 500 });
    }

    if (displayName) {
      dataStore.addTemplateHistory(displayName, data.templtCode, data.templtContent);
      dataStore.setTemplateActive(displayName, data.templtCode);
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 생성 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
