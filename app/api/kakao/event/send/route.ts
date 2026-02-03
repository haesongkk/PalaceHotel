import { NextRequest, NextResponse } from 'next/server';
import { sendKakaoEvent } from '@/lib/kakao-event';
import { setPendingAdminMessage } from '@/lib/store';

/**
 * POST: 카카오 이벤트 API 발송
 * body:
 * - userId 또는 userIds (배열) 중 하나 필수
 * - 채팅 입력(관리자 메시지): text 또는 message 있으면 관리자 메시지 이벤트로 발송
 *   → 기본: eventName: .env KAKAO_ADMIN_MESSAGE_EVENT (기본값 admin_message), eventData: { text }
 *   → 광고성(isAd === true): eventName: .env KAKAO_ADMIN_AD_MESSAGE_EVENT (없으면 KAKAO_ADMIN_MESSAGE_EVENT와 동일)
 * - 그 외: eventName 없으면 .env KAKAO_EVENT_NAME 사용 (테스트용)
 */
export async function POST(request: NextRequest) {
  try {
    const botId = process.env.KAKAO_BOT_ID;
    const restApiKey = process.env.KAKAO_REST_API_KEY;
    const defaultEventName = process.env.KAKAO_EVENT_NAME;
    const adminMessageEventName = process.env.KAKAO_ADMIN_MESSAGE_EVENT || 'admin_message';
    const adminAdMessageEventName =
      process.env.KAKAO_ADMIN_AD_MESSAGE_EVENT || adminMessageEventName;

    if (!botId || !restApiKey) {
      return NextResponse.json(
        { error: '.env에 KAKAO_BOT_ID, KAKAO_REST_API_KEY를 설정하세요.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = body.userId as string | undefined;
    const userIds = body.userIds as string[] | undefined;
    const text = (body.text as string) ?? (body.message as string);
    const isAdminMessage = typeof text === 'string' && text.trim().length > 0;
    const isAd = Boolean(body.isAd);

    const eventName = isAdminMessage
      ? isAd
        ? adminAdMessageEventName
        : adminMessageEventName
      : ((body.eventName as string) || defaultEventName);
    const eventData = isAdminMessage ? { text: text.trim() } : undefined;

    if (!eventName) {
      return NextResponse.json(
        { error: 'eventName이 없습니다. 채팅 입력 시 text를 넣거나, .env에 KAKAO_EVENT_NAME을 설정하세요.' },
        { status: 400 }
      );
    }

    const ids = userIds && userIds.length > 0 ? userIds : userId ? [userId] : null;
    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'userId 또는 userIds(배열)를 넣어주세요.' },
        { status: 400 }
      );
    }

    // 블록이 파라미터 안 넘겨도 스킬에서 꺼내 쓸 수 있도록 미리 저장 (userId 문자열로 통일)
    if (isAdminMessage) {
      const msg = text.trim();
      for (const id of ids) setPendingAdminMessage(String(id), msg);
    }

    const result = await sendKakaoEvent({
      botId,
      restApiKey,
      eventName,
      userIds: ids,
      eventData,
    });

    const status = String(result.status || '').toUpperCase();
    if (status === 'FAIL' || status === 'ERROR') {
      return NextResponse.json(
        { error: result.message || '카카오 이벤트 발송 실패', status: result.status },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[event/send]', error);
    const message = error instanceof Error ? error.message : '이벤트 발송 실패';
    return NextResponse.json(
      { error: message, stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
