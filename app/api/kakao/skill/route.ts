import { NextRequest, NextResponse } from 'next/server';
import { handleKakaoSkillRequest } from '@/lib/kakao-skill-handler';
import type { KakaoSkillRequest } from '@/types/kakao';

/**
 * 카카오톡 챗봇 스킬서버 API
 * POST /api/kakao/skill
 *
 * 챗봇 관리자센터 스킬 등록 시 URL에 이 경로를 사용하세요.
 * 예: https://your-domain.com/api/kakao/skill
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KakaoSkillRequest;

    if (!body?.userRequest || !body?.action) {
      return NextResponse.json(
        { error: 'Invalid skill payload: userRequest, action required' },
        { status: 400 }
      );
    }

    const response = handleKakaoSkillRequest(body);
    return NextResponse.json(response);
  } catch (e) {
    console.error('[Kakao Skill]', e);
    return NextResponse.json(
      { error: 'Skill server error' },
      { status: 500 }
    );
  }
}
