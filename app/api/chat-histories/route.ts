import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import type { ChatHistory } from '@/types';

/** 대화 내역 반환 시 고객 정보를 customerId로 조회해 userId/userName/userPhone/memo 보강 */
async function expandChatHistoryWithCustomer(h: ChatHistory) {
  const customer = await dataStore.getCustomer(h.customerId);
  return {
    ...h,
    userId: customer?.userId ?? '',
    userName: customer?.name,
    userPhone: customer?.phone,
    memo: customer?.memo,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (userId) {
    const history = await dataStore.getChatHistoryByUserId(userId);
    if (!history) {
      return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
    }
    return NextResponse.json(await expandChatHistoryWithCustomer(history));
  }
  const histories = await dataStore.getChatHistories();
  return NextResponse.json(await Promise.all(histories.map(expandChatHistoryWithCustomer)));
}

