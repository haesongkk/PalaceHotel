import { NextRequest, NextResponse } from 'next/server';
import { requestTemplateApproval } from '@/lib/alimtalk';

type Params = { params: { tpl_code: string } };

/**
 * POST: 템플릿 검수 요청 (승인 신청, 카카오 검수 4~5일 소요)
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const tpl_code = decodeURIComponent(params.tpl_code);
  try {
    await requestTemplateApproval(tpl_code);
    return NextResponse.json({ success: true, message: '검수 요청이 완료되었습니다. 카카오 검수는 4~5일 소요됩니다.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '검수 요청 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
