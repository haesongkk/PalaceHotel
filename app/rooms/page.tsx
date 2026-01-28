'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Room, DayOfWeek } from '@/types';
import RoomModal from '@/components/RoomModal';

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRooms();
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    fetchRooms();
  };

  const getRepresentativePrice = (room: Room) => {
    // 기본값(가정): 대실 최저가를 대표 가격으로 사용
    const allDayUsePrices = daysOfWeek.map((day) => room.prices[day].dayUsePrice);
    return Math.min(...allDayUsePrices);
  };

  const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`;

  const clampRate = (rate: number) => Math.min(100, Math.max(0, rate));

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">객실 관리</h1>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            객실 추가
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const price = getRepresentativePrice(room);
            const rate = clampRate(room.discountRate ?? 0);
            const discountedPrice = rate > 0 ? Math.round(price * (1 - rate / 100)) : price;
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200"
              >
                {/* 이미지 영역 */}
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  {room.imageUrl ? (
                    <img
                      src={room.imageUrl}
                      alt={room.type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 정보 영역 */}
                <div className="pt-4">
                  {/* 타이틀(이미지 아래 첫 줄) */}
                  <div className="px-4 text-base font-semibold text-gray-900">{room.type}</div>

                  {/* 가격/할인 */}
                  <div className="px-4 mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-gray-900">
                      {formatWon(discountedPrice)}
                    </span>
                    {rate > 0 && (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          {formatWon(price)}
                        </span>
                        <span className="text-sm font-semibold text-red-500">
                          {rate}%
                        </span>
                      </>
                    )}
                  </div>

                  {room.description && (
                    <>
                      {/* 가격-설명 사이 구분선(카톡 카드 스타일) */}
                      <div className="mt-4 border-t border-gray-200 mx-4" />

                      {/* 설명(가격 아래, 연한 톤) */}
                      <div className="px-4 mt-3 mb-2 text-sm text-gray-500">
                        {room.description}
                      </div>
                    </>
                  )}

                  {/* 버튼 영역(카톡의 '예약하기' 자리) */}
                  <div className="mt-4 border-t border-gray-200 bg-gray-50 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEdit(room)}
                        className="w-full py-2.5 bg-white border border-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="w-full py-2.5 bg-white border border-gray-200 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {rooms.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-gray-500 text-lg">등록된 객실이 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">새로운 객실을 추가해보세요.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RoomModal
          room={editingRoom}
          onClose={handleModalClose}
        />
      )}
    </Layout>
  );
}
