'use client';

import type React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
  variant?: 'default' | 'success' | 'warning';
  href?: string;
};

function KpiCard({ label, value, diff, variant = 'default', href }: KpiCardProps) {
  const color =
    variant === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : variant === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-gray-200 bg-white';

  const content = (
    <div
      className={`flex h-full flex-col justify-between rounded-lg border ${color} p-4 shadow-sm ${
        href ? 'transition hover:-translate-y-0.5 hover:shadow-md' : ''
      }`}
    >
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {diff && <div className="mt-1 text-xs text-gray-500">{diff}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full">
        {content}
      </a>
    );
  }

  return content;
}

function KpiRow({ metrics }: { metrics: DashboardMetrics }) {
  const kpis: KpiCardProps[] = [
    { label: '오늘 체크인', value: `${metrics.todayCheckins}건`, href: '/reservations?filter=today_checkin' },
    { label: '오늘 체크아웃', value: `${metrics.todayCheckouts}건`, href: '/reservations?filter=today_checkout' },
    { label: '현재 객실 점유율', value: `${metrics.occupancyRate}%`, href: '/inventory' },
    {
      label: '오늘 신규 예약 / 취소',
      value: `${metrics.todayNewReservations} / ${metrics.todayCancellations}`,
      href: '/reservations',
    },
    {
      label: '오늘 예상 객실 매출',
      value: `₩ ${metrics.todayRevenue.toLocaleString()}`,
      href: '/reservations',
    },
    {
      label: '확인 필요한 예약',
      value: `${metrics.noShowRiskCount}건`,
      variant: 'warning',
      href: '/reservations',
    },
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

type ReservationTrendPoint = {
  date: string;
  total: number;
  cancelled: number;
};

type OccupancyAdrPoint = {
  date: string;
  occupancy: number;
  adr: number;
};

function ReservationTrendCard({
  data,
  loading,
  period,
  onChangePeriod,
}: {
  data: ReservationTrendPoint[];
  loading: boolean;
  period: '7d' | '30d';
  onChangePeriod: (p: '7d' | '30d') => void;
}) {
  return (
    <CardShell
      title="예약 추이"
      description="선택한 기간 동안 일별 예약/취소 건수입니다."
    >
      <div className="mb-3 flex justify-end gap-1">
        {([
          { key: '7d', label: '7일' },
          { key: '30d', label: '30일' },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChangePeriod(item.key)}
            className={`px-2 py-1 text-xs rounded-full border ${
              period === item.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          예약 추이 데이터를 불러오는 중입니다...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          표시할 예약 데이터가 없습니다.
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === 'total' ? ['예약', value] : ['취소', value]
                }
                labelFormatter={(label) => `${label}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="total"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                name="cancelled"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#colorCancelled)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

function OccupancyAdrCard({
  data,
  loading,
  period,
}: {
  data: OccupancyAdrPoint[];
  loading: boolean;
  period: '7d' | '30d';
}) {
  return (
    <CardShell
      title="점유율 & 평균 객실 단가"
      description="선택한 기간 동안 일별 점유율(%)과 ADR을 함께 봅니다."
    >
      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          점유율 / ADR 데이터를 불러오는 중입니다...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          표시할 데이터가 없습니다.
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAdr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11, fill: '#047857' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11, fill: '#4f46e5' }}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === 'occupancy'
                    ? [`${value as number}%`, '점유율']
                    : [`₩ ${(value as number).toLocaleString()}`, 'ADR']
                }
                labelFormatter={(label) => `${label} (${period === '7d' ? '7일' : '30일'} 기준)`}
                contentStyle={{ fontSize: 12 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="occupancy"
                name="occupancy"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorOcc)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="adr"
                name="adr"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorAdr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

type ChannelSharePoint = {
  name: string;
  count: number;
};

const CHANNEL_COLORS = ['#2563eb', '#16a34a', '#f97316', '#e11d48', '#7c3aed', '#0f766e'];

function ChannelShareCard({ data, loading }: { data: ChannelSharePoint[]; loading: boolean }) {
  return (
    <CardShell
      title="판매 채널 비중"
      description="최근 예약 기준 채널별 비중입니다."
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          채널별 데이터를 불러오는 중입니다...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          표시할 예약 데이터가 없습니다.
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center gap-4">
          <div className="h-full w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell
                      // eslint-disable-next-line react/no-array-index-key
                      key={`cell-${index}`}
                      fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value as number}건`, '예약 수']}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-1 text-xs">
            {data.map((item, index) => (
              <li key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
                  />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="text-gray-500">{item.count}건</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardShell>
  );
}

type RoomTypeStat = { roomType: string; count: number; revenue: number };

function RoomTypePerformanceCard({
  data,
  loading,
}: {
  data: RoomTypeStat[];
  loading: boolean;
}) {
  return (
    <CardShell
      title="객실 타입별 실적"
      description="객실 타입별 예약/매출 비교입니다."
    >
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          객실 타입별 데이터를 불러오는 중입니다...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400">
          표시할 예약 데이터가 없습니다.
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="roomType"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fontSize: 11, fill: '#6b7280' }}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === 'count'
                    ? [`${value as number}건`, '예약 수']
                    : [`₩ ${(value as number).toLocaleString()}`, '매출']
                }
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="count" name="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

type TodoItem = {
  type: string;
  title: string;
  due: string;
  room?: string;
  reservationId?: string;
};

function TodoAlertsCard({ items }: { items: TodoItem[] }) {
  const hasItems = items.length > 0;
  return (
    <CardShell
      title="지금 확인해야 할 내역"
      description="오늘 기준으로 처리해야 할 요청/점검/결제 내역입니다."
    >
      {hasItems ? (
        <ul className="divide-y divide-gray-100">
          {items.map((t) => (
            <li key={`${t.type}-${t.title}-${t.reservationId ?? ''}`} className="flex items-center gap-3 py-2">
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
              {t.reservationId ? (
                <a
                  href={`/reservations?reservationId=${encodeURIComponent(t.reservationId)}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  상세
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center text-xs text-gray-400">
          오늘 기준으로 바로 처리해야 할 내역이 없습니다.
        </div>
      )}
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

function buildTodoItems(reservations: Reservation[], rooms: Room[]): TodoItem[] {
  const today = getTodayDateString();

  const getRoomLabel = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return undefined;
    // Room 타입에 따라 필요한 필드 조합 (예: 번호 / 타입)
    return room.type ?? undefined;
  };

  const todos: TodoItem[] = [];

  // 1) 대기 중(pending) 예약 – 가장 우선
  reservations
    .filter((r) => r.status === 'pending')
    .forEach((r) => {
      const isTodayCheckIn = isSameDay(r.checkIn, today);
      todos.push({
        type: isTodayCheckIn ? '오늘 체크인 미확정' : '예약 확인',
        title: `${r.guestName} (${toDateString(r.checkIn)} ~ ${toDateString(r.checkOut)})`,
        due: isTodayCheckIn ? '오늘 체크인 전' : toDateString(r.checkIn),
        room: getRoomLabel(r.roomId),
        reservationId: r.id,
      });
    });

  // 2) 고객 취소인데 미확인(cancelled_by_guest + guestCancellationConfirmed=false)
  reservations
    .filter(
      (r) => r.status === 'cancelled_by_guest' && (r as any).guestCancellationConfirmed === false,
    )
    .forEach((r) => {
      todos.push({
        type: '고객 취소 확인',
        title: `${r.guestName} 예약 취소 확인 처리`,
        due: toDateString(r.createdAt),
        room: getRoomLabel(r.roomId),
        reservationId: r.id,
      });
    });

  // 우선순위 정렬: 오늘 마감 > 그 외, 그리고 생성일/체크인 오름차순
  const weight = (t: TodoItem) => (t.due === '오늘' || t.due === today ? 0 : 1);

  return todos
    .sort((a, b) => {
      const wa = weight(a);
      const wb = weight(b);
      if (wa !== wb) return wa - wb;
      return a.due.localeCompare(b.due);
    })
    .slice(0, 8);
}

function buildReservationTrend(
  reservations: Reservation[],
  daysRange: 7 | 30,
): ReservationTrendPoint[] {
  const today = new Date();
  const days: string[] = [];

  // 최근 N일 (과거→오늘 순)
  for (let i = daysRange - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toDateString(d));
  }

  const byDate: Record<string, ReservationTrendPoint> = {};
  days.forEach((d) => {
    byDate[d] = { date: d.slice(5), total: 0, cancelled: 0 }; // MM-DD만 표기
  });

  reservations.forEach((r) => {
    const created = toDateString(r.createdAt);
    if (byDate[created]) {
      byDate[created].total += 1;
      if (r.status === 'cancelled_by_guest' || r.status === 'cancelled_by_admin') {
        byDate[created].cancelled += 1;
      }
    }
  });

  return days.map((d) => byDate[d]);
}

function buildChannelShare(
  reservations: Reservation[],
  reservationTypes: ReservationType[],
): ChannelSharePoint[] {
  if (reservations.length === 0) return [];

  const typeMap = new Map<string, string>();
  reservationTypes.forEach((t) => {
    typeMap.set(t.id, t.name);
  });

  const counts: Record<string, number> = {};

  reservations.forEach((r) => {
    let key: string;

    if (r.source === 'kakao' || !r.source) {
      key = '카카오톡';
    } else if (r.source === 'manual' && r.reservationTypeId && typeMap.has(r.reservationTypeId)) {
      key = typeMap.get(r.reservationTypeId)!;
    } else if (r.source === 'manual') {
      key = '기타(수기)';
    } else {
      key = '기타';
    }

    counts[key] = (counts[key] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildRoomTypeStats(
  reservations: Reservation[],
  rooms: Room[],
  daysRange: 7 | 30,
): RoomTypeStat[] {
  if (reservations.length === 0 || rooms.length === 0) return [];

  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - daysRange + 1);
  const fromStr = toDateString(from);
  const todayStr = toDateString(today);

  const roomMap = new Map<string, Room>();
  rooms.forEach((r) => roomMap.set(r.id, r));

  const stats: Record<string, RoomTypeStat> = {};

  reservations.forEach((r) => {
    if (r.status !== 'confirmed') return;
    const checkInStr = toDateString(r.checkIn);
    if (checkInStr < fromStr || checkInStr > todayStr) return;

    const room = roomMap.get(r.roomId);
    const roomType = room?.type ?? '알 수 없음';
    if (!stats[roomType]) {
      stats[roomType] = { roomType, count: 0, revenue: 0 };
    }
    stats[roomType].count += 1;
    stats[roomType].revenue += r.totalPrice ?? 0;
  });

  return Object.values(stats).sort((a, b) => b.count - a.count);
}

function buildOccupancyAdr(
  reservations: Reservation[],
  rooms: Room[],
  daysRange: 7 | 30,
): OccupancyAdrPoint[] {
  const today = new Date();
  const days: string[] = [];

  for (let i = daysRange - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toDateString(d));
  }

  const totalRooms = rooms.length || 1;

  const byDate: Record<string, OccupancyAdrPoint & { adrSum: number; adrCount: number }> = {};
  days.forEach((d) => {
    byDate[d] = {
      date: d.slice(5),
      occupancy: 0,
      adr: 0,
      adrSum: 0,
      adrCount: 0,
    };
  });

  const confirmed = reservations.filter((r) => r.status === 'confirmed');

  confirmed.forEach((r) => {
    const checkInStr = toDateString(r.checkIn);
    const checkOutStr = toDateString(r.checkOut);
    const checkInDate = new Date(r.checkIn);
    const checkOutDate = new Date(r.checkOut);
    const nights =
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24) || 1;
    const nightlyRate = (r.totalPrice ?? 0) / nights;

    days.forEach((d) => {
      if (checkInStr <= d && d < checkOutStr) {
        const entry = byDate[d];
        // occupancy: 나중에 비율 계산을 위해 방 1개 차지했다고 가정
        entry.occupancy += 1;
        entry.adrSum += nightlyRate;
        entry.adrCount += 1;
      }
    });
  });

  return days.map((d) => {
    const entry = byDate[d];
    const occ = Math.round((entry.occupancy / totalRooms) * 100);
    const adr =
      entry.adrCount > 0 ? Math.round(entry.adrSum / entry.adrCount) : 0;
    return {
      date: entry.date,
      occupancy: isFinite(occ) ? occ : 0,
      adr: isFinite(adr) ? adr : 0,
    };
  });
}

export default function Dashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservationTypes, setReservationTypes] = useState<ReservationType[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [reservationTrend, setReservationTrend] = useState<ReservationTrendPoint[]>([]);
  const [occupancyAdr, setOccupancyAdr] = useState<OccupancyAdrPoint[]>([]);
  const [channelShare, setChannelShare] = useState<ChannelSharePoint[]>([]);
  const [roomTypeStats, setRoomTypeStats] = useState<RoomTypeStat[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '30d'>('7d');
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
        setTodoItems(buildTodoItems(reservationsData, roomsData));
        const range = trendPeriod === '7d' ? 7 : 30;
        setReservationTrend(buildReservationTrend(reservationsData, range));
        setOccupancyAdr(buildOccupancyAdr(reservationsData, roomsData, range));
        setRoomTypeStats(buildRoomTypeStats(reservationsData, roomsData, range));
        setChannelShare(buildChannelShare(reservationsData, typesData));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trendPeriod]);

  useEffect(() => {
    if (reservations.length === 0) return;
    const range = trendPeriod === '7d' ? 7 : 30;
    setReservationTrend(buildReservationTrend(reservations, range));
  }, [reservations, trendPeriod]);

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
            <ReservationTrendCard
              data={reservationTrend}
              loading={loading}
              period={trendPeriod}
              onChangePeriod={setTrendPeriod}
            />
            <OccupancyAdrCard
              data={occupancyAdr}
              loading={loading}
              period={trendPeriod}
            />
          </div>
          <div className="space-y-6">
            <ChannelShareCard data={channelShare} loading={loading} />
            <RoomTypePerformanceCard data={roomTypeStats} loading={loading} />
          </div>
        </section>
      </div>
    </Layout>
  );
}
