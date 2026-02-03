'use client';

import { useEffect, useState } from 'react';
import { Reservation, ChatHistory, ChatMessage, Room } from '@/types';
import ChatSendPanel from '@/components/ChatSendPanel';

const RESERVATION_WINDOW_MINUTES = 30;

function getMessagePreview(message: ChatMessage): string {
  if (message.sender === 'user' && message.userMessage?.utterance) {
    return message.userMessage.utterance;
  }
  if (message.sender === 'bot' && message.botMessage?.response?.template?.outputs?.length) {
    const first = message.botMessage.response.template.outputs[0];
    if (first?.simpleText && typeof first.simpleText === 'object') {
      return (first.simpleText as { text?: string }).text ?? '';
    }
    if (first?.textCard && typeof first.textCard === 'object') {
      const card = first.textCard as { title?: string; description?: string };
      return card.title || card.description || '';
    }
  }
  if (message.content) return message.content;
  return '(메시지)';
}

function filterMessagesByReservation(messages: ChatMessage[], reservationCreatedAt: string): ChatMessage[] {
  const created = new Date(reservationCreatedAt).getTime();
  const windowMs = RESERVATION_WINDOW_MINUTES * 60 * 1000;
  return messages.filter((m) => {
    const t = new Date(m.timestamp).getTime();
    return t >= created - windowMs && t <= created + windowMs;
  });
}

interface ReservationConversationPanelProps {
  reservation: Reservation;
  rooms: Room[];
  onClose: () => void;
  onStatusChange: () => void;
}

const statusLabels: Record<Reservation['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled_by_guest: '고객 취소',
  cancelled_by_admin: '관리자 취소',
};

export default function ReservationConversationPanel({
  reservation,
  rooms,
  onClose,
  onStatusChange,
}: ReservationConversationPanelProps) {
  const [history, setHistory] = useState<ChatHistory | null>(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const room = rooms.find((r) => r.id === reservation.roomId);
  const userId = reservation.userId ?? (reservation.guestName && /^\d+$/.test(reservation.guestName) ? reservation.guestName : null);

  useEffect(() => {
    if (!userId) return;
    setLoadingHistory(true);
    fetch(`/api/chat-histories?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setLoadingHistory(false));
  }, [userId]);

  const messages = history?.messages ?? [];
  const filteredMessages = showAllMessages
    ? messages
    : filterMessagesByReservation(messages, reservation.createdAt);
  const hasFilteredDifference = messages.length !== filteredMessages.length && messages.length > 0;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleStatusChange = async (newStatus: Reservation['status']) => {
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">대화 및 예약</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b space-y-2 bg-white">
        <p className="text-sm font-medium text-gray-900">
          {reservation.guestName} · {reservation.guestPhone}
        </p>
        <p className="text-sm text-gray-600">
          {room?.type ?? '객실'} · {formatDate(reservation.checkIn)} ~ {formatDate(reservation.checkOut)}
        </p>
        <p className="text-sm text-gray-600">
          {reservation.totalPrice.toLocaleString()}원 ·{' '}
          <span className="font-medium">{statusLabels[reservation.status]}</span>
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {reservation.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange('confirmed')}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                확정
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('rejected')}
                className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700"
              >
                거절
              </button>
            </>
          )}
          {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
            <button
              type="button"
              onClick={() => handleStatusChange('cancelled_by_admin')}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              취소
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!userId ? (
          <p className="text-sm text-gray-500">이 예약은 카카오 채널을 통해 들어온 것이 아니어서 대화 내역이 없습니다.</p>
        ) : loadingHistory ? (
          <p className="text-sm text-gray-500">대화 불러오는 중...</p>
        ) : !history || messages.length === 0 ? (
          <p className="text-sm text-gray-500">대화 내역이 없습니다.</p>
        ) : (
          <>
            {hasFilteredDifference && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setShowAllMessages((v) => !v)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllMessages ? '예약 관련만 보기' : '전체 보기'}
                </button>
              </div>
            )}
            <ul className="space-y-3">
              {filteredMessages.map((msg) => (
                <li
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{getMessagePreview(msg)}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}
                    >
                      {formatDate(msg.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ChatSendPanel
        userId={userId}
        phone={reservation.guestPhone}
        reservationContext={{
          roomType: room?.type ?? '객실',
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          totalPrice: reservation.totalPrice,
          reservationId: reservation.id,
        }}
        onChatSent={() => {
          if (userId) {
            fetch(`/api/chat-histories?userId=${encodeURIComponent(userId)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => { if (data != null) setHistory(data); });
          }
        }}
        onAlimtalkSent={() => {}}
      />
    </div>
  );
}
