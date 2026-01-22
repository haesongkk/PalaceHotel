'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatHistory } from '@/types';
import ChatHistoryModal from '@/components/ChatHistoryModal';

export default function ChatHistoriesPage() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      const response = await fetch('/api/chat-histories');
      const data = await response.json();
      setHistories(data);
    } catch (error) {
      console.error('Failed to fetch chat histories:', error);
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

  const getLastMessage = (history: ChatHistory) => {
    if (history.messages.length === 0) return '메시지 없음';
    const lastMsg = history.messages[history.messages.length - 1];
    return lastMsg.content.length > 50
      ? lastMsg.content.substring(0, 50) + '...'
      : lastMsg.content;
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
                          {history.userName || `사용자 ${history.userId}`}
                        </p>
                        <span className="ml-3 text-xs text-gray-500">
                          ({history.userId})
                        </span>
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
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHistory(null);
          }}
        />
      )}
    </Layout>
  );
}

