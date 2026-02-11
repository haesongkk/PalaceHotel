import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** 고객 목록 조회 (분리된 고객 마스터 데이터) */
export async function GET() {
  const customers = await dataStore.getCustomers();
  return NextResponse.json(customers);
}
