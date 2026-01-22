'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { Room, Reservation, ChatHistory } from '@/types';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalReservations: 0,
    todayReservations: 0,
    recentChats: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [roomsRes, reservationsRes, chatHistoriesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/reservations'),
        fetch('/api/chat-histories'),
      ]);

      const rooms: Room[] = await roomsRes.json();
      const reservations: Reservation[] = await reservationsRes.json();
      const chatHistories: ChatHistory[] = await chatHistoriesRes.json();

      const today = new Date().toDateString();
      const todayReservations = reservations.filter(
        (res) => new Date(res.checkIn).toDateString() === today
      );

      setStats({
        totalRooms: rooms.length,
        totalReservations: reservations.length,
        todayReservations: todayReservations.length,
        recentChats: chatHistories.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const statCards = [
    { label: '전체 객실', value: stats.totalRooms, href: '/rooms', color: 'bg-blue-500' },
    { label: '전체 예약', value: stats.totalReservations, href: '/reservations', color: 'bg-purple-500' },
    { label: '오늘 체크인', value: stats.todayReservations, href: '/reservations', color: 'bg-orange-500' },
    { label: '최근 대화', value: stats.recentChats, href: '/chat-histories', color: 'bg-pink-500' },
  ];

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">대시보드</h1>
        
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${card.color} rounded-md p-3`}>
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.label}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 링크</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/rooms"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">객실 관리</h3>
              <p className="text-sm text-gray-500 mt-1">객실 추가 및 수정</p>
            </Link>
            <Link
              href="/reservations"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">예약 관리</h3>
              <p className="text-sm text-gray-500 mt-1">예약 확인 및 관리</p>
            </Link>
            <Link
              href="/chatbot-messages"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">챗봇 멘트</h3>
              <p className="text-sm text-gray-500 mt-1">응답 메시지 관리</p>
            </Link>
            <Link
              href="/chat-histories"
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-gray-900">대화 내역</h3>
              <p className="text-sm text-gray-500 mt-1">고객 대화 조회</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

