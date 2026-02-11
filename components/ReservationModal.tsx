'use client';

import { ReservationWithGuest, ReservationStatus, Room } from '@/types';
import AppModal from '@/components/AppModal';

interface ReservationModalProps {
  reservation: ReservationWithGuest;
  rooms: Room[];
  onClose: () => void;
}

const statusLabels: Record<ReservationStatus, string> = {
  pending: '대기',
  confirmed: '확정',
  rejected: '거절',
  cancelled_by_guest: '고객 취소',
  cancelled_by_admin: '관리자 취소',
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
    <AppModal
      title="예약 상세 정보"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          닫기
        </button>
      }
    >
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

            <div>
              <label className="block text-sm font-medium text-gray-700">예약 일시</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(reservation.createdAt)}</p>
            </div>
      </div>
    </AppModal>
  );
}

