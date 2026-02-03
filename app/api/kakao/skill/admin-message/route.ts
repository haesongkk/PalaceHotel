import { NextRequest, NextResponse } from 'next/server';
import { dataStore, getAndClearPendingAdminMessage } from '@/lib/store';
import type { ChatMessage } from '@/types';
import type { KakaoSkillRequest, KakaoSkillResponse } from '@/types/kakao';

/** action.params.text / clientExtra.text 또는 store에 저장된 관리자 메시지 */
function getAdminMessageText(body: KakaoSkillRequest, userId: string): string | null {
  const params = body.action?.params ?? {};
  const extra = (body.action?.clientExtra ?? {}) as Record<string, unknown>;
  const fromParams = typeof params?.text === 'string' ? params.text : null;
  const fromExtra = typeof extra?.text === 'string' ? extra.text : null;
  if (fromParams?.trim()) return fromParams.trim();
  if (fromExtra?.trim()) return fromExtra.trim();
  return getAndClearPendingAdminMessage(String(userId));
}

type BotResponse = NonNullable<NonNullable<ChatMessage['botMessage']>['response']>;

/**
 * 관리자 채팅 입력 전용 스킬
 * POST /api/kakao/skill/admin-message
 *
 * 이벤트 블록에서 이 URL만 호출하면 됨. 파라미터 안 넘겨도 됨.
 * (채팅 전송 시 event/send에서 미리 store에 저장해 두고, 여기서 꺼내 씀)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KakaoSkillRequest;

    if (!body?.userRequest?.user?.id || !body?.action) {
      return NextResponse.json(
        { error: 'userRequest.user.id, action 필요' },
        { status: 400 }
      );
    }

    const userId = body.userRequest.user.id;
    const userIdStr = String(userId);
    const text = getAdminMessageText(body, userIdStr);

    if (!text?.trim()) {
      console.warn('[admin-message] 400: text 없음. userId:', userIdStr, 'params:', body.action?.params, 'clientExtra:', body.action?.clientExtra);
      return NextResponse.json(
        { error: '전달된 메시지가 없습니다. (블록에서 파라미터 "text"로 넘기거나, 관리자 페이지에서 채팅 전송 후 곧바로 호출해 주세요.)' },
        { status: 400 }
      );
    }

    const messageText = text.trim();

    const response: KakaoSkillResponse = {
      version: '2.0',
      template: {
        outputs: [{ simpleText: { text: messageText } }],
      },
    };

    const storedResponse: BotResponse = {
      ...response,
      template: response.template
        ? {
            ...response.template,
            outputs: response.template.outputs as unknown as Array<Record<string, unknown>>,
            quickReplies: undefined,
          }
        : undefined,
    };
    dataStore.addMessageToHistory(userId, {
      sender: 'bot',
      botMessage: { response: storedResponse },
      content: messageText,
    });

    return NextResponse.json(response);
  } catch (e) {
    console.error('[Kakao Skill admin-message]', e);
    return NextResponse.json(
      { error: 'Skill server error' },
      { status: 500 }
    );
  }
}
