'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatHistory, Reservation } from '@/types';
import ChatHistoryModal from '@/components/ChatHistoryModal';

export default function ChatHistoriesPage() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<ChatHistory[] | null> => {
    try {
      const [historiesRes, reservationsRes] = await Promise.all([
        fetch('/api/chat-histories'),
        fetch('/api/reservations'),
      ]);
      const historiesData = await historiesRes.json();
      const reservationsData = await reservationsRes.json();
      setHistories(historiesData);
      setReservations(reservationsData ?? []);
      return historiesData;
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleView = (history: ChatHistory) => {
    setSelectedHistory(history);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 이름: userId 앞 8글자만 표시
  const formatName = (userId: string) => {
    if (userId.length <= 8) return userId;
    return userId.slice(0, 8);
  };

  // userId로 예약 찾아서 전화번호 반환
  const getPhoneByUserId = (userId: string): string => {
    const r = reservations.find(
      (res) => res.userId === userId || res.guestName === userId
    );
    return r?.guestPhone ?? '-';
  };

  const getLastMessage = (history: ChatHistory) => {
    if (history.messages.length === 0) return '메시지 없음';
    const lastMsg = history.messages[history.messages.length - 1];
    
    // 사용자 메시지
    if (lastMsg.sender === 'user' && lastMsg.userMessage) {
      const text = lastMsg.userMessage.utterance;
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    
    // 봇 메시지 - 첫 번째 텍스트 추출
    if (lastMsg.sender === 'bot' && lastMsg.botMessage?.response?.template?.outputs) {
      for (const output of lastMsg.botMessage.response.template.outputs) {
        if (output.simpleText && typeof output.simpleText === 'object') {
          const text = (output.simpleText as { text?: string }).text || '';
          if (text) return text.length > 50 ? text.substring(0, 50) + '...' : text;
        }
        if (output.textCard && typeof output.textCard === 'object') {
          const card = output.textCard as { title?: string; description?: string };
          const text = card.title || card.description || '';
          if (text) return text.length > 50 ? text.substring(0, 50) + '...' : text;
        }
      }
    }
    
    // 하위 호환성
    if (lastMsg.content) {
      return lastMsg.content.length > 50
        ? lastMsg.content.substring(0, 50) + '...'
        : lastMsg.content;
    }
    
    return '메시지';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">카카오톡 챗봇 대화 내역</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {histories.map((history) => (
              <li key={history.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {formatName(history.userId)} ({getPhoneByUserId(history.userId)})
                        </p>
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {history.messages.length}개 메시지
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{getLastMessage(history)}</p>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        시작: {formatDate(history.createdAt)}
                        {history.updatedAt !== history.createdAt && (
                          <> • 마지막: {formatDate(history.updatedAt)}</>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleView(history)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        상세 보기
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {histories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              대화 내역이 없습니다.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedHistory && (
        <ChatHistoryModal
          history={selectedHistory}
          guestPhone={getPhoneByUserId(selectedHistory.userId)}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHistory(null);
          }}
          onSent={async () => {
            const nextList = await fetchData();
            if (nextList && selectedHistory) {
              const next = nextList.find((h) => h.id === selectedHistory.id);
              if (next) setSelectedHistory(next);
            }
          }}
        />
      )}
    </Layout>
  );
}

