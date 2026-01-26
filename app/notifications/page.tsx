'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Reservation, Room } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // 30초마다 새 알림 확인
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [reservationsRes, roomsRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/rooms'),
      ]);

      const reservationsData: Reservation[] = await reservationsRes.json();
      const roomsData: Room[] = await roomsRes.json();

      // pending 상태만 필터링하고 최신순 정렬
      const pendingReservations = reservationsData
        .filter((r) => r.status === 'pending')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setReservations(pendingReservations);
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomInfo = (roomId: string) => {
    return rooms.find((r) => r.id === roomId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  };

  const handleNotificationClick = (reservationId: string) => {
    router.push(`/admin/reservation/${reservationId}`);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">알림 목록</h1>

        {reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">🔔</div>
            <p className="text-gray-500">새로운 알림이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => {
              const room = getRoomInfo(reservation.roomId);
              return (
                <div
                  key={reservation.id}
                  onClick={() => handleNotificationClick(reservation.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm font-semibold text-gray-900">
                          새로운 예약 요청
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {formatTime(reservation.createdAt)}
                        </span>
                      </div>
                      <div className="ml-4 space-y-1">
                        <p className="text-base text-gray-800">
                          <span className="font-medium">{reservation.guestName}</span>
                          <span className="text-gray-500 ml-1">({reservation.guestPhone})</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          {room ? room.type : '객실 정보 없음'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(reservation.checkIn)} ~ {formatDate(reservation.checkOut)}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {reservation.totalPrice.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
