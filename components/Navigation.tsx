'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '대시보드' },
  { href: '/rooms', label: '객실 관리' },
  { href: '/reservations', label: '예약 관리' },
  { href: '/chatbot-messages', label: '챗봇 멘트' },
  { href: '/chat-histories', label: '대화 내역' },
  { href: '/kakao-event-test', label: '이벤트 API 테스트' },
  { href: '/notifications', label: '알림 목록' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold">호텔 관리 시스템</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? 'border-white text-white'
                      : 'border-transparent text-blue-100 hover:border-blue-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* 모바일 메뉴 */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === item.href
                  ? 'bg-blue-700 border-white text-white'
                  : 'border-transparent text-blue-100 hover:bg-blue-700 hover:border-blue-300 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

