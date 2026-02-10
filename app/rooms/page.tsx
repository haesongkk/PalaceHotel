'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Room, DayOfWeek, Reservation, ReservationStatus } from '@/types';
import RoomModal from '@/components/RoomModal';

const daysOfWeek: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const EFFECTIVE_STATUSES: ReservationStatus[] = ['confirmed'];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDayOfWeekKey(date: Date): DayOfWeek {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 1) return 'monday';
  if (day === 2) return 'tuesday';
  if (day === 3) return 'wednesday';
  if (day === 4) return 'thursday';
  if (day === 5) return 'friday';
  if (day === 6) return 'saturday';
  return 'monday';
}

function getMonthGrid(currentMonth: Date): Date[] {
  const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  const day = start.getDay(); // 0:일 ~ 6:토
  const diff = day === 0 ? -6 : 1 - day; // 월요일 시작 기준
  start.setDate(start.getDate() + diff);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatKoreanShort(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function getDayUsePriceForDate(room: Room, date: Date): number {
  const key = getDayOfWeekKey(date);
  return room.prices[key].dayUsePrice;
}

function getStayPriceForSelection(room: Room, start: Date, end: Date | null): { total: number; nights: number } {
  const startDay = startOfDay(start);
  const endDay = end ? startOfDay(end) : startDay;

  let nights = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) nights = 1;

  let total = 0;
  for (let i = 0; i < nights; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    const key = getDayOfWeekKey(d);
    total += room.prices[key].stayPrice;
  }

  return { total, nights };
}

function getSelectionSummaryText(startDate: Date, endDate: Date | null): string {
  const start = startOfDay(startDate);
  const end = endDate ? startOfDay(endDate) : start;
  const isStay = !!endDate && !isSameDay(start, end);
  const startLabel = formatKoreanShort(start);
  const endLabel = formatKoreanShort(end);
  const typeLabel = isStay ? '숙박' : '대실';
  return `${startLabel} ~ ${endLabel} (${typeLabel})`;
}

function parseISODate(dateString: string): Date {
  return startOfDay(new Date(dateString));
}

function getEffectiveReservationsForDate(
  reservations: Reservation[],
  date: Date
): Reservation[] {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return reservations.filter((r) => {
    if (!EFFECTIVE_STATUSES.includes(r.status)) return false;
    const resStart = parseISODate(r.checkIn);
    const resEndRaw = parseISODate(r.checkOut);
    const resEnd = new Date(resEndRaw);
    // 대실(당일 이용): 체크인/체크아웃 날짜가 같으면 해당 날짜 하루만 점유
    if (resEnd.getTime() === resStart.getTime()) {
      resEnd.setDate(resEnd.getDate() + 1);
    }
    return resStart < dayEnd && resEnd > dayStart;
  });
}

function getRoomDailyUsage(
  room: Room,
  reservations: Reservation[],
  date: Date
): { sold: number; remaining: number } {
  const effectiveReservations = getEffectiveReservationsForDate(reservations, date).filter(
    (r) => r.roomId === room.id
  );
  const sold = effectiveReservations.length;
  const remaining = Math.max(0, room.inventory - sold);
  return { sold, remaining };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const [roomsRes, reservationsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/reservations'),
      ]);
      const roomsData: Room[] = await roomsRes.json();
      const reservationsData: Reservation[] = await reservationsRes.json();
      setRooms(roomsData);
      setReservations(reservationsData);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const persistRoomOrder = async (orderedRooms: Room[]) => {
    try {
      await Promise.all(
        orderedRooms.map((room, index) =>
          fetch(`/api/rooms/${room.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: index + 1 }),
          }),
        ),
      );
    } catch (error) {
      console.error('Failed to persist room order:', error);
      alert('객실 순서 저장에 실패했습니다. 다시 시도해주세요.');
      fetchRooms();
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

  const handleDragStart = (roomId: string) => {
    setDraggingRoomId(roomId);
  };

  const handleDragEnd = () => {
    setDraggingRoomId(null);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLDivElement>, targetRoomId: string) => {
    e.preventDefault();
    if (!draggingRoomId || draggingRoomId === targetRoomId) return;

    setRooms((prev) => {
      const fromIndex = prev.findIndex((r) => r.id === draggingRoomId);
      const toIndex = prev.findIndex((r) => r.id === targetRoomId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleCardDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggingRoomId) return;
    setDraggingRoomId(null);
    if (rooms.length === 0) return;
    await persistRoomOrder(rooms);
  };

  const handleDropOnAddCard = async (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!draggingRoomId) return;

    const updated = (() => {
      const current = [...rooms];
      const fromIndex = current.findIndex((r) => r.id === draggingRoomId);
      if (fromIndex === -1) return current;
      const [moved] = current.splice(fromIndex, 1);
      current.push(moved);
      return current;
    })();

    setRooms(updated);
    setDraggingRoomId(null);
    await persistRoomOrder(updated);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (date: Date) => {
    const clicked = startOfDay(date);

    if (!selectedStartDate || selectedEndDate) {
      setSelectedStartDate(clicked);
      setSelectedEndDate(null);
      return;
    }

    const start = startOfDay(selectedStartDate);
    if (isSameDay(clicked, start)) {
      setSelectedEndDate(null);
      return;
    }

    if (clicked < start) {
      setSelectedStartDate(clicked);
      setSelectedEndDate(start);
    } else {
      setSelectedEndDate(clicked);
    }
  };

  const isInSelectedRange = (date: Date) => {
    const day = startOfDay(date);
    const start = startOfDay(selectedStartDate);

    if (!selectedEndDate || isSameDay(start, selectedEndDate)) {
      return isSameDay(day, start);
    }

    const end = startOfDay(selectedEndDate);
    const min = Math.min(start.getTime(), end.getTime());
    const max = Math.max(start.getTime(), end.getTime());
    const t = day.getTime();
    return t >= min && t <= max;
  };

  const getPreviewPrice = (room: Room) => {
    if (!selectedStartDate) {
      const allDayUsePrices = daysOfWeek.map((day) => room.prices[day].dayUsePrice);
      return Math.min(...allDayUsePrices);
    }

    // 하루 선택 또는 동일 날짜 범위: 대실 가격
    if (!selectedEndDate || isSameDay(selectedStartDate, selectedEndDate)) {
      return getDayUsePriceForDate(room, selectedStartDate);
    }

    // 서로 다른 날짜 범위: 숙박 합계
    const { total } = getStayPriceForSelection(room, selectedStartDate, selectedEndDate);
    return total;
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
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">객실 관리</h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCalendarOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5m8 2V5m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>날짜 선택</span>
            </button>
            {isCalendarOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-medium text-gray-900">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-7 text-[11px] font-medium text-center text-gray-500 mb-1">
                  <div>월</div>
                  <div>화</div>
                  <div>수</div>
                  <div>목</div>
                  <div>금</div>
                  <div className="text-blue-600">토</div>
                  <div className="text-red-600">일</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-[11px]">
                  {getMonthGrid(currentMonth).map((date) => {
                    const isCurrentMonth =
                      date.getMonth() === currentMonth.getMonth() &&
                      date.getFullYear() === currentMonth.getFullYear();
                    const isToday = isSameDay(startOfDay(date), startOfDay(new Date()));
                    const inRange = isInSelectedRange(date);

                    const baseClasses =
                      'border rounded-md px-1.5 py-1 cursor-pointer flex flex-col items-center justify-center transition-colors';
                    const bg = inRange
                      ? 'border-blue-500 bg-blue-50'
                      : isCurrentMonth
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50 text-gray-400';

                    return (
                      <button
                        type="button"
                        key={date.toISOString()}
                        className={`${baseClasses} ${bg}`}
                        onClick={() => handleDateClick(date)}
                      >
                        <span
                          className={`text-[11px] font-semibold ${
                            isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-start items-center text-[11px] text-gray-600">
                  <span>{getSelectionSummaryText(selectedStartDate, selectedEndDate)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const price = getPreviewPrice(room);
            const rate = clampRate(room.discountRate ?? 0);
            const discountedPrice = rate > 0 ? Math.round(price * (1 - rate / 100)) : price;
            const { sold, remaining } = getRoomDailyUsage(room, reservations, selectedStartDate);
            const remainingBadgeClass =
              remaining > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700';
            return (
              <div
                key={room.id}
                draggable
                onDragStart={() => handleDragStart(room.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleCardDragOver(e, room.id)}
                onDrop={handleCardDrop}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 ${
                  draggingRoomId === room.id ? 'ring-2 ring-blue-400 ring-offset-2' : ''
                }`}
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
                  <div className="px-4 text-base font-semibold text-gray-900 flex items-center justify-between gap-2">
                    <span className="truncate">{room.type}</span>
                  </div>

                  {/* 재고/판매 배지 */}
                  <div className="px-4 mt-1 flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5" />
                      판매
                      <span className="ml-1 font-semibold">{sold}</span>
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${remainingBadgeClass}`}>
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
                      잔여
                      <span className="ml-1 font-semibold">{remaining}</span>
                      <span className="ml-1 text-[10px] opacity-70">(총 {room.inventory})</span>
                    </span>
                  </div>

                  {/* 가격/할인 */}
                  <div className="px-4 mt-2 flex items-baseline gap-2">
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

          {/* 객실 미리보기 카드들 뒤에 '객실 추가' 카드형 버튼 */}
          <button
            type="button"
            onClick={handleAdd}
            onDragOver={(e) => {
              if (!draggingRoomId) return;
              e.preventDefault();
            }}
            onDrop={handleDropOnAddCard}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 hover:bg-gray-100 hover:border-blue-400 transition-colors text-gray-500 py-8"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-800">새 객실 추가</div>
              <div className="mt-1 text-xs text-gray-500">새로운 객실 타입을 등록해보세요.</div>
            </div>
          </button>
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
