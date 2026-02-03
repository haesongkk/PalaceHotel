import { NextRequest, NextResponse } from 'next/server';
import { getTemplateContent, sendAlimtalk } from '@/lib/alimtalk';
import { dataStore } from '@/lib/store';

/**
 * POST: 알림톡 1건 발송 (빠른 입력용)
 * body: { tpl_code: string, receiver: string, subject?: string, params?: Record<string, string>, recvname?: string, userId?: string }
 * - tpl_code, receiver 필수
 * - message 없으면 템플릿 본문 조회 후 params로 #{변수명} 치환
 * - subject 없으면 템플릿명 또는 '알림' 사용
 * - userId 있으면 발송 성공 시 해당 사용자 대화 내역에 알림톡 내용 저장
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tplCode = body.tpl_code as string | undefined;
    const receiver = body.receiver as string | undefined;
    const subject = body.subject as string | undefined;
    const message = body.message as string | undefined;
    const params = (body.params as Record<string, string>) ?? {};
    const recvname = body.recvname as string | undefined;
    const userId = body.userId as string | undefined;

    if (!tplCode || !receiver) {
      return NextResponse.json(
        { error: 'tpl_code, receiver는 필수입니다.' },
        { status: 400 }
      );
    }

    let finalMessage = message;
    if (finalMessage == null || finalMessage === '') {
      const content = await getTemplateContent(tplCode);
      if (!content) {
        return NextResponse.json(
          { error: '템플릿 본문을 가져올 수 없습니다.' },
          { status: 400 }
        );
      }
      finalMessage = content;
      for (const [key, value] of Object.entries(params)) {
        finalMessage = finalMessage.replace(new RegExp(`#\\{${key}\\}`, 'g'), String(value ?? ''));
      }
    }

    const result = await sendAlimtalk({
      tpl_code: tplCode,
      receiver,
      subject: subject ?? '알림',
      message: finalMessage,
      recvname,
    });

    // 발송 성공 시 userId가 있으면 해당 사용자 대화 내역에 알림톡 내용 저장
    if (result.code === 0 && userId?.trim()) {
      dataStore.addMessageToHistory(String(userId).trim(), {
        sender: 'bot',
        botMessage: {
          response: {
            version: '2.0',
            template: {
              outputs: [{ simpleText: { text: finalMessage } }],
            },
          },
        },
        content: finalMessage,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알림톡 발송 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
