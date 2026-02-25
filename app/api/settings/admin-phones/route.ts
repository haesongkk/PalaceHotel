import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/db-store';

/** 관리자 알림톡 수신 번호 목록 조회 */
export async function GET() {
  try {
    const phones = await dataStore.getAdminPhones();
    return NextResponse.json({ phones });
  } catch (e) {
    console.error('[admin-phones GET]', e);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

/** 관리자 알림톡 수신 번호 목록 저장 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const raw = body?.phones;
    const phones = Array.isArray(raw)
      ? raw
          .map((p: unknown) => (typeof p === 'string' ? p.trim() : String(p).trim()))
          .filter((p) => p.length > 0)
          .map((p) => p.replace(/\D/g, ''))
      : [];
    await dataStore.setAdminPhones(phones);
    return NextResponse.json({ phones });
  } catch (e) {
    console.error('[admin-phones PUT]', e);
    return NextResponse.json({ error: '저장 실패' }, { status: 500 });
  }
}
