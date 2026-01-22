import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';
import { ChatbotSituation } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { situation: string } }
) {
  const message = dataStore.getChatbotMessage(params.situation as ChatbotSituation);
  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }
  return NextResponse.json(message);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { situation: string } }
) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const updated = dataStore.updateChatbotMessage(
      params.situation as ChatbotSituation,
      message
    );
    
    if (!updated) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

