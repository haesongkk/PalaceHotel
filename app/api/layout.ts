// API 라우트는 빌드 시 DB 연결 없이 동적 렌더링되도록 설정
export const dynamic = 'force-dynamic';

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
