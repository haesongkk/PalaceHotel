'use client';

import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Reservation, ReservationStatus, Room, ReservationType } from '@/types';
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

function sortReservations(list: Reservation[], activeFilter: FilterTab): Reservation[] {
  const byCreatedAsc = (a: Reservation, b: Reservation) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const byCreatedDesc = (a: Reservation, b: Reservation) =>
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservationTypes, setReservationTypes] = useState<ReservationType[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const lastPendingIdsRef = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const [reservationsRes, roomsRes, typesRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/rooms'),
        fetch('/api/reservation-types'),
      ]);
      const reservationsData: Reservation[] = await reservationsRes.json();
      const roomsData: Room[] = await roomsRes.json();
      const typesData: ReservationType[] = await typesRes.json();
      // 예약 관리 화면에는 카카오톡으로 들어온 예약만 표시
      const kakaoReservations = reservationsData.filter(
        (r) => r.source === 'kakao' || !r.source
      );
      setReservations(kakaoReservations);
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
    if (loading) return;
    const pendingIds = new Set(reservations.filter((r) => r.status === 'pending').map((r) => r.id));
    lastPendingIdsRef.current = pendingIds;
  }, [loading, reservations]);

  useEffect(() => {
    const POLL_MS = 20000;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/reservations');
        const data: Reservation[] = await res.json();
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

  const handleRowClick = (reservation: Reservation, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setSelectedReservation(reservation);
  };

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const filtered =
    filter === 'all' ? reservations : reservations.filter((r) => r.status === filter);
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

        <div className="flex flex-wrap gap-2 mb-4">
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
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {reservation.guestName} ({reservation.guestPhone})
                          </p>
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[reservation.status]}`}
                          >
                            {statusLabels[reservation.status]}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <span>{room ? room.type : '객실 정보 없음'}</span>
                          <span className="mx-2">·</span>
                          <span>
                            {formatDate(reservation.checkIn)} ~ {formatDate(reservation.checkOut)}
                          </span>
                          <span className="mx-2">·</span>
                          <span className="font-medium text-gray-900">
                            {reservation.totalPrice.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {reservation.status === 'pending' && (
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
                                handleStatusChange(reservation.id, 'rejected');
                              }}
                              className="text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                              거절
                            </button>
                          </>
                        )}
                        {reservation.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(reservation.id, 'cancelled_by_admin');
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            취소
                          </button>
                        )}
                        {reservation.status === 'cancelled_by_guest' &&
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
