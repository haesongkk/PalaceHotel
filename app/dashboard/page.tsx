import { redirect } from 'next/navigation';

/**
 * 대시보드는 루트(/)에서 제공됩니다.
 * /dashboard 접근 시 루트로 리다이렉트합니다.
 */
export default function DashboardRedirect() {
  redirect('/');
}
