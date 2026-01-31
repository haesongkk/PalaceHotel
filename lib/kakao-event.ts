/**
 * 카카오 챗봇 Event API
 * 챗봇이 먼저 사용자에게 말을 걸 때 사용 (이벤트 블록 호출)
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/main_notions/event-api
 */

const KAKAO_BOT_API = 'https://bot-api.kakao.com';

export interface KakaoEventSendPayload {
  event: {
    name: string;
    data?: Record<string, string>;
  };
  user: Array<{
    type: 'botUserKey' | 'plusfriendUserKey' | 'appUserId';
    id: string;
    properties?: Record<string, string>;
  }>;
  params?: Record<string, unknown>;
}

export interface KakaoEventSendResult {
  taskId: string;
  status: 'SUCCESS' | 'FAIL' | 'ERROR';
  message?: string;
  timestamp: number;
}

/**
 * Event API 호출 (이벤트 블록 실행 → 해당 사용자에게 말풍선 전송)
 * - botId: 챗봇 관리자센터 봇 ID (개발채널은 botId! 로 전달)
 * - eventName: 블록 > 이벤트 설정에 등록한 이벤트 이름
 * - userId: 스킬에서 받는 userRequest.user.id (botUserKey)
 */
export async function sendKakaoEvent(params: {
  botId: string;
  restApiKey: string;
  eventName: string;
  userIds: string[];
  userKeyType?: 'botUserKey' | 'plusfriendUserKey' | 'appUserId';
  eventData?: Record<string, string>;
  params?: Record<string, unknown>;
}): Promise<KakaoEventSendResult> {
  const { botId, restApiKey, eventName, userIds, userKeyType = 'botUserKey', eventData, params: eventParams } = params;
  if (!botId || !restApiKey || !eventName) {
    throw new Error('KAKAO_BOT_ID, KAKAO_REST_API_KEY, KAKAO_EVENT_NAME이 필요합니다.');
  }
  if (userIds.length === 0) {
    throw new Error('최소 1명의 사용자 ID가 필요합니다.');
  }
  if (userIds.length > 100) {
    throw new Error('한 번에 최대 100명까지 발송 가능합니다.');
  }

  const payload: KakaoEventSendPayload = {
    event: {
      name: eventName,
      ...(eventData && { data: eventData }),
    },
    user: userIds.map((id) => ({ type: userKeyType, id })),
    ...(eventParams && { params: eventParams }),
  };

  const url = `${KAKAO_BOT_API}/v2/bots/${encodeURIComponent(botId)}/talk`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data: KakaoEventSendResult;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Event API 응답 파싱 실패: ${text.substring(0, 200)}`);
  }

  return data;
}

/**
 * 이벤트 발송 결과 조회 (taskId로 성공/실패 건수 확인)
 * GET https://bot-api.kakao.com/v1/tasks/{taskId}
 */
export async function getKakaoEventTaskResult(params: {
  taskId: string;
  restApiKey: string;
}): Promise<{
  taskID: string;
  status: string;
  allRequestCount?: number;
  successCount?: number;
  fail?: { count: number; list?: Array<{ userID: string; errorMsg: string }> };
}> {
  const { taskId, restApiKey } = params;
  const url = `${KAKAO_BOT_API}/v1/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || '결과 조회 실패');
  }
  return data;
}
