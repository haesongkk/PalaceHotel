import { NextRequest, NextResponse } from 'next/server';
import { handleReservationHistorySkill } from '@/lib/kakao-skill-handler';
import { dataStore } from '@/lib/store';
import type { ChatMessage } from '@/types';
import type { KakaoSkillRequest, KakaoSkillResponse } from '@/types/kakao';

type BotResponse = NonNullable<NonNullable<ChatMessage['botMessage']>['response']>;

/**
 * 카카오톡 챗봇 예약내역 전용 스킬서버 API
 * POST /api/kakao/skill/reservation-history
 *
 * 챗봇 관리자센터에서 예약내역 전용 스킬을 만들 경우 이 경로를 사용할 수 있습니다.
 * 예: https://your-domain.com/api/kakao/skill/reservation-history
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

    // 봇 응답 생성 (예약내역 전용 핸들러)
    const response = handleReservationHistorySkill(body);

    // 이미지 전송 확인을 위한 로깅
    if (response.template?.outputs) {
      for (const output of response.template.outputs) {
        if ('carousel' in output && output.carousel) {
          const carousel = output.carousel;
          if (carousel.type === 'commerceCard' && carousel.items) {
            carousel.items.forEach((item, idx) => {
              if ('thumbnails' in item && item.thumbnails) {
                item.thumbnails.forEach((thumb, thumbIdx) => {
                  console.log(`[이미지 전송 확인][예약내역] 카루셀 아이템 ${idx}, 썸네일 ${thumbIdx}:`, {
                    imageUrl: thumb.imageUrl,
                    altText: thumb.altText,
                    hasImage: !!thumb.imageUrl,
                  });
                });
              }
            });
          }
        }
        if ('listCard' in output && output.listCard) {
          const listCard = output.listCard;
          if (listCard.items) {
            listCard.items.forEach((item, idx) => {
              if (item.imageUrl) {
                console.log(`[이미지 전송 확인][예약내역] 리스트 아이템 ${idx}:`, {
                  imageUrl: item.imageUrl,
                  hasImage: !!item.imageUrl,
                });
              }
            });
          }
        }
      }
    }

    // 응답 크기 확인 (카카오톡 제한: 30,720 bytes)
    const responseJson = JSON.stringify(response);
    const responseSize = new Blob([responseJson]).size;
    const maxSize = 30720;
    const sizePercent = ((responseSize / maxSize) * 100).toFixed(1);

    console.log(
      `[응답 크기][예약내역] ${responseSize.toLocaleString()} bytes / ${maxSize.toLocaleString()} bytes (${sizePercent}%)`
    );

    if (responseSize > maxSize) {
      console.error(
        `[경고][예약내역] 응답 크기가 제한을 초과했습니다! ${responseSize - maxSize} bytes 초과`
      );
    } else if (responseSize > maxSize * 0.9) {
      console.warn(
        `[주의][예약내역] 응답 크기가 제한에 근접했습니다. (${sizePercent}% 사용 중)`
      );
    }

    // 봇 응답 저장 (store는 outputs를 Record[]로 기대함)
    const storedResponse: BotResponse = {
      ...response,
      template: response.template
        ? {
            ...response.template,
            outputs: response.template.outputs as unknown as Array<Record<string, unknown>>,
            quickReplies: response.template.quickReplies as unknown as
              | Array<Record<string, unknown>>
              | undefined,
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
    console.error('[Kakao Skill][예약내역]', e);
    return NextResponse.json(
      { error: 'Reservation history skill server error' },
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

