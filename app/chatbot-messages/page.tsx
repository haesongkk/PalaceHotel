'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatbotMessage, ChatbotSituation } from '@/types';
import ChatbotMessageModal from '@/components/ChatbotMessageModal';

const situationLabels: Record<ChatbotSituation, string> = {
  channel_added: '채널 추가시',
  today_day_use: '오늘대실 선택시',
  today_stay: '오늘숙박 선택시',
  saturday_reservation: '토요일예약 선택시',
  make_reservation: '예약하기 선택시',
  reservation_request: '예약 요청시',
  reservation_confirmed: '예약 확정시',
  reservation_inquiry: '예약내역 조회시',
};

export default function ChatbotMessagesPage() {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatbotMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chatbot-messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (message: ChatbotMessage) => {
    setEditingMessage(message);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMessage(null);
    fetchMessages();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">카카오톡 챗봇 멘트 관리</h1>

        <div className="grid grid-cols-1 gap-4">
          {messages.map((message) => (
            <div
              key={message.situation}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {situationLabels[message.situation]}
                      </h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">사용 시점:</span> {message.description}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-4 mb-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      마지막 수정: {formatDate(message.updatedAt)}
                    </div>
                  </div>
                  <div className="ml-6">
                    <button
                      onClick={() => handleEdit(message)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      수정
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && editingMessage && (
        <ChatbotMessageModal
          message={editingMessage}
          onClose={handleModalClose}
        />
      )}
    </Layout>
  );
}
