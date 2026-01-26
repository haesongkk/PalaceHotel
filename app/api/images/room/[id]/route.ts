import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

/**
 * 객실 이미지 서빙 API
 * GET /api/images/room/[id]
 * 
 * 짧은 경로로 이미지를 제공하여 카카오톡 응답 크기를 줄입니다.
 * 원본 이미지 URL에서 이미지를 가져와서 프록시합니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    const room = dataStore.getRoom(roomId);

    if (!room || !room.imageUrl) {
      // 이미지가 없으면 기본 placeholder로 리다이렉트
      return NextResponse.redirect('https://picsum.photos/800/600', { status: 302 });
    }

    const imageUrl = room.imageUrl;

    // data URL (base64)인 경우 직접 반환
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

    // 외부 URL인 경우 이미지를 가져와서 프록시
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
          },
        });

        if (!imageResponse.ok) {
          throw new Error(`이미지 가져오기 실패: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (fetchError) {
        console.error('[이미지 프록시 오류]', fetchError);
        // 프록시 실패 시 원본 URL로 리다이렉트
        return NextResponse.redirect(imageUrl, { status: 302 });
      }
    }

    // 알 수 없는 형식이면 원본 URL로 리다이렉트
    return NextResponse.redirect(imageUrl, { status: 302 });
  } catch (error) {
    console.error('[이미지 서빙 오류]', error);
    return NextResponse.redirect('https://picsum.photos/800/600', { status: 302 });
  }
}
