'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ReservationWithGuest, Room } from '@/types';
import { formatStayLabel } from '@/lib/reservation-utils';

export default function AdminReservationPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;

  const [reservation, setReservation] = useState<ReservationWithGuest | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      console.log('[예약 페이지] 예약 조회 시작:', reservationId);
      
      const [reservationRes, roomsRes] = await Promise.all([
        fetch(`/api/reservations/${reservationId}`),
        fetch('/api/rooms'),
      ]);

      console.log('[예약 페이지] API 응답:', {
        reservationStatus: reservationRes.status,
        roomsStatus: roomsRes.status,
      });

      if (!reservationRes.ok) {
        const errorData = await reservationRes.json().catch(() => ({}));
        console.error('[예약 페이지] 예약 조회 실패:', {
          status: reservationRes.status,
          error: errorData,
        });
        throw new Error(`예약을 찾을 수 없습니다. (${reservationRes.status})`);
      }

      const reservationData: ReservationWithGuest = await reservationRes.json();
      const roomsData: Room[] = await roomsRes.json();
      const roomData = roomsData.find((r) => r.id === reservationData.roomId);

      console.log('[예약 페이지] 예약 데이터 로드 완료:', {
        reservationId: reservationData.id,
        roomType: roomData?.type,
      });

      setReservation(reservationData);
      setRoom(roomData ?? null);
    } catch (error) {
      console.error('[예약 페이지] 오류:', error);
      alert(`예약 정보를 불러오는데 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm('이 예약을 확정하시겠습니까?')) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (res.ok) {
        alert('예약이 확정되었습니다.');
        fetchReservation();
      } else throw new Error('예약 확정에 실패했습니다.');
    } catch (e) {
      console.error(e);
      alert('예약 확정에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('이 예약을 거절하시겠습니까?')) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (res.ok) {
        alert('예약이 거절되었습니다.');
        fetchReservation();
      } else throw new Error('예약 거절에 실패했습니다.');
    } catch (e) {
      console.error(e);
      alert('예약 거절에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#abc1d1] flex items-center justify-center">
        <div className="text-lg text-gray-700">로딩 중...</div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-[#abc1d1] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-lg text-gray-800 text-center">
          예약을 찾을 수 없습니다.
        </div>
        <div className="text-sm text-gray-600 text-center">
          예약 ID: {reservationId}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/reservations')}
            className="px-4 py-2 bg-white rounded-lg shadow hover:bg-gray-50"
          >
            예약 목록으로
          </button>
          <button
            onClick={() => {
              console.log('[예약 페이지] 새로고침 시도');
              fetchReservation();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isPending = reservation.status === 'pending';
  const stayLabel = formatStayLabel(reservation.checkIn, reservation.checkOut);

  return (
    <div className="min-h-screen bg-[#abc1d1] py-8 px-4">
      <div className="max-w-sm mx-auto">
        <h1 className="text-center text-gray-800 font-semibold mb-6">
          📱 나중에 카카오톡으로 이렇게 올 예정입니다
        </h1>

        <div className="flex items-start gap-2">
          <div className="w-9 h-9 bg-[#fae100] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-800 font-bold text-sm">호</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 mb-1">팰리스호텔</div>
            <div className="bg-white rounded-lg rounded-tl-none shadow-md p-4">
              <div className="text-gray-800 font-medium mb-2">🔔 새로운 예약 요청</div>
              {isPending ? (
                <>
                    <div className="text-gray-600 text-sm mb-3 space-y-1">
                      <div>
                        고객명 {reservation.guestName} · {room?.type ?? '객실'} ·{' '}
                        {reservation.totalPrice.toLocaleString()}원
                      </div>
                      <div>{stayLabel}</div>
                    </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={processing}
                      className="flex-1 py-2 px-3 bg-[#fae100] text-gray-800 font-medium rounded-lg hover:bg-[#e6d000] disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {processing ? '처리 중...' : '확정'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {processing ? '처리 중...' : '거절'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-gray-600 text-sm">
                  {reservation.status === 'confirmed' && '이 예약은 확정되었습니다.'}
                  {reservation.status === 'rejected' && '이 예약은 거절되었습니다.'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/reservations')}
            className="text-gray-700 hover:text-gray-900 text-sm font-medium"
          >
            ← 예약 목록으로
          </button>
        </div>
      </div>
    </div>
  );
}
