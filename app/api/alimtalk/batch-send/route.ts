import { NextRequest, NextResponse } from 'next/server';
import { getTemplateContent, sendAlimtalk } from '@/lib/alimtalk';
import { dataStore } from '@/lib/store';

interface BatchReceiver {
  phone: string;
  userId?: string;
  recvname?: string;
}

/**
 * POST: 알림톡 다건 발송 (동일 템플릿/본문 기준)
 *
 * body: {
 *   tpl_code: string;
 *   subject?: string;
 *   params?: Record<string, string>;
 *   message?: string; // 선택. 없으면 템플릿 본문 + params로 치환
 *   receivers: Array<{ phone: string; userId?: string; recvname?: string }>;
 * }
 *
 * - tpl_code, receivers 필수
 * - 서버에서 내부적으로 순차 발송하며, 성공/실패 건수 요약만 반환
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tplCode = body.tpl_code as string | undefined;
    const subject = (body.subject as string | undefined) ?? '알림';
    const params = (body.params as Record<string, string>) ?? {};
    const receivers = (body.receivers as BatchReceiver[] | undefined) ?? [];
    let finalMessage = body.message as string | undefined;

    if (!tplCode || !Array.isArray(receivers) || receivers.length === 0) {
      return NextResponse.json(
        { error: 'tpl_code와 receivers(배열)는 필수입니다.' },
        { status: 400 }
      );
    }

    if (!finalMessage || finalMessage.trim() === '') {
      const content = await getTemplateContent(tplCode);
      if (!content) {
        return NextResponse.json(
          { error: '템플릿 본문을 가져올 수 없습니다.' },
          { status: 400 }
        );
      }
      finalMessage = content;
      for (const [key, value] of Object.entries(params)) {
        finalMessage = finalMessage.replace(
          new RegExp(`#\\{${key}\\}`, 'g'),
          String(value ?? '')
        );
      }
    }

    let successCount = 0;
    let failCount = 0;

    for (const r of receivers) {
      const phone = typeof r.phone === 'string' ? r.phone.trim() : '';
      if (!phone) {
        failCount += 1;
        continue;
      }

      try {
        const result = await sendAlimtalk({
          tpl_code: tplCode,
          receiver: phone,
          subject,
          message: finalMessage,
          recvname: r.recvname,
        });

        if (result.code === 0) {
          successCount += 1;

          if (r.userId?.trim()) {
            const userId = String(r.userId).trim();
            dataStore.addMessageToHistory(userId, {
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
        } else {
          failCount += 1;
        }
      } catch {
        failCount += 1;
      }
    }

    const total = successCount + failCount;
    const allFailed = total > 0 && successCount === 0;
    const code = allFailed ? -1 : 0;

    const message = allFailed
      ? '모든 대상에 대한 알림톡 발송에 실패했습니다.'
      : failCount > 0
      ? `일부 대상 발송 실패 (성공 ${successCount}명, 실패 ${failCount}명)`
      : `모든 대상(${successCount}명)에게 알림톡 발송 성공`;

    return NextResponse.json({
      code,
      message,
      successCount,
      failCount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알림톡 다건 발송 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

