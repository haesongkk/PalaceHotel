import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/**
 * 객실 이미지 서빙 API
 * GET /api/images/room/[id]
 *
 * 직접 업로드한 이미지(data URL base64)만 서빙합니다.
 * 외부 URL은 사용하지 않습니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params?.id;
    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const room = await dataStore.getRoom(roomId);
    if (!room?.imageUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const imageUrl = room.imageUrl;

    // data URL (base64)인 경우만 직접 반환
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 외부 URL은 서빙하지 않음 (직접 넣은 이미지만 지원)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('[이미지 서빙 오류]', error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
