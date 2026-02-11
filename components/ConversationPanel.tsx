'use client';

import { useEffect, useState } from 'react';
import { Reservation, ChatHistory, ChatMessage, Room } from '@/types';
import ChatSendPanel from '@/components/ChatSendPanel';
import { formatStayLabel } from '@/lib/reservation-utils';

const RESERVATION_WINDOW_MINUTES = 30;
const statusLabels: Record<Reservation['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled_by_guest: '고객 취소',
  cancelled_by_admin: '관리자 취소',
};

const statusColors: Record<Reservation['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  rejected: 'bg-orange-100 text-orange-800',
  cancelled_by_guest: 'bg-red-100 text-red-800',
  cancelled_by_admin: 'bg-red-100 text-red-800',
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
  const [statusChangeMemo, setStatusChangeMemo] = useState('');
  const [adminMemoEdit, setAdminMemoEdit] = useState('');
  const [savingAdminMemo, setSavingAdminMemo] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogStatus, setStatusDialogStatus] = useState<Reservation['status'] | null>(null);
  const [statusDialogSubmitting, setStatusDialogSubmitting] = useState(false);

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
    }
  }, [source.mode, source.mode === 'chat-history' ? source.history : null]);

  const messages = history?.messages ?? [];
  const activeReservation = source.mode === 'reservation' ? source.reservation : reservation;

  // 예약 모드: 예약 관련 메모 동기화 (activeReservation 선언 이후에 배치)
  useEffect(() => {
    if (source.mode === 'reservation' && activeReservation) {
      setAdminMemoEdit(activeReservation.adminMemo ?? '');
    }
  }, [source.mode, activeReservation?.id, activeReservation?.adminMemo]);
  const filteredMessages =
    activeReservation && !showAllMessages
      ? filterMessagesByReservation(messages, activeReservation.createdAt)
      : messages;
  const hasFilteredDifference = messages.length !== filteredMessages.length && messages.length > 0;

  const room = activeReservation ? rooms.find((r) => r.id === activeReservation.roomId) : null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleStatusChange = async (newStatus: Reservation['status'], memo?: string) => {
    if (!activeReservation) return;
    let memoToSend: string | undefined = memo;
    if ((newStatus === 'rejected' || newStatus === 'cancelled_by_admin') && typeof memoToSend === 'string') {
      const trimmed = memoToSend.trim();
      memoToSend = trimmed || undefined;
    }
    try {
      const res = await fetch(`/api/reservations/${activeReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, statusChangeMemo: memoToSend }),
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

  const handleStatusDialogConfirm = async () => {
    if (!statusDialogStatus) return;
    setStatusDialogSubmitting(true);
    try {
      const memo = statusChangeMemo.trim() || undefined;
      await handleStatusChange(statusDialogStatus, memo);
      setStatusDialogOpen(false);
      setStatusDialogStatus(null);
      setStatusChangeMemo('');
    } finally {
      setStatusDialogSubmitting(false);
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

  const handleSaveAdminMemo = async () => {
    if (!activeReservation) return;
    setSavingAdminMemo(true);
    try {
      const res = await fetch(`/api/reservations/${activeReservation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminMemo: adminMemoEdit.trim() || undefined }),
      });
      if (res.ok) {
        onStatusChange?.();
      } else {
        alert('예약 메모 저장에 실패했습니다.');
      }
    } catch {
      alert('예약 메모 저장에 실패했습니다.');
    } finally {
      setSavingAdminMemo(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!activeReservation) return;
    if (!window.confirm('이 예약을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/reservations/${activeReservation.id}`, { method: 'DELETE' });
      if (res.ok) {
        onStatusChange?.();
        onClose();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-50 shadow-2xl z-40 flex flex-col border-l border-gray-200/80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 bg-white">
        <h3 className="text-lg font-semibold text-slate-800">대화 및 예약</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 상단: 예약 요약 + 버튼/메모 */}
      <div className="p-4 border-b border-gray-100 space-y-4 bg-gray-50/50">
        {/* 예약 관리에서만: 예약 요약 + 예약 메모 + 수기면 삭제만, 아니면 확정/거절/취소 */}
        {activeReservation && source.mode === 'reservation' && (
          <div className="rounded-xl bg-white border border-gray-200/80 shadow-sm p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">
                <span className="text-gray-600">
                  {room ? room.type : '객실 정보 없음'}
                </span>
                <span className="text-gray-400"> · </span>
                <span className="text-gray-600">
                  {formatStayLabel(activeReservation.checkIn, activeReservation.checkOut)}
                </span>
                {activeReservation.guestPhone && (
                  <>
                    <span className="text-gray-400"> · </span>
                    <span className="text-gray-600">{activeReservation.guestPhone}</span>
                  </>
                )}
                <span className="text-gray-400"> · </span>
                <span className="font-semibold text-slate-900">
                  {activeReservation.totalPrice.toLocaleString()}원
                </span>
              </p>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[activeReservation.status]}`}
              >
                {statusLabels[activeReservation.status]}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">예약 관련 메모</label>
              <div className="flex items-stretch gap-2">
                <textarea
                  value={adminMemoEdit}
                  onChange={(e) => setAdminMemoEdit(e.target.value)}
                  rows={2}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none transition-colors resize-none"
                  placeholder="예약에 대한 메모 (내부용)"
                />
                <button
                  type="button"
                  onClick={handleSaveAdminMemo}
                  disabled={savingAdminMemo}
                  className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {savingAdminMemo ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </div>
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

      {/* 하단: 채팅 입력 (예약 모드 시 버튼은 ChatSendPanel header에) */}
      <div className="border-t border-gray-200/80 bg-white shrink-0">
        <ChatSendPanel
          userId={userId}
          onChatSent={handleSent}
          header={
            activeReservation && source.mode === 'reservation' ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {activeReservation.source === 'manual' ? (
                  <button
                    type="button"
                    onClick={handleDeleteReservation}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    삭제
                  </button>
                ) : (
                  <>
                    {activeReservation.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('confirmed')}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          확정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusChangeMemo('');
                            setStatusDialogStatus('rejected');
                            setStatusDialogOpen(true);
                          }}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          거절
                        </button>
                      </>
                    )}
                    {activeReservation.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusChangeMemo('');
                          setStatusDialogStatus('cancelled_by_admin');
                          setStatusDialogOpen(true);
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        취소
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : undefined
          }
        />
      </div>

      {statusDialogOpen && statusDialogStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!statusDialogSubmitting) {
                setStatusDialogOpen(false);
                setStatusDialogStatus(null);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white shadow-xl p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-1.5">
              {statusDialogStatus === 'rejected' ? '예약 거절 사유' : '예약 취소 사유'}
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              입력한 내용은 고객에게 발송되는 알림톡 메시지의 메모 영역에 포함됩니다. 비워두면 메모 없이 발송됩니다.
            </p>
            <textarea
              value={statusChangeMemo}
              onChange={(e) => setStatusChangeMemo(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none resize-none"
              placeholder="예: 고객 요청으로 예약을 취소하였습니다."
              disabled={statusDialogSubmitting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!statusDialogSubmitting) {
                    setStatusDialogOpen(false);
                    setStatusDialogStatus(null);
                  }
                }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={statusDialogSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleStatusDialogConfirm}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={statusDialogSubmitting}
              >
                {statusDialogSubmitting
                  ? statusDialogStatus === 'rejected'
                    ? '거절 처리 중...'
                    : '취소 처리 중...'
                  : statusDialogStatus === 'rejected'
                  ? '거절 확정'
                  : '취소 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
