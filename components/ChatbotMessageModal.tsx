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
  reservation_inquiry: '예약내역 조회시',
  reservation_cancel: '예약 취소시',
};

export default function ChatbotMessageModal({ message, onClose }: ChatbotMessageModalProps) {
  const [formData, setFormData] = useState({ message: '' });
  const [history, setHistory] = useState<Array<{ message: string; savedAt: string }>>([]);

  useEffect(() => {
    setFormData({ message: message.message });
  }, [message]);

  useEffect(() => {
    fetch(`/api/chatbot-messages/${message.situation}/history`)
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]));
  }, [message.situation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/chatbot-messages/${message.situation}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: formData.message }),
      });
      if (response.ok) onClose();
      else alert('저장에 실패했습니다.');
    } catch {
      alert('저장에 실패했습니다.');
    }
  };

  const handleRestore = (prevMessage: string) => {
    setFormData({ message: prevMessage });
  };

  const handleDeleteHistory = async (index: number) => {
    if (!confirm('이 이전 메시지를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/chatbot-messages/${message.situation}/history/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      if (res.ok) {
        const r = await fetch(`/api/chatbot-messages/${message.situation}/history`);
        const d = await r.json().catch(() => []);
        setHistory(Array.isArray(d) ? d : []);
      }
    } catch {
      alert('삭제 실패');
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">멘트 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">템플릿 이름</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                  {situationLabels[message.situation]}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">사용 시점</label>
                <div className="px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-600">
                  {message.description}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">멘트 내용</label>
                <textarea
                  required
                  rows={10}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="챗봇이 응답할 메시지를 입력하세요"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이전 메시지 (최대 3개)</label>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(0, 3).map((h, idx) => (
                  <div key={idx} className="border rounded-md p-3 bg-gray-50 text-sm">
                    <p className="whitespace-pre-wrap break-words mb-2 line-clamp-4">{h.message}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{formatDate(h.savedAt)}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleRestore(h.message)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        >
                          이걸로 복원
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(idx)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-gray-400 py-4">이전 메시지 없음</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
