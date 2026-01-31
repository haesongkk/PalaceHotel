'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatHistory } from '@/types';

export default function KakaoEventTestPage() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ status: string; taskId?: string; message?: string } | null>(null);

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat-histories');
      const data = await res.json();
      setHistories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch chat histories', error);
      setHistories([]);
    } finally {
      setLoading(false);
    }
  };

  const formatUserId = (userId: string) => {
    if (userId.length <= 10) return userId;
    return userId.substring(0, 10) + '...';
  };

  const getLastMessage = (history: ChatHistory) => {
    if (history.messages.length === 0) return '메시지 없음';
    const lastMsg = history.messages[history.messages.length - 1];
    if (lastMsg.sender === 'user' && lastMsg.userMessage) {
      const text = lastMsg.userMessage.utterance;
      return text.length > 40 ? text.substring(0, 40) + '...' : text;
    }
    if (lastMsg.content) {
      return lastMsg.content.length > 40 ? lastMsg.content.substring(0, 40) + '...' : lastMsg.content;
    }
    return '메시지';
  };

  const handleSendEvent = async (history: ChatHistory) => {
    const name = eventName.trim();
    if (!name) {
      alert('이벤트 이름을 입력하세요. (챗봇 관리자센터 > 블록 > 이벤트 설정에 등록한 이름)');
      return;
    }
    setSendingUserId(history.userId);
    setLastResult(null);
    try {
      const res = await fetch('/api/kakao/event/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: history.userId, eventName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastResult({ status: 'FAIL', message: data.error ?? '발송 실패' });
        return;
      }
      setLastResult({
        status: data.status ?? 'UNKNOWN',
        taskId: data.taskId,
        message: data.status === 'SUCCESS' ? `요청 성공 (taskId: ${data.taskId})` : data.message,
      });
    } catch (e) {
      setLastResult({ status: 'ERROR', message: e instanceof Error ? e.message : '요청 실패' });
    } finally {
      setSendingUserId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">카카오 이벤트 API 테스트</h1>
        <p className="text-sm text-gray-500 mb-6">
          대화한 적 있는 사용자 목록입니다. 이벤트 이름을 입력한 뒤 &quot;이벤트 발송&quot;을 누르면 해당 사용자에게 챗봇 이벤트 말풍선이 전송됩니다. (챗봇 관리자센터에서 이벤트 블록을 먼저 설정·배포해야 합니다.)
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">이벤트 이름</span>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="예: home, bot_test_event"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-56"
            />
          </label>
          {lastResult && (
            <span
              className={`text-sm ${
                lastResult.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {lastResult.status}: {lastResult.message ?? lastResult.taskId ?? ''}
            </span>
          )}
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {histories.map((history) => (
              <li key={history.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {history.userName ?? `사용자 ${formatUserId(history.userId)}`}
                      </span>
                      <span className="text-xs text-gray-500">({formatUserId(history.userId)})</span>
                      <span className="text-xs text-gray-400">{history.messages.length}개 메시지</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 truncate">{getLastMessage(history)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendEvent(history)}
                    disabled={!!sendingUserId}
                    className="shrink-0 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingUserId === history.userId ? '발송 중...' : '이벤트 발송'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {histories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              대화 내역이 없습니다. 챗봇과 먼저 대화한 사용자만 목록에 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
