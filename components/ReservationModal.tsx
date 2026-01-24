'use client';

import { Reservation, ReservationStatus, Room } from '@/types';

interface ReservationModalProps {
  reservation: Reservation;
  rooms: Room[];
  onClose: () => void;
}

const statusLabels: Record<ReservationStatus, string> = {
  pending: '대기 중',
  confirmed: '확인됨',
  'checked-in': '체크인',
  'checked-out': '체크아웃',
  cancelled: '취소됨',
  rejected: '거절됨',
};

export default function ReservationModal({ reservation, rooms, onClose }: ReservationModalProps) {
  const room = rooms.find((r) => r.id === reservation.roomId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">예약 상세 정보</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">예약 상태</label>
                <p className="mt-1 text-sm text-gray-900">{statusLabels[reservation.status]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">예약 번호</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.id}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">객실 정보</label>
              <p className="mt-1 text-sm text-gray-900">
                {room ? room.type : '객실 정보 없음'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">체크인</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(reservation.checkIn)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">체크아웃</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(reservation.checkOut)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">고객 이름</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.guestName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">연락처</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.guestPhone}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">총 금액</label>
              <p className="mt-1 text-sm text-gray-900 font-semibold">
                {reservation.totalPrice.toLocaleString()}원
              </p>
            </div>

            {reservation.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">메모</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.notes}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">예약 일시</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(reservation.createdAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

