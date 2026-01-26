'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * 예약 상세 페이지 리다이렉트
 * /reservations/[id] -> /admin/reservation/[id]
 */
export default function ReservationRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;

  useEffect(() => {
    // 올바른 경로로 리다이렉트
    router.replace(`/admin/reservation/${reservationId}`);
  }, [reservationId, router]);

  return (
    <div className="min-h-screen bg-[#abc1d1] flex items-center justify-center">
      <div className="text-lg text-gray-700">리다이렉트 중...</div>
    </div>
  );
}
