'use client';

import type React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getEffectiveReservationsForDate, formatStayLabel } from '@/lib/reservation-utils';
import type { Reservation, ReservationStatus, ReservationType, Room } from '@/types';

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

type DashboardMetrics = {
  todayCheckins: number;
  todayCheckouts: number;
  occupancyRate: number; // 0~100
  todayNewReservations: number;
  todayCancellations: number;
  todayRevenue: number; // 원화
  noShowRiskCount: number;
};

type KpiCardProps = {
  label: string;
  value: string;
  diff?: string;
  variant?: 'default' | 'warning' | 'success';
};

function KpiCard({ label, value, diff, variant = 'default' }: KpiCardProps) {
  const color =
    variant === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : variant === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-gray-200 bg-white';

  return (
    <div className={`flex flex-col justify-between rounded-lg border ${color} p-4 shadow-sm`}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {diff && <div className="mt-1 text-xs text-gray-500">{diff}</div>}
    </div>
  );
}

function KpiRow({ metrics }: { metrics: DashboardMetrics }) {
  const kpis: KpiCardProps[] = [
    { label: '오늘 체크인', value: `${metrics.todayCheckins}건` },
    { label: '오늘 체크아웃', value: `${metrics.todayCheckouts}건` },
    { label: '현재 객실 점유율', value: `${metrics.occupancyRate}%` },
    {
      label: '오늘 신규 예약 / 취소',
      value: `${metrics.todayNewReservations} / ${metrics.todayCancellations}`,
    },
    {
      label: '오늘 예상 객실 매출',
      value: `₩ ${metrics.todayRevenue.toLocaleString()}`,
    },
    { label: '확인 필요한 예약', value: `${metrics.noShowRiskCount}건`, variant: 'warning' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}

type TodayReservationsProps = {
  reservations: Reservation[];
  rooms: Room[];
  reservationTypes: ReservationType[];
};

function TodayReservations({ reservations, rooms, reservationTypes }: TodayReservationsProps) {
  const hasItems = reservations.length > 0;
  const formatStatusLabel = (status: ReservationStatus) => statusLabels[status] ?? status;

  const totalRooms = rooms.reduce((sum, room) => sum + (room.inventory ?? 0), 0);
  const usedRooms = reservations.length;

  const roomStats = rooms
    .map((room) => {
      const sold = reservations.filter((r) => r.roomId === room.id).length;
      const remaining = (room.inventory ?? 0) - sold;
      return {
        room,
        sold,
        remaining,
      };
    })
    .filter((stat) => stat.sold > 0 || (stat.room.inventory ?? 0) > 0)
    .sort((a, b) => {
      const orderA = a.room.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.room.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.room.type.localeCompare(b.room.type);
    });

  return (
    <div className="rounded-lg bg-white p-4 shadow sm:rounded-lg">
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">오늘 예약 목록</h2>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          오늘{' '}
          <span className="font-semibold text-gray-900">
            {usedRooms.toLocaleString()}개
          </span>
          <span className="mx-0.5 text-gray-400">/</span>
          <span className="text-gray-600">
            {totalRooms.toLocaleString()}개
          </span>{' '}
          객실 사용 중
        </p>
      </div>
      {roomStats.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {roomStats.map(({ room, sold, remaining }) => (
            <div
              key={room.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1"
            >
              <span className="text-[11px] font-medium text-slate-800">
                {room.type}
              </span>
              <span className="text-[11px] text-slate-400">·</span>
              <span className="text-[11px] text-slate-600">
                판매 {sold} / 잔여 {Math.max(0, remaining)}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasItems ? (
        <ul className="space-y-2">
          {reservations.map((reservation) => {
            const room = rooms.find((r) => r.id === reservation.roomId);
            const isManual = reservation.source === 'manual';
            const type = isManual
              ? reservationTypes.find((t) => t.id === reservation.reservationTypeId)
              : null;
            const guestName =
              reservation.guestName || (isManual ? '관리자 수기 예약' : '고객');
            const stayLabel = formatStayLabel(reservation.checkIn, reservation.checkOut);
            return (
              <li key={reservation.id}>
                <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50/80">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                      <span className="truncate text-gray-900">
                        {room?.type ?? '객실 정보 없음'}
                      </span>
                      {reservation.source === 'kakao' && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700">
                          카톡
                        </span>
                      )}
                      {isManual && type && (
                        <span
                          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            type.color ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {type.name ?? '수기'}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 truncate">
                      {[
                        stayLabel,
                        reservation.guestPhone,
                        reservation.adminMemo,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[reservation.status]}`}
                  >
                    {formatStatusLabel(reservation.status)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-6 text-center text-xs text-gray-400">
          오늘 예정된 예약이 없습니다.
        </div>
      )}
    </div>
  );
}

type CardShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

function CardShell({ title, description, children }: CardShellProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow sm:rounded-lg">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ReservationTrendCard() {
  return (
    <CardShell
      title="예약 추이"
      description="선택한 기간 동안 일별 예약/취소 건수입니다."
    >
      {/* TODO: 차트 라이브러리 연동 */}
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
        예약 추이 차트 영역
      </div>
    </CardShell>
  );
}

function OccupancyAdrCard() {
  return (
    <CardShell
      title="점유율 & 평균 객실 단가"
      description="점유율(막대)과 ADR(라인)을 함께 봅니다."
    >
      <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
        점유율 / ADR 차트 영역
      </div>
    </CardShell>
  );
}

function ChannelShareCard() {
  return (
    <CardShell
      title="판매 채널 비중"
      description="직예약, OTA 등 채널별 예약 비중입니다."
    >
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
        채널별 도넛 차트 영역
      </div>
    </CardShell>
  );
}

function RoomTypePerformanceCard() {
  return (
    <CardShell
      title="객실 타입별 실적"
      description="객실 타입별 예약/매출 비교입니다."
    >
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
        객실 타입별 바 차트 영역
      </div>
    </CardShell>
  );
}

type TodoItem = {
  type: string;
  title: string;
  due: string;
  room?: string;
};

function TodoAlertsCard() {
  const todos: TodoItem[] = [
    { type: '요청', title: '조기 체크인 승인 필요', due: '오늘', room: '201호' },
    { type: '점검', title: '101호 객실 점검 (클레임 이력)', due: '오늘', room: '101호' },
  ];

  return (
    <CardShell
      title="지금 확인해야 할 내역"
      description="오늘 기준으로 처리해야 할 요청/점검/결제 내역입니다."
    >
      <ul className="divide-y divide-gray-100">
        {todos.map((t) => (
          <li key={`${t.type}-${t.title}`} className="flex items-center gap-3 py-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
              {t.type}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500">
                {t.room && <span>{t.room} · </span>}
                마감: {t.due}
              </p>
            </div>
            <button
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
              type="button"
            >
              상세
            </button>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

type QuickLink = {
  label: string;
  href: string;
};

function QuickLinksCard() {
  const links: QuickLink[] = [
    { label: '새 예약 등록', href: '/reservations?mode=create' },
    { label: '예약 검색', href: '/reservations' },
    { label: '오늘 체크인 리스트', href: '/reservations?filter=today_checkin' },
    { label: '객실 현황', href: '/rooms' },
    { label: '요금 / 프로모션 설정', href: '/pricing' },
    { label: '알림톡 / 메시지 관리', href: '/chatbot-messages' },
  ];

  return (
    <CardShell title="빠른 링크">
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center justify-center rounded-md bg-gray-50 px-2 py-3 text-center text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            {link.label}
          </a>
        ))}
      </div>
    </CardShell>
  );
}

function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDateString(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string | Date, b: string | Date) {
  return toDateString(a) === toDateString(b);
}

function calculateMetrics(reservations: Reservation[], rooms: Room[]): DashboardMetrics {
  const today = getTodayDateString();

  const confirmed = reservations.filter((r) => r.status === 'confirmed');

  const todayCheckins = confirmed.filter((r) => isSameDay(r.checkIn, today)).length;
  const todayCheckouts = confirmed.filter((r) => isSameDay(r.checkOut, today)).length;

  const totalRooms = rooms.length || 1;
  const occupiedRoomIds = new Set(
    confirmed
      .filter((r) => {
        const checkIn = toDateString(r.checkIn);
        const checkOut = toDateString(r.checkOut);
        return checkIn <= today && today < checkOut;
      })
      .map((r) => r.roomId),
  );
  const occupancyRate = Math.round((occupiedRoomIds.size / totalRooms) * 100);

  const todayNewReservations = reservations.filter((r) =>
    isSameDay(r.createdAt, today),
  ).length;

  const todayCancellations = reservations.filter(
    (r) =>
      (r.status === 'cancelled_by_guest' || r.status === 'cancelled_by_admin') &&
      isSameDay(r.createdAt, today),
  ).length;

  const todayRevenue = confirmed
    .filter((r) => isSameDay(r.checkIn, today))
    .reduce((sum, r) => sum + (r.totalPrice ?? 0), 0);

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const unconfirmedGuestCancels = reservations.filter(
    (r) => r.status === 'cancelled_by_guest' && !r.guestCancellationConfirmed,
  ).length;

  return {
    todayCheckins,
    todayCheckouts,
    occupancyRate,
    todayNewReservations,
    todayCancellations,
    todayRevenue,
    noShowRiskCount: pendingCount + unconfirmedGuestCancels,
  };
}

function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservationTypes, setReservationTypes] = useState<ReservationType[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setReservations(reservationsData);
        setRooms(roomsData);
        setReservationTypes(typesData);
        setMetrics(calculateMetrics(reservationsData, roomsData));
        setTodayReservations(getEffectiveReservationsForDate(reservationsData, new Date()));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isReady = !loading && metrics !== null;

  return (
    <Layout>
      <div className="space-y-6 px-4 py-6 sm:px-0">
        <header>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500">
            오늘 호텔 상태와 예약 통계를 한눈에 확인하세요.
          </p>
        </header>

        {/* 상단: KPI + 오늘 예약 목록 / 빠른 링크 */}
        <section className="space-y-4">
          {isReady ? (
            <>
              <KpiRow metrics={metrics} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <TodayReservations
                    reservations={todayReservations}
                    rooms={rooms}
                    reservationTypes={reservationTypes}
                  />
                </div>
                <div>
                  <QuickLinksCard />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
              대시보드 데이터를 불러오는 중입니다...
            </div>
          )}
        </section>

        {/* 통계/차트 영역 */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <ReservationTrendCard />
            <OccupancyAdrCard />
          </div>
          <div className="space-y-6">
            <ChannelShareCard />
            <RoomTypePerformanceCard />
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default DashboardPage;

