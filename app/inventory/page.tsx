'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import type { Reservation, ReservationStatus, Room, DayOfWeek, ReservationType } from '@/types';

type InventorySummary = {
  dateKey: string;
  totalInventory: number;
  sold: number;
  remaining: number;
};

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

const EFFECTIVE_STATUSES: ReservationStatus[] = ['pending', 'confirmed'];

const PRESET_TYPE_COLORS: { label: string; className: string }[] = [
  // 기본 직관적 색 이름 (일반 타입의 연회색은 제외)
  { label: '초록', className: 'bg-emerald-100 text-emerald-800' },
  { label: '파랑', className: 'bg-sky-100 text-sky-800' },
  { label: '보라', className: 'bg-violet-100 text-violet-800' },
  { label: '빨강', className: 'bg-rose-100 text-rose-800' },
  { label: '주황', className: 'bg-orange-100 text-orange-800' },
  { label: '노랑', className: 'bg-amber-100 text-amber-800' },
  { label: '남색', className: 'bg-slate-100 text-slate-800' },
  { label: '청록', className: 'bg-teal-100 text-teal-800' },
  { label: '남보라', className: 'bg-indigo-100 text-indigo-800' },
  { label: '진회색', className: 'bg-zinc-100 text-zinc-800' },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function parseISODate(dateString: string): Date {
  // date-only 문자열도 들어올 수 있으므로 Date 생성만 공통으로 처리
  return startOfDay(new Date(dateString));
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

function calculateTotalPrice(room: Room, checkIn: string, checkOut: string): number {
  const start = parseISODate(checkIn);
  const end = parseISODate(checkOut);
  if (end <= start) return 0;

  let total = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const key = getDayOfWeekKey(d);
    total += room.prices[key].stayPrice;
  }
  return total;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatKoreanDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

function getDailyInventorySummary(
  rooms: Room[],
  reservations: Reservation[],
  date: Date
): InventorySummary {
  const effectiveReservations = getEffectiveReservationsForDate(reservations, date).filter(
    (r) => r.status === 'confirmed'
  );

  const totalInventory = rooms.reduce((sum, room) => sum + (room.inventory ?? 0), 0);

  // 객실 타입별로 재고를 나눠 쓰지만, 달력에는 단순 합계를 보여준다.
  const sold = effectiveReservations.length;
  const remaining = Math.max(0, totalInventory - sold);

  return {
    dateKey: toDateKey(date),
    totalInventory,
    sold,
    remaining,
  };
}

function getRoomDailyUsage(
  room: Room,
  reservations: Reservation[],
  date: Date
): { sold: number; remaining: number } {
  const effectiveReservations = getEffectiveReservationsForDate(reservations, date)
    .filter((r) => r.roomId === room.id && r.status === 'confirmed');
  const sold = effectiveReservations.length;
  const remaining = Math.max(0, room.inventory - sold);
  return { sold, remaining };
}

function toISODateFromInput(value: string | null): string | null {
  if (!value) return null;
  // YYYY-MM-DD 형식을 로컬 기준 자정으로 변환
  return new Date(value + 'T00:00:00').toISOString();
}

export default function InventoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationTypes, setReservationTypes] = useState<ReservationType[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  const [creating, setCreating] = useState(false);
  const [createRoomId, setCreateRoomId] = useState<string>('');
  const [createReservationTypeId, setCreateReservationTypeId] = useState<string>('');
  const [createCheckIn, setCreateCheckIn] = useState<string>('');
  const [createCheckOut, setCreateCheckOut] = useState<string>('');
  const [createMemo, setCreateMemo] = useState<string>('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState(PRESET_TYPE_COLORS[0]?.className ?? '');
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, reservationsRes, typesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/reservations'),
        fetch('/api/reservation-types'),
      ]);
      const roomsData: Room[] = await roomsRes.json();
      const reservationsData: Reservation[] = await reservationsRes.json();
      const typesData: ReservationType[] = await typesRes.json();
      setRooms(roomsData);
      setReservations(reservationsData);
      setReservationTypes(typesData);

      // 기본 타입 "일반"을 기본 선택으로 맞추기
      if (!createReservationTypeId) {
        const defaultType = typesData.find((t) => t.id === 'default');
        if (defaultType) {
          setCreateReservationTypeId(defaultType.id);
        }
      }

      if (selectedDate == null) {
        setSelectedDate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthDays = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);

  const monthlySummaryMap = useMemo(() => {
    const map = new Map<string, InventorySummary>();
    monthDays.forEach((date) => {
      const summary = getDailyInventorySummary(rooms, reservations, date);
      map.set(summary.dateKey, summary);
    });
    return map;
  }, [monthDays, rooms, reservations]);

  useEffect(() => {
    if (selectedDate) {
      const key = toDateKey(selectedDate);
      // 선택한 날짜가 현재 월이 아니면 해당 월로 이동
      if (
        selectedDate.getFullYear() !== currentMonth.getFullYear() ||
        selectedDate.getMonth() !== currentMonth.getMonth()
      ) {
        setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      }
      // 기본 입력값 세팅
      const ymd = key;
      setCreateCheckIn(ymd);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setCreateCheckOut(toDateKey(nextDay));
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const selectedDateReservations = useMemo(() => {
    if (!selectedDate) return [];
    return getEffectiveReservationsForDate(reservations, selectedDate);
  }, [reservations, selectedDate]);

  const selectedDateRoomUsages = useMemo(() => {
    if (!selectedDate) return [];
    return rooms.map((room) => ({
      room,
      ...getRoomDailyUsage(room, reservations, selectedDate),
    }));
  }, [rooms, reservations, selectedDate]);

  const formatStatusLabel = (status: ReservationStatus) => statusLabels[status] ?? status;

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    setActionLoadingId(id + ':' + newStatus);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        alert('상태 변경에 실패했습니다.');
        return;
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteManualReservation = async (reservation: Reservation) => {
    if (reservation.source !== 'manual') return;
    if (!confirm('이 수기 예약을 완전히 삭제하시겠습니까?')) return;

    setActionLoadingId(reservation.id + ':delete');
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        alert('삭제에 실패했습니다.');
        return;
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      alert('삭제에 실패했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomId || !createCheckIn || !createCheckOut) {
      alert('객실, 체크인, 체크아웃을 모두 선택해주세요.');
      return;
    }

    if (!createReservationTypeId) {
      alert('예약 타입을 선택해주세요.');
      return;
    }

    const room = rooms.find((r) => r.id === createRoomId);
    if (!room) {
      alert('객실 정보를 찾을 수 없습니다.');
      return;
    }

    const checkInISO = toISODateFromInput(createCheckIn);
    const checkOutISO = toISODateFromInput(createCheckOut);
    if (!checkInISO || !checkOutISO) {
      alert('날짜 형식이 올바르지 않습니다.');
      return;
    }

    const start = parseISODate(checkInISO);
    const rawEnd = parseISODate(checkOutISO);
    if (rawEnd < start) {
      alert('체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다.');
      return;
    }

    // 날짜 범위 계산용 endExclusive: 숙박은 체크아웃 전날까지, 대실(같은 날짜)은 그 날 하루만
    const endExclusive = new Date(rawEnd);
    if (endExclusive.getTime() === start.getTime()) {
      endExclusive.setDate(endExclusive.getDate() + 1);
    }

    // 프론트에서 한 번 더 재고 체크 (서버에서도 막고 있음)
    const existingReservationsForRoom = reservations.filter(
      (r) => r.roomId === room.id && EFFECTIVE_STATUSES.includes(r.status)
    );
    for (let d = new Date(start); d < endExclusive; d.setDate(d.getDate() + 1)) {
      const dayStart = startOfDay(d);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const sold = existingReservationsForRoom.filter((r) => {
        const resStart = parseISODate(r.checkIn);
        const resEndRaw = parseISODate(r.checkOut);
        const resEnd = new Date(resEndRaw);
        if (resEnd.getTime() === resStart.getTime()) {
          resEnd.setDate(resEnd.getDate() + 1);
        }
        return resStart < dayEnd && resEnd > dayStart;
      }).length;
      if (sold >= room.inventory) {
        alert('선택한 기간 중 어떤 날은 이미 재고가 가득 찼습니다. 다른 객실이나 날짜를 선택해주세요.');
        return;
      }
    }

    const totalPrice = calculateTotalPrice(room, checkInISO, checkOutISO);

    setCreating(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          guestName: '관리자 수기 예약',
          guestPhone: '',
          checkIn: checkInISO,
          checkOut: checkOutISO,
          status: 'confirmed',
          totalPrice,
          source: 'manual',
          reservationTypeId: createReservationTypeId,
          adminMemo: createMemo || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? '예약 생성에 실패했습니다.');
        return;
      }

      setCreateMemo('');
      setCreateReservationTypeId('');
      await fetchData();
      alert('수기 예약이 추가되었습니다.');
    } catch (error) {
      console.error(error);
      alert('예약 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveReservationType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypeColor.trim()) {
      alert('예약 타입 이름과 색상을 모두 입력해주세요.');
      return;
    }
    setTypeSubmitting(true);
    try {
      const payload = { name: newTypeName.trim(), color: newTypeColor.trim() };
      const res = await fetch(
        editingTypeId ? `/api/reservation-types/${editingTypeId}` : '/api/reservation-types',
        {
          method: editingTypeId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? '예약 타입 생성에 실패했습니다.');
        return;
      }
      setNewTypeName('');
      setNewTypeColor(PRESET_TYPE_COLORS[0]?.className ?? '');
      setEditingTypeId(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('예약 타입 생성에 실패했습니다.');
    } finally {
      setTypeSubmitting(false);
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

  const monthTitle = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">재고 관리</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 달력 */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <span className="sr-only">이전 달</span>
                  ‹
                </button>
                <h2 className="text-lg font-semibold text-gray-900">{monthTitle}</h2>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <span className="sr-only">다음 달</span>
                  ›
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(today);
                }}
                className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                오늘로 이동
              </button>
            </div>

            <div className="grid grid-cols-7 text-xs font-medium text-center text-gray-500 mb-2">
              <div className="py-1">월</div>
              <div className="py-1">화</div>
              <div className="py-1">수</div>
              <div className="py-1">목</div>
              <div className="py-1">금</div>
              <div className="py-1 text-blue-600">토</div>
              <div className="py-1 text-red-600">일</div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs">
              {monthDays.map((date) => {
                const key = toDateKey(date);
                const summary = monthlySummaryMap.get(key);
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth() &&
                  date.getFullYear() === currentMonth.getFullYear();
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                const baseClasses =
                  'border rounded-md px-1.5 py-1.5 cursor-pointer flex flex-col gap-0.5 transition-colors';
                const bg =
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isCurrentMonth
                      ? 'border-gray-200 hover:bg-gray-50'
                      : 'border-gray-100 bg-gray-50 text-gray-400';

                const isToday = isSameDay(date, new Date());

                return (
                  <button
                    type="button"
                    key={key + date.getDate()}
                    className={`${baseClasses} ${bg}`}
                    onClick={() => setSelectedDate(new Date(date))}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {isToday && (
                        <span className="inline-flex items-center px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                          오늘
                        </span>
                      )}
                    </div>
                    {summary && summary.totalInventory > 0 && (
                      <div className="mt-0.5 text-[10px] leading-tight text-left">
                        <div className="text-gray-700">
                          판매{' '}
                          <span className="font-semibold">
                            {summary.sold}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          잔여{' '}
                          <span className="font-semibold">
                            {summary.remaining}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {' '}
                            / 총 {summary.totalInventory}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 우측 패널: 선택 날짜 상세 + 수기 예약 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">선택한 날짜</h2>
                <span className="text-sm text-gray-500">
                  {selectedDate ? formatKoreanDate(selectedDate) : '날짜를 선택해주세요'}
                </span>
              </div>

              {selectedDate && (
                <>
                  <div className="space-y-2 mb-4">
                    {selectedDateRoomUsages.map(({ room, sold, remaining }) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="text-gray-800 font-medium">{room.type}</div>
                        <div className="text-gray-600">
                          판매{' '}
                          <span className="font-semibold">{sold}</span>
                          <span className="mx-1 text-gray-400">/</span>
                          잔여{' '}
                          <span className="font-semibold">{remaining}</span>
                          <span className="ml-1 text-xs text-gray-400">
                            (총 {room.inventory})
                          </span>
                        </div>
                      </div>
                    ))}
                    {rooms.length === 0 && (
                      <div className="text-sm text-gray-500">등록된 객실이 없습니다.</div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">예약 목록</h3>
                      <span className="text-xs text-gray-500">
                        {selectedDateReservations.length}건
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedDateReservations.map((reservation) => {
                        const room = rooms.find((r) => r.id === reservation.roomId);
                        const isManual = reservation.source === 'manual';
                        const type = isManual
                          ? reservationTypes.find((t) => t.id === reservation.reservationTypeId)
                          : null;
                        return (
                          <div
                            key={reservation.id}
                            className="border border-gray-200 rounded-md px-3 py-2 text-xs bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-900">
                                  {room ? room.type : '객실 정보 없음'}
                                </span>
                                {reservation.source === 'kakao' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-semibold">
                                    카톡
                                  </span>
                                )}
                                {isManual && (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      type?.color ?? 'bg-purple-100 text-purple-800'
                                    }`}
                                  >
                                    {type?.name ?? '수기'}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full font-medium text-[10px] ${statusColors[reservation.status]}`}
                              >
                                {formatStatusLabel(reservation.status)}
                              </span>
                            </div>
                            <div className="text-gray-700">
                              <span className="font-medium">
                                {reservation.guestName || (isManual ? '관리자 수기 예약' : '고객')}
                              </span>
                              {reservation.guestPhone && (
                                <span className="text-gray-500 ml-1">{reservation.guestPhone}</span>
                              )}
                            </div>
                            {reservation.adminMemo && (
                              <div className="mt-1 text-gray-500 line-clamp-2">
                                메모: {reservation.adminMemo}
                              </div>
                            )}
                            <div className="mt-1 flex items-center justify-between">
                              <div className="text-gray-500">
                                {new Date(reservation.checkIn).toLocaleDateString('ko-KR', {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}{' '}
                                ~{' '}
                                {new Date(reservation.checkOut).toLocaleDateString('ko-KR', {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                {reservation.status === 'pending' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                                      disabled={actionLoadingId !== null}
                                      className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      확정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(reservation.id, 'rejected')}
                                      disabled={actionLoadingId !== null}
                                      className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] hover:bg-gray-300 disabled:opacity-50"
                                    >
                                      거절
                                    </button>
                                  </>
                                )}
                                {reservation.source === 'kakao' && reservation.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatusChange(reservation.id, 'cancelled_by_admin')
                                    }
                                    disabled={actionLoadingId !== null}
                                    className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-700 disabled:opacity-50"
                                  >
                                    관리자 취소
                                  </button>
                                )}
                                {isManual && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteManualReservation(reservation)}
                                    disabled={actionLoadingId !== null}
                                    className="px-1.5 py-0.5 rounded border border-gray-300 text-gray-600 text-[10px] hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {selectedDateReservations.length === 0 && (
                        <div className="text-xs text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-md">
                          이 날짜에는 예약이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 수기 예약 추가 폼 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">수기 예약 추가</h2>
              <form onSubmit={handleCreateReservation} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700">예약 타입</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewTypeForm(true);
                          setEditingTypeId(null);
                          setNewTypeName('');
                          setNewTypeColor(PRESET_TYPE_COLORS[0]?.className ?? '');
                        }}
                        className="px-2 py-0.5 text-[11px] border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        타입 추가
                      </button>
                      <button
                        type="button"
                        disabled={!createReservationTypeId || createReservationTypeId === 'default'}
                        onClick={() => {
                          const target = reservationTypes.find((t) => t.id === createReservationTypeId);
                          if (!target) return;
                          setEditingTypeId(target.id);
                          setNewTypeName(target.name);
                          setNewTypeColor(target.color);
                          setShowNewTypeForm(true);
                        }}
                        className="px-2 py-0.5 text-[11px] border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        수정
                      </button>
                    </div>
                  </div>
                  <select
                    value={createReservationTypeId}
                    onChange={(e) => setCreateReservationTypeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">예약 타입을 선택하세요</option>
                    {reservationTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {reservationTypes.length === 0 && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      먼저 자주 쓰는 수기 예약 유형을 하나 추가해 주세요.
                    </p>
                  )}
                  {showNewTypeForm && (
                    <form
                      onSubmit={handleSaveReservationType}
                      className="mt-2 border border-dashed border-gray-200 rounded-md p-2 space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                          placeholder="이름 (예: 전화, OTA)"
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        아래에서 예약 타입 배지 색상을 선택하세요.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_TYPE_COLORS.map((c) => {
                          const selected = newTypeColor === c.className;
                          return (
                            <button
                              key={c.className}
                              type="button"
                              onClick={() => setNewTypeColor(c.className)}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.className} ${
                                selected ? 'ring-2 ring-offset-1 ring-gray-900/50' : ''
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewTypeForm(false);
                            setNewTypeName('');
                            setNewTypeColor(PRESET_TYPE_COLORS[0]?.className ?? '');
                            setEditingTypeId(null);
                          }}
                          className="px-3 py-1 border border-gray-300 text-xs rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={typeSubmitting}
                          className="px-3 py-1 bg-gray-800 text-white text-xs font-medium rounded-md hover:bg-gray-900 disabled:opacity-50"
                        >
                          {typeSubmitting ? '저장 중...' : editingTypeId ? '타입 수정' : '타입 추가'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">객실 타입</label>
                  <select
                    value={createRoomId}
                    onChange={(e) => setCreateRoomId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    required
                  >
                    <option value="">객실을 선택하세요</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.type} (총 {room.inventory})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">체크인</label>
                    <input
                      type="date"
                      value={createCheckIn}
                      onChange={(e) => setCreateCheckIn(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">체크아웃</label>
                    <input
                      type="date"
                      value={createCheckOut}
                      onChange={(e) => setCreateCheckOut(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">메모</label>
                  <textarea
                    value={createMemo}
                    onChange={(e) => setCreateMemo(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    placeholder="예: OTA 예약, 전화 예약 등"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? '추가 중...' : '수기 예약 추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

