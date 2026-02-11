import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/** 고객 목록 조회 (분리된 고객 마스터 데이터) */
export async function GET() {
  const customers = dataStore.getCustomers();
  return NextResponse.json(customers);
}
