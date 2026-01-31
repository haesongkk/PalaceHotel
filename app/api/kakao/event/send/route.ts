import { NextRequest, NextResponse } from 'next/server';
import { sendKakaoEvent } from '@/lib/kakao-event';

/**
 * POST: 카카오 이벤트 API 발송 (테스트용)
 * body: { userId?: string, userIds?: string[], eventName?: string }
 * - userId 또는 userIds (배열) 중 하나 필수
 * - eventName 없으면 .env KAKAO_EVENT_NAME 사용
 */
export async function POST(request: NextRequest) {
  try {
    const botId = process.env.KAKAO_BOT_ID;
    const restApiKey = process.env.KAKAO_REST_API_KEY;
    const defaultEventName = process.env.KAKAO_EVENT_NAME;

    if (!botId || !restApiKey) {
      return NextResponse.json(
        { error: '.env에 KAKAO_BOT_ID, KAKAO_REST_API_KEY를 설정하세요.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = body.userId as string | undefined;
    const userIds = body.userIds as string[] | undefined;
    const eventName = (body.eventName as string) || defaultEventName;

    if (!eventName) {
      return NextResponse.json(
        { error: 'eventName이 없습니다. 요청 body에 eventName을 넣거나 .env에 KAKAO_EVENT_NAME을 설정하세요.' },
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

    const result = await sendKakaoEvent({
      botId,
      restApiKey,
      eventName,
      userIds: ids,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '이벤트 발송 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
