/**
 * 카카오톡 챗봇 스킬 API 타입 정의
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/make_skill
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/response_format
 */

/** 스킬 서버로 전달되는 요청 (스킬 payload) */
export interface KakaoSkillRequest {
  intent?: {
    id: string;
    name: string;
    extra?: Record<string, unknown>;
  };
  bot?: {
    id: string;
    name: string;
  };
  action: {
    id: string;
    name: string;
    params?: Record<string, string>;
    detailParams?: Record<
      string,
      { origin?: string; value?: string; groupName?: string }
    >;
  };
  userRequest: {
    timezone: string;
    params?: Record<string, unknown>;
    block?: { id: string; name: string };
    utterance: string;
    lang: string;
    user: {
      id: string;
      type: string;
      properties?: Record<string, unknown>;
    };
  };
  contexts?: Array<{
    name: string;
    lifeSpan: number;
    params?: Record<string, { value: string; origin?: string }>;
  }>;
}

/** simpleText 출력 */
export interface KakaoSimpleText {
  simpleText: { text: string };
}

/** simpleImage 출력 */
export interface KakaoSimpleImage {
  simpleImage: { imageUrl: string; altText: string };
}

/** 스킬 서버 응답 (template 기반) */
export interface KakaoSkillResponse {
  version: '2.0';
  template?: {
    outputs: (KakaoSimpleText | KakaoSimpleImage)[];
    quickReplies?: Array<{ label: string; action: string; messageText: string }>;
  };
  data?: Record<string, unknown>;
}

/** simpleText 응답 생성 헬퍼 */
export function simpleText(text: string): KakaoSkillResponse {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}
