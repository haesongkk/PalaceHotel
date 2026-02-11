import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

function expandChatHistoryWithCustomer(
  h: ReturnType<typeof dataStore.getChatHistories>[0]
) {
  const customer = dataStore.getCustomer(h.customerId);
  return {
    ...h,
    userId: customer?.userId ?? '',
    userName: customer?.name,
    userPhone: customer?.phone,
    memo: customer?.memo,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const history = dataStore.getChatHistory(params.id);
  if (!history) {
    return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
  }
  return NextResponse.json(expandChatHistoryWithCustomer(history));
}

/** 이름·전화번호·메모는 모두 고객(customerId) 마스터에서 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const history = dataStore.getChatHistory(params.id);
  if (!history) {
    return NextResponse.json({ error: 'Chat history not found' }, { status: 404 });
  }
  const body = await request.json();
  const customer = dataStore.getCustomer(history.customerId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const updates: { name?: string; phone?: string; memo?: string } = {};
  if (typeof body.userName === 'string') updates.name = body.userName;
  if (typeof body.userPhone === 'string') updates.phone = body.userPhone;
  if (typeof body.memo === 'string') updates.memo = body.memo;

  if (Object.keys(updates).length > 0) {
    dataStore.updateCustomer(customer.id, updates);
  }

  const updatedHistory = dataStore.getChatHistory(params.id)!;
  return NextResponse.json(expandChatHistoryWithCustomer(updatedHistory));
}