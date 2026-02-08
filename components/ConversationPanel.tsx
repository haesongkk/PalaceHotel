'use client';

import { useEffect, useState } from 'react';
import { Reservation, ChatHistory, ChatMessage, Room } from '@/types';
import ChatSendPanel from '@/components/ChatSendPanel';

const RESERVATION_WINDOW_MINUTES = 30;
const statusLabels: Record<Reservation['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled_by_guest: '고객 취소',
  cancelled_by_admin: '관리자 취소',
};

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

export type ConversationPanelSource =
  | { mode: 'reservation'; reservation: Reservation }
  | { mode: 'chat-history'; history: ChatHistory };

export interface ConversationPanelProps {
  source: ConversationPanelSource;
  rooms: Room[];
  onClose: () => void;
  onStatusChange?: () => void;
  onSaved?: (updated: ChatHistory) => void | Promise<void>;
  onSent?: () => void;
}

export default function ConversationPanel({
  source,
  rooms,
  onClose,
  onStatusChange,
  onSaved,
  onSent,
}: ConversationPanelProps) {
  const [history, setHistory] = useState<ChatHistory | null>(source.mode === 'chat-history' ? source.history : null);
  const [reservation, setReservation] = useState<Reservation | null>(source.mode === 'reservation' ? source.reservation : null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(source.mode === 'reservation');
  const [loadingReservation, setLoadingReservation] = useState(source.mode === 'chat-history');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const userId =
    source.mode === 'reservation'
      ? source.reservation.userId ?? (source.reservation.guestName && /^\d+$/.test(source.reservation.guestName) ? source.reservation.guestName : null)
      : source.history.userId;

  useEffect(() => {
    if (source.mode === 'reservation' && userId) {
      setLoadingHistory(true);
      fetch(`/api/chat-histories?userId=${encodeURIComponent(userId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then(setHistory)
        .catch(() => setHistory(null))
        .finally(() => setLoadingHistory(false));
    }
  }, [source.mode, userId]);

  useEffect(() => {
    if (source.mode === 'chat-history' && userId) {
      setLoadingReservation(true);
      fetch('/api/reservations')
        .then((res) => (res.ok ? res.json() : []))
        .then((list: Reservation[]) => {
          const forUser = list.filter((r) => r.userId === userId);
          const latest = forUser.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
          setReservation(latest);
        })
        .catch(() => setReservation(null))
        .finally(() => setLoadingReservation(false));
    }
  }, [source.mode, userId]);

  useEffect(() => {
    if (source.mode === 'chat-history' && source.history) {
      setHistory(source.history);
      setEditName(source.history.userName ?? '');
      setEditPhone(source.history.userPhone ?? '');
      setEditMemo(source.history.memo ?? '');
    }
  }, [source.mode, source.mode === 'chat-history' ? source.history : null]);

  // history 로드/변경 시 수정 필드 동기화 (예약 모드에서 fetch 후 포함)
  useEffect(() => {
    if (history && !editing) {
      setEditName(history.userName ?? '');
      setEditPhone(history.userPhone ?? '');
      setEditMemo(history.memo ?? '');
    }
  }, [history?.id, history?.updatedAt, editing]);

  const messages = history?.messages ?? [];
  const activeReservation = source.mode === 'reservation' ? source.reservation : reservation;
  const filteredMessages =
    activeReservation && !showAllMessages
      ? filterMessagesByReservation(messages, activeReservation.createdAt)
      : messages;
  const hasFilteredDifference = messages.length !== filteredMessages.length && messages.length > 0;

  const room = activeReservation ? rooms.find((r) => r.id === activeReservation.roomId) : null;
  const displayName = history?.userName?.trim() || (userId && userId.length > 8 ? userId.slice(0, 8) : userId) || '-';
  const phone = history?.userPhone?.trim() || '-';
  const phoneForAlimtalk = phone === '-' ? null : phone;
  // 예약 모드에서 history 없을 때 상단에는 예약 쪽 이름/번호 표시
  const topName = source.mode === 'reservation' && activeReservation && !history ? activeReservation.guestName : displayName;
  const topPhone = source.mode === 'reservation' && activeReservation && !history ? activeReservation.guestPhone : (phone === '-' ? '전화번호 없음' : phone);
  const topMemo = history?.memo?.trim() ?? '';

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleStatusChange = async (newStatus: Reservation['status']) => {
    if (!activeReservation) return;
    try {
      const res = await fetch(`/api/reservations/${activeReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (source.mode === 'chat-history') {
          const data: Reservation[] = await fetch('/api/reservations').then((r) => (r.ok ? r.json() : []));
          const next = data.find((r) => r.id === activeReservation.id) ?? null;
          setReservation(next);
        }
        onStatusChange?.();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleSaveProfile = async () => {
    if (!history) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chat-histories/${history.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: editName.trim() || undefined,
          userPhone: editPhone.trim() || undefined,
          memo: editMemo.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const updated = await res.json();
      setHistory(updated);
      onSaved?.(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSent = async () => {
    onSent?.();
    if (!userId) return;
    try {
      const res = await fetch(`/api/chat-histories?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // ignore
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

      {/* 상단: 이름(번호):고객 메모 통일, 둘 다 수정 가능 / 예약 관리만 예약 요약 + 버튼 */}
      <div className="p-4 border-b space-y-2 bg-white">
        {/* 1. 이름(번호):고객 메모 + 수정 (공통) */}
        {(history || (source.mode === 'reservation' && activeReservation)) ? (
          <>
            {!editing ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap break-words">
                  {topName}({topPhone}):{topMemo}
                </p>
                {history && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
                  >
                    수정
                  </button>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">이름</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">전화번호</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">고객 메모</label>
                  <textarea
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving || !history}
                    className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '저장 중…' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setEditName(history?.userName ?? ''); setEditPhone(history?.userPhone ?? ''); setEditMemo(history?.memo ?? ''); }}
                    className="px-2 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}

        {/* 2. 예약 관리에서만: 예약 요약 + 확정/거절/취소 */}
        {activeReservation && source.mode === 'reservation' && (
          <>
            <p className="text-sm text-gray-600">
              {room?.type ?? '객실'} · {formatDate(activeReservation.checkIn)} ~ {formatDate(activeReservation.checkOut)}
            </p>
            <p className="text-sm text-gray-600">
              {activeReservation.totalPrice.toLocaleString()}원 ·{' '}
              <span className="font-medium">{statusLabels[activeReservation.status]}</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {activeReservation.status === 'pending' && (
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
              {activeReservation.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled_by_admin')}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  취소
                </button>
              )}
            </div>
          </>
        )}
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
        phone={phoneForAlimtalk}
        reservationContext={
          activeReservation && room
            ? (() => {
                const isDayUse =
                  new Date(activeReservation.checkIn).toDateString() ===
                  new Date(activeReservation.checkOut).toDateString();
                return {
                  roomType: room.type,
                  checkIn: activeReservation.checkIn,
                  checkOut: activeReservation.checkOut,
                  totalPrice: activeReservation.totalPrice,
                  reservationId: activeReservation.id,
                  memo: history?.memo,
                  checkInTime: isDayUse ? room.dayUseCheckIn : room.stayCheckIn,
                  checkOutTime: isDayUse ? room.dayUseCheckOut : room.stayCheckOut,
                };
              })()
            : undefined
        }
        onChatSent={handleSent}
        onAlimtalkSent={handleSent}
      />
    </div>
  );
}
