'use client';

import { useState, useEffect } from 'react';
import { ChatbotMessage, ChatbotSituation } from '@/types';

interface ChatbotMessageModalProps {
  message: ChatbotMessage;
  onClose: () => void;
}

const situationLabels: Record<ChatbotSituation, string> = {
  channel_added: '채널 추가시',
  today_day_use: '오늘대실 선택시',
  today_stay: '오늘숙박 선택시',
  saturday_reservation: '토요일예약 선택시',
  make_reservation: '예약하기 선택시',
  phone_input_request: '전화번호 입력 요청시',
  reservation_request: '예약 요청시',
  reservation_confirmed: '예약 확정시',
  reservation_rejected: '예약 거절시',
  reservation_inquiry: '예약내역 조회시',
};

export default function ChatbotMessageModal({ message, onClose }: ChatbotMessageModalProps) {
  const [formData, setFormData] = useState({
    message: '',
  });

  useEffect(() => {
    setFormData({
      message: message.message,
    });
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/chatbot-messages/${message.situation}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: formData.message }),
      });

      if (response.ok) {
        onClose();
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save message:', error);
      alert('저장에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              멘트 수정
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상황
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  {situationLabels[message.situation]}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용 시점 설명
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-600">
                  {message.description}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                멘트 내용
              </label>
              <textarea
                required
                rows={8}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="챗봇이 응답할 메시지를 입력하세요"
              />
              <p className="mt-1 text-xs text-gray-500">
                멘트 내용만 수정 가능합니다.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
