import { NextRequest, NextResponse } from 'next/server';
import { modifyTemplate, deleteTemplate } from '@/lib/alimtalk';

type Params = { params: { tpl_code: string } };

/**
 * PUT: 템플릿 수정 (상태 R, inspStatus REG 또는 REJ일 때만)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const tpl_code = decodeURIComponent(params.tpl_code);
  try {
    const body = await request.json();
    const { tpl_name, tpl_content, tpl_button, tpl_title, tpl_stitle } = body;
    if (!tpl_name || !tpl_content) {
      return NextResponse.json(
        { error: 'tpl_name, tpl_content는 필수입니다.' },
        { status: 400 }
      );
    }
    await modifyTemplate({
      tpl_code,
      tpl_name,
      tpl_content,
      tpl_button,
      tpl_title,
      tpl_stitle,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 수정 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: 템플릿 삭제 (승인 전 템플릿만)
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const tpl_code = decodeURIComponent(params.tpl_code);
  try {
    await deleteTemplate(tpl_code);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 삭제 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
