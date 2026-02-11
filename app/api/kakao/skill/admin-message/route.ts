import { NextRequest, NextResponse } from 'next/server';
import { dataStore, getAndClearPendingAdminMessage } from '@/lib/store';
import type { ChatMessage } from '@/types';
import type { KakaoSkillRequest, KakaoSkillResponse } from '@/types/kakao';

/**
 * 관리자 메시지 텍스트 추출 (우선순위)
 * 1. action.params.text (블록에서 스킬 파라미터로 넘긴 경우)
 * 2. action.clientExtra.text
 * 3. event.data.text (이벤트 API로 발송 시 카카오가 스킬 요청에 넣어주는 경우)
 * 4. store (인메모리 - 서버가 여러 인스턴스면 다른 인스턴스에서는 없을 수 있음)
 *
 * 권장: 블록에서 이벤트 데이터를 스킬 파라미터 "text"로 매핑해 두면
 * 인스턴스가 달라도 항상 동작합니다.
 */
function getAdminMessageText(body: KakaoSkillRequest & { event?: { data?: { text?: string } } }, userId: string): string | null {
  const params = body.action?.params ?? {};
  const extra = (body.action?.clientExtra ?? {}) as Record<string, unknown>;
  const eventData = body.event?.data as { text?: string } | undefined;
  const fromParams = typeof params?.text === 'string' ? params.text : null;
  const fromExtra = typeof extra?.text === 'string' ? extra.text : null;
  const fromEventData = typeof eventData?.text === 'string' ? eventData.text : null;
  if (fromParams?.trim()) return fromParams.trim();
  if (fromExtra?.trim()) return fromExtra.trim();
  if (fromEventData?.trim()) return fromEventData.trim();
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
    const raw = await request.json().catch(() => null);
    const body = raw && typeof raw === 'object' ? (raw as KakaoSkillRequest) : null;
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
      return NextResponse.json(
        { error: '전달된 메시지가 없습니다. 이벤트 블록에서 스킬 파라미터 "text"에 event.data.text를 매핑해 두면 인스턴스가 달라도 동작합니다. (또는 관리자 페이지에서 채팅 전송 직후에만 호출되는 경우 store 사용)' },
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
    await dataStore.addMessageToHistory(userId, {
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
