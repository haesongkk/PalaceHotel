import { NextRequest, NextResponse } from 'next/server';
import { handleKakaoSkillRequest } from '@/lib/kakao-skill-handler';
import { dataStore } from '@/lib/store';
import type { ChatMessage } from '@/types';
import type { KakaoSkillRequest, KakaoSkillResponse } from '@/types/kakao';

type BotResponse = NonNullable<NonNullable<ChatMessage['botMessage']>['response']>;

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

    // 봇 응답 저장 (store는 outputs를 Record[]로 기대함)
    const storedResponse: BotResponse = {
      ...response,
      template: response.template
        ? {
            ...response.template,
            outputs: response.template.outputs as unknown as Array<Record<string, unknown>>,
            quickReplies: response.template.quickReplies as unknown as Array<Record<string, unknown>> | undefined,
          }
        : undefined,
    };
    dataStore.addMessageToHistory(userId, {
      sender: 'bot',
      botMessage: { response: storedResponse },
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
function extractTextFromResponse(response: KakaoSkillResponse): string {
  if (!response.template?.outputs) {
    return '';
  }

  for (const output of response.template.outputs) {
    if ('simpleText' in output && output.simpleText && typeof output.simpleText === 'object') {
      const text = (output.simpleText as { text?: string }).text;
      if (text) return text;
    }
    if ('textCard' in output && output.textCard && typeof output.textCard === 'object') {
      const card = output.textCard as { title?: string; description?: string };
      if (card.title) return card.title;
      if (card.description) return card.description;
    }
  }

  return '메시지';
}
