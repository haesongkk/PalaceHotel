'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { ChatHistory, Reservation, Room } from '@/types';
import ConversationPanel from '@/components/ConversationPanel';

export default function ChatHistoriesPage() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 일괄 채팅 상태
  const [showBulkChat, setShowBulkChat] = useState(false);
  const [bulkChatText, setBulkChatText] = useState('');
  const [bulkChatIsAd, setBulkChatIsAd] = useState(false);
  const [sendingBulkChat, setSendingBulkChat] = useState(false);
  const [bulkChatError, setBulkChatError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<ChatHistory[] | null> => {
    try {
      const [historiesRes, reservationsRes, roomsRes] = await Promise.all([
        fetch('/api/chat-histories'),
        fetch('/api/reservations'),
        fetch('/api/rooms'),
      ]);
      const historiesData = await historiesRes.json();
      const reservationsData = await reservationsRes.json();
      const roomsData = await roomsRes.json();
      setHistories(historiesData);
      setReservations(reservationsData ?? []);
      setRooms(roomsData ?? []);
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

  // 유저 전화번호: 대화 내역 저장값 우선, 없으면 예약에서 매칭
  const getDisplayPhone = (history: ChatHistory): string => {
    if (history.userPhone?.trim()) return history.userPhone.trim();
    const r = reservations.find(
      (res) => res.userId === history.userId || res.guestName === history.userId
    );
    return r?.guestPhone ?? '-';
  };

  const getRawPhone = (history: ChatHistory): string | null => {
    if (history.userPhone?.trim()) return history.userPhone.trim();
    const r = reservations.find(
      (res) => res.userId === history.userId || res.guestName === history.userId
    );
    return r?.guestPhone?.trim() || null;
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

  const isAllSelected = histories.length > 0 && selectedIds.length === histories.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(histories.map((h) => h.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedHistories = useMemo(
    () => histories.filter((h) => selectedIds.includes(h.id)),
    [histories, selectedIds]
  );

  const selectedUserIds = useMemo(
    () => Array.from(new Set(selectedHistories.map((h) => h.userId))),
    [selectedHistories]
  );

  const handleOpenBulkChat = () => {
    if (selectedUserIds.length === 0) {
      alert('선택된 대화가 없습니다.');
      return;
    }
    setBulkChatError(null);
    setShowBulkChat(true);
  };

  const handleSendBulkChat = async () => {
    if (!bulkChatText.trim() || selectedUserIds.length === 0) return;
    setSendingBulkChat(true);
    setBulkChatError(null);
    try {
      const res = await fetch('/api/kakao/event/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          text: bulkChatText.trim(),
          isAd: bulkChatIsAd,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const status = String((data as { status?: string }).status ?? '').toUpperCase();
      const isSuccess = res.ok && status !== 'FAIL' && status !== 'ERROR' && !(data as { error?: string }).error;
      if (isSuccess) {
        alert(`총 ${selectedUserIds.length}명에게 채팅 전송을 요청했습니다.`);
        setShowBulkChat(false);
        setBulkChatText('');
        setBulkChatIsAd(false);
        setSelectedIds([]);
      } else {
        const raw =
          (data as { message?: string }).message ||
          (data as { error?: string }).error ||
          '일괄 채팅 전송에 실패했습니다.';
        const isAdTimeError =
          typeof raw === 'string' &&
          raw.includes('Current time is unavailable for advertisement');
        const errMsg = isAdTimeError
          ? '현재 시간에는 카카오 정책상 광고성(마케팅) 메시지를 발송할 수 없습니다.\n허용된 광고 발송 시간대에 다시 시도하시거나, 광고성 체크를 해제하고 정보성 메시지로 전송해 주세요.'
          : raw;
        setBulkChatError(errMsg);
        alert(errMsg);
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : '일괄 채팅 전송에 실패했습니다.';
      const isAdTimeError =
        typeof raw === 'string' &&
        raw.includes('Current time is unavailable for advertisement');
      const errMsg = isAdTimeError
        ? '현재 시간에는 카카오 정책상 광고성(마케팅) 메시지를 발송할 수 없습니다.\n허용된 광고 발송 시간대에 다시 시도하시거나, 광고성 체크를 해제하고 정보성 메시지로 전송해 주세요.'
        : raw;
      setBulkChatError(errMsg);
      alert(errMsg);
    } finally {
      setSendingBulkChat(false);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">카카오톡 챗봇 대화 내역</h1>

        {selectedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
            <span className="text-blue-900">
              총 {selectedIds.length}개 대화 선택됨 (고유 사용자 {selectedUserIds.length}명)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenBulkChat}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
              >
                선택 사용자에게 채팅 보내기
              </button>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={isAllSelected}
                onChange={toggleSelectAll}
              />
              <span>전체 선택</span>
            </div>
            <span>총 {histories.length}개 대화</span>
          </div>

          <ul className="divide-y divide-gray-200">
            {histories.map((history) => {
              const checked = selectedIds.includes(history.id);
              return (
                <li key={history.id}>
                  <div className="flex items-stretch px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="mr-3 mt-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        checked={checked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(history.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="대화 선택"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleView(history)}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {history.userName?.trim() || formatName(history.userId)} (
                          {getDisplayPhone(history)})
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
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {histories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              대화 내역이 없습니다.
            </div>
          )}
        </div>
      </div>

      {selectedHistory && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setSelectedHistory(null)}
            onKeyDown={(e) => e.key === 'Escape' && setSelectedHistory(null)}
            role="button"
            tabIndex={0}
            aria-label="패널 닫기"
          />
          <ConversationPanel
            source={{ mode: 'chat-history', history: selectedHistory }}
            rooms={rooms}
            onClose={() => setSelectedHistory(null)}
            onSaved={async (updated) => {
              setSelectedHistory(updated);
              await fetchData();
            }}
            onSent={async () => {
              const nextList = await fetchData();
              if (nextList && selectedHistory) {
                const next = nextList.find((h) => h.id === selectedHistory.id);
                if (next) setSelectedHistory(next);
              }
            }}
          />
        </>
      )}

      {showBulkChat && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!sendingBulkChat) {
                setBulkChatError(null);
                setShowBulkChat(false);
              }
            }}
          />
          <div className="relative z-50 w-full max-w-lg rounded-lg bg-white shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">일괄 채팅 전송</h2>
            <p className="text-xs text-gray-600 mb-3">
              선택된 대화 {selectedIds.length}개, 고유 사용자 {selectedUserIds.length}명에게
              동일한 메시지를 전송합니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  보낼 메시지
                </label>
                <textarea
                  rows={4}
                  value={bulkChatText}
                  onChange={(e) => setBulkChatText(e.target.value)}
                  placeholder="보낼 메시지를 입력하세요"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={bulkChatIsAd}
                  onChange={(e) => setBulkChatIsAd(e.target.checked)}
                />
                <span>이 메시지는 광고성 정보입니다.</span>
              </label>
            </div>
            {bulkChatError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded px-3 py-2">
                {bulkChatError}
                {bulkChatIsAd && bulkChatError.includes('실패') && (
                  <span className="block mt-1 text-xs text-red-500">
                    .env의 KAKAO_ADMIN_AD_MESSAGE_EVENT에 넣은 이벤트 이름이 카카오 빌더에 등록되어 있는지 확인해 주세요.
                  </span>
                )}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!sendingBulkChat) {
                    setBulkChatError(null);
                    setShowBulkChat(false);
                  }
                }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={sendingBulkChat}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSendBulkChat}
                disabled={sendingBulkChat || !bulkChatText.trim()}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingBulkChat ? '전송 중…' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

