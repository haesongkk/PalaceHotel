import { dataStore } from '@/lib/store';
import type { ChatbotSituation } from '@/types';
import type { KakaoSkillRequest, KakaoSkillResponse } from '@/types/kakao';
import { simpleText } from '@/types/kakao';

const SITUATIONS: ChatbotSituation[] = [
  'channel_added',
  'today_day_use',
  'today_stay',
  'saturday_reservation',
  'make_reservation',
  'reservation_request',
  'reservation_confirmed',
  'reservation_inquiry',
];

/** 발화(utterance) 키워드 → 상황 매핑 */
const KEYWORD_MAP: { keywords: string[]; situation: ChatbotSituation }[] = [
  { keywords: ['오늘 대실', '대실', '데일리룸'], situation: 'today_day_use' },
  { keywords: ['오늘 숙박', '숙박', '오늘밤'], situation: 'today_stay' },
  { keywords: ['토요일 예약', '토요일', '토요예약'], situation: 'saturday_reservation' },
  { keywords: ['예약하기', '예약 할게', '예약하려'], situation: 'make_reservation' },
  { keywords: ['예약 요청', '예약해주세요', '예약 부탁'], situation: 'reservation_request' },
  { keywords: ['예약 확정', '확정됐'], situation: 'reservation_confirmed' },
  { keywords: ['예약 내역', '예약 조회', '조회', '내 예약'], situation: 'reservation_inquiry' },
  { keywords: ['안녕', 'hello', '시작'], situation: 'channel_added' },
];

function matchSituationFromUtterance(utterance: string): ChatbotSituation | null {
  const trimmed = utterance.trim();
  if (!trimmed) return 'channel_added';

  const lower = trimmed.toLowerCase();
  for (const { keywords, situation } of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) return situation;
  }
  return null;
}

function getDefaultFallback(): string {
  const msg = dataStore.getChatbotMessage('channel_added');
  return msg?.message ?? '안녕하세요! 무엇을 도와드릴까요?';
}

/**
 * 카카오 스킬 요청을 처리하고 스킬 응답을 반환합니다.
 * 1. action.params.situation 이 있으면 해당 상황 멘트 사용
 * 2. 없으면 발화 키워드로 상황 매칭
 * 3. 매칭 실패 시 채널 추가 시 멘트로 응답
 */
export function handleKakaoSkillRequest(req: KakaoSkillRequest): KakaoSkillResponse {
  const utterance = req.userRequest?.utterance ?? '';
  const params = req.action?.params ?? {};
  const paramSituation = params.situation as ChatbotSituation | undefined;

  let situation: ChatbotSituation | null = null;

  if (paramSituation && SITUATIONS.includes(paramSituation)) {
    situation = paramSituation;
  }
  if (!situation) {
    situation = matchSituationFromUtterance(utterance);
  }
  if (!situation) {
    situation = 'channel_added';
  }

  const msg = dataStore.getChatbotMessage(situation);
  const text = msg?.message ?? getDefaultFallback();

  return simpleText(text);
}
