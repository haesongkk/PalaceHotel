import { NextRequest, NextResponse } from 'next/server';
import { handleKakaoSkillRequest } from '@/lib/kakao-skill-handler';
import { dataStore } from '@/lib/store';
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

    const userId = body.userRequest.user.id;
    const utterance = body.userRequest.utterance || '';
    const userName = body.userRequest.user.properties?.nickname as string | undefined;

    // 사용자 메시지 저장
    dataStore.addMessageToHistory(userId, {
      sender: 'user',
      userMessage: {
        utterance,
        request: body as unknown as Record<string, unknown>,
      },
      // 하위 호환성을 위한 content
      content: utterance,
    });

    // 봇 응답 생성
    const response = handleKakaoSkillRequest(body);

    // 봇 응답 저장
    dataStore.addMessageToHistory(userId, {
      sender: 'bot',
      botMessage: {
        response: response as {
          version: '2.0';
          template?: {
            outputs: Array<Record<string, unknown>>;
            quickReplies?: Array<Record<string, unknown>>;
          };
          context?: Record<string, unknown>;
          data?: Record<string, unknown>;
        },
      },
      // 하위 호환성을 위한 content (첫 번째 텍스트 메시지 추출)
      content: extractTextFromResponse(response),
    });

    return NextResponse.json(response);
  } catch (e) {
    console.error('[Kakao Skill]', e);
    return NextResponse.json(
      { error: 'Skill server error' },
      { status: 500 }
    );
  }
}

// 응답에서 텍스트를 추출하는 헬퍼 함수 (하위 호환성용)
function extractTextFromResponse(response: {
  template?: {
    outputs?: Array<Record<string, unknown>>;
  };
}): string {
  if (!response.template?.outputs) {
    return '';
  }

  for (const output of response.template.outputs) {
    if (output.simpleText && typeof output.simpleText === 'object') {
      const text = (output.simpleText as { text?: string }).text;
      if (text) return text;
    }
    if (output.textCard && typeof output.textCard === 'object') {
      const card = output.textCard as { title?: string; description?: string };
      if (card.title) return card.title;
      if (card.description) return card.description;
    }
  }

  return '메시지';
}
