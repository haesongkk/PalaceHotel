'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Reservation, ReservationStatus, Room } from '@/types';
import ReservationModal from '@/components/ReservationModal';

const statusLabels: Record<ReservationStatus, string> = {
  pending: '대기 중',
  confirmed: '확인됨',
  'checked-in': '체크인',
  'checked-out': '체크아웃',
  cancelled: '취소됨',
  rejected: '거절됨',
};

const statusColors: Record<ReservationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  'checked-in': 'bg-green-100 text-green-800',
  'checked-out': 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-orange-100 text-orange-800',
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reservationsRes, roomsRes] = await Promise.all([
        fetch('/api/reservations'),
        fetch('/api/rooms'),
      ]);

      const reservationsData = await reservationsRes.json();
      const roomsData = await roomsRes.json();

      setReservations(reservationsData);
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

  const handleView = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">예약 관리</h1>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reservations.map((reservation) => {
              const room = getRoomInfo(reservation.roomId);
              return (
                <li key={reservation.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {reservation.guestName} ({reservation.guestPhone})
                          </p>
                          <span
                            className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[reservation.status]}`}
                          >
                            {statusLabels[reservation.status]}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <span>
                            {room ? room.type : '객실 정보 없음'}
                          </span>
                          <span className="mx-2">•</span>
                          <span>
                            {formatDate(reservation.checkIn)} ~ {formatDate(reservation.checkOut)}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="font-medium text-gray-900">
                            {reservation.totalPrice.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(reservation)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          상세
                        </button>
                        {reservation.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusChange(reservation.id, 'checked-in')}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            체크인
                          </button>
                        )}
                        {reservation.status === 'checked-in' && (
                          <button
                            onClick={() => handleStatusChange(reservation.id, 'checked-out')}
                            className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                          >
                            체크아웃
                          </button>
                        )}
                        {reservation.status !== 'cancelled' && reservation.status !== 'rejected' && reservation.status !== 'checked-out' && (
                          <button
                            onClick={() => handleStatusChange(reservation.id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            취소
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(reservation.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {reservations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 예약이 없습니다.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          rooms={rooms}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedReservation(null);
            fetchData();
          }}
        />
      )}
    </Layout>
  );
}

