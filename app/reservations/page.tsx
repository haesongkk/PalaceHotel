'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { formatStayLabel } from '@/lib/reservation-utils';
import { Reservation, ReservationWithGuest, ReservationStatus, Room, ReservationType } from '@/types';
import ReservationConversationPanel from '@/components/ReservationConversationPanel';

const statusLabels: Record<ReservationStatus, string> = {
  pending: '대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled_by_guest: '고객 취소',
  cancelled_by_admin: '관리자 취소',
};

const statusColors: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  rejected: 'bg-orange-100 text-orange-800',
  cancelled_by_guest: 'bg-red-100 text-red-800',
  cancelled_by_admin: 'bg-red-100 text-red-800',
};

type FilterTab = 'all' | ReservationStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'confirmed', label: '확정' },
  { key: 'rejected', label: '거절' },
  { key: 'cancelled_by_guest', label: '고객 취소' },
  { key: 'cancelled_by_admin', label: '관리자 취소' },
];

function sortReservations<T extends Reservation>(list: T[], activeFilter: FilterTab): T[] {
  const byCreatedAsc = (a: T, b: T) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const byCreatedDesc = (a: T, b: T) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  // 고객 취소 탭: 미확인(guestCancellationConfirmed !== true) 먼저, 오래된순
  if (activeFilter === 'cancelled_by_guest') {
    const unconfirmed = list.filter(
      (r) => r.status === 'cancelled_by_guest' && !r.guestCancellationConfirmed
    );
    const confirmed = list.filter(
      (r) => r.status === 'cancelled_by_guest' && r.guestCancellationConfirmed
    );
    return [...unconfirmed.sort(byCreatedAsc), ...confirmed.sort(byCreatedDesc)];
  }

  // 전체 탭: 대기 + 고객취소 미확인 먼저, 그 안에서는 오래된순 / 나머지는 최근순
  if (activeFilter === 'all') {
    const important = list.filter(
      (r) =>
        r.status === 'pending' ||
        (r.status === 'cancelled_by_guest' && !r.guestCancellationConfirmed)
    );
    const importantIds = new Set(important.map((r) => r.id));
    const others = list.filter((r) => !importantIds.has(r.id));
    return [...important.sort(byCreatedAsc), ...others.sort(byCreatedDesc)];
  }

  // 나머지 필터: 최근순
  return [...list].sort(byCreatedDesc);
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithGuest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservationTypes, setReservationTypes] = useState<ReservationType[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [kakaoOnly, setKakaoOnly] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithGuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalTargetId, setStatusModalTargetId] = useState<string | null>(null);
  const [statusModalStatus, setStatusModalStatus] = useState<ReservationStatus | null>(null);
  const [statusModalMemo, setStatusModalMemo] = useState('');
  const [statusModalSubmitting, setStatusModalSubmitting] = useState(false);
  const lastPendingIdsRef = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchParams = useSearchParams();
  const initialSelectionHandledRef = useRef(false);

  const fetchData = async () => {
    try {
      const [reservationsRes, roomsRes, typesRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/rooms'),
        fetch('/api/reservation-types'),
      ]);
      const reservationsData: ReservationWithGuest[] = await reservationsRes.json();
      const roomsData: Room[] = await roomsRes.json();
      const typesData: ReservationType[] = await typesRes.json();
      // 모든 예약을 표시 (카카오 + 수기 예약 등)
      setReservations(reservationsData);
      setRooms(roomsData);
      setReservationTypes(typesData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (loading || reservations.length === 0 || initialSelectionHandledRef.current) return;
    const targetId = searchParams.get('reservationId');
    if (!targetId) return;
    const target = reservations.find((r) => r.id === targetId);
    if (target) {
      setSelectedReservation(target);
      initialSelectionHandledRef.current = true;
    }
  }, [loading, reservations, searchParams]);

  useEffect(() => {
    if (loading) return;
    const pendingIds = new Set(reservations.filter((r) => r.status === 'pending').map((r) => r.id));
    lastPendingIdsRef.current = pendingIds;
  }, [loading, reservations]);

  useEffect(() => {
    const POLL_MS = 20000;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/reservations');
        const data: ReservationWithGuest[] = await res.json();
        const currentPendingIds = new Set(data.filter((r) => r.status === 'pending').map((r) => r.id));
        const prev = lastPendingIdsRef.current;
        const hasNewPending = [...currentPendingIds].some((id) => !prev.has(id));
        if (hasNewPending && currentPendingIds.size > 0) {
          setToast({ message: '새 예약 요청이 들어왔습니다.' });
          try {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (Ctx) {
              const ctx = new Ctx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.2;
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.15);
              setTimeout(() => ctx.close(), 500);
            }
          } catch {
            // ignore
          }
          fetchData();
        }
        lastPendingIdsRef.current = currentPendingIds;
      } catch {
        // ignore
      }
    }, POLL_MS);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const getRoomInfo = (roomId: string) => rooms.find((r) => r.id === roomId);

  const getReservationType = (reservationTypeId?: string) =>
    reservationTypeId ? reservationTypes.find((t) => t.id === reservationTypeId) : undefined;

  const handleRowClick = (reservation: ReservationWithGuest, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setSelectedReservation(reservation);
  };

  const handleStatusChange = async (id: string, newStatus: ReservationStatus, statusChangeMemo?: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, statusChangeMemo }),
      });
      if (response.ok) {
        fetchData();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const openStatusModal = (id: string, status: ReservationStatus) => {
    setStatusModalTargetId(id);
    setStatusModalStatus(status);
    setStatusModalMemo('');
    setStatusModalOpen(true);
  };

  const handleStatusModalConfirm = async () => {
    if (!statusModalTargetId || !statusModalStatus) return;
    setStatusModalSubmitting(true);
    try {
      const memo = statusModalMemo.trim() || undefined;
      await handleStatusChange(statusModalTargetId, statusModalStatus, memo);
      setStatusModalOpen(false);
      setStatusModalTargetId(null);
      setStatusModalStatus(null);
      setStatusModalMemo('');
    } finally {
      setStatusModalSubmitting(false);
    }
  };

  const handleGuestCancellationConfirm = async (id: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestCancellationConfirmed: true }),
      });
      if (response.ok) {
        fetchData();
      } else {
        alert('취소 확인 처리에 실패했습니다.');
      }
    } catch {
      alert('취소 확인 처리에 실패했습니다.');
    }
  };

  const filteredByStatus =
    filter === 'all' ? reservations : reservations.filter((r) => r.status === filter);
  const filtered = kakaoOnly
    ? filteredByStatus.filter((r) => r.source === 'kakao')
    : filteredByStatus;
  const sorted = sortReservations(filtered, filter);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">예약 관리</h1>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={kakaoOnly}
              onChange={(e) => setKakaoOnly(e.target.checked)}
            />
            <span>카톡 예약만 보기</span>
          </label>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sorted.map((reservation) => {
              const room = getRoomInfo(reservation.roomId);
              const isImportant =
                reservation.status === 'pending' ||
                (reservation.status === 'cancelled_by_guest' &&
                  !reservation.guestCancellationConfirmed);

              return (
                <li key={reservation.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRowClick(reservation, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(reservation, e as unknown as React.MouseEvent);
                      }
                    }}
                    className={`px-4 py-4 sm:px-6 cursor-pointer transition-colors ${
                      isImportant ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          {isImportant && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
                          )}
                          <p className="text-sm text-gray-900 truncate">
                            <span className="text-gray-500">
                              {room ? room.type : '객실 정보 없음'}
                            </span>
                            <span className="text-gray-400"> · </span>
                            <span className="text-gray-500">
                              {formatStayLabel(reservation.checkIn, reservation.checkOut)}
                            </span>
                            {reservation.guestPhone && (
                              <>
                                <span className="text-gray-400"> · </span>
                                <span className="text-gray-500">{reservation.guestPhone}</span>
                              </>
                            )}
                            <span className="text-gray-400"> · </span>
                            <span className="font-medium">
                              {reservation.totalPrice.toLocaleString()}원
                            </span>
                          </p>
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[reservation.status]}`}
                          >
                            {statusLabels[reservation.status]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {reservation.source !== 'manual' && reservation.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              handleStatusChange(reservation.id, 'confirmed');
                              }}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              확정
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              openStatusModal(reservation.id, 'rejected');
                              }}
                              className="text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {reservation.source !== 'manual' && reservation.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal(reservation.id, 'cancelled_by_admin');
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            취소
                          </button>
                        )}
                        {reservation.source !== 'manual' &&
                          reservation.status === 'cancelled_by_guest' &&
                          !reservation.guestCancellationConfirmed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGuestCancellationConfirm(reservation.id);
                              }}
                              className="text-sm font-medium text-gray-500 hover:text-gray-700"
                            >
                              확인됨
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {sorted.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {filter === 'all' ? '등록된 예약이 없습니다.' : '해당 상태의 예약이 없습니다.'}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg"
        >
          {toast.message}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-3 text-white/80 hover:text-white"
          >
            닫기
          </button>
        </div>
      )}

      {statusModalOpen && statusModalStatus && statusModalTargetId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!statusModalSubmitting) setStatusModalOpen(false);
            }}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-white shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {statusModalStatus === 'rejected' ? '예약 거절 사유' : '예약 취소 사유'}
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              입력한 내용은 고객에게 발송되는 알림톡 메시지의 메모 영역에 함께 포함됩니다. 비워두면 메모 없이 발송됩니다.
            </p>
            <textarea
              value={statusModalMemo}
              onChange={(e) => setStatusModalMemo(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="예: 고객 요청으로 예약을 취소하였습니다."
              disabled={statusModalSubmitting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !statusModalSubmitting && setStatusModalOpen(false)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={statusModalSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleStatusModalConfirm}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={statusModalSubmitting}
              >
                {statusModalSubmitting
                  ? statusModalStatus === 'rejected'
                    ? '거절 처리 중...'
                    : '취소 처리 중...'
                  : statusModalStatus === 'rejected'
                  ? '거절 확정'
                  : '취소 확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReservation && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setSelectedReservation(null)}
            onKeyDown={(e) => e.key === 'Escape' && setSelectedReservation(null)}
            role="button"
            tabIndex={0}
            aria-label="패널 닫기"
          />
          <ReservationConversationPanel
            reservation={selectedReservation}
            rooms={rooms}
            onClose={() => setSelectedReservation(null)}
            onStatusChange={fetchData}
          />
        </>
      )}
    </Layout>
  );
}
