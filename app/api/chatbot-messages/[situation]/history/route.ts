import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { ChatbotSituation } from '@/types';

/**
 * GET: 챗봇 멘트 이전 버전 목록 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { situation: string } }
) {
  const situation = params.situation as ChatbotSituation;
  const history = await dataStore.getChatbotMessageHistory(situation);
  return NextResponse.json(history);
}
