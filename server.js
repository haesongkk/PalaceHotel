const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// ============================
// 메모리 예약 저장소
// ============================
let bookings = []; // [{ id: 1, status: 'pending'|'approved'|'rejected' }, ...]
let bookingIdCounter = 1;

// ============================
// 오픈빌더에서 만든 블록 ID를 여기에 넣으세요
// - 승인 블록: /skill/admin-approve 스킬 연결
// - 거절 블록: /skill/admin-reject  스킬 연결
// ============================
const APPROVE_BLOCK_ID = "695e59a72f7e3a5658185d6b";
const REJECT_BLOCK_ID  = "695e5a099438f53ce5f67676";

// ============================
// bookingId 추출 헬퍼
// - 버튼(extra)로 들어오면 보통 clientExtra로 들어옴
// - 혹시 기존처럼 detailParams로 들어오는 케이스도 fallback 처리
// ============================
function getBookingIdFromRequest(req) {
  const raw =
    req.body?.action?.clientExtra?.bookingId ??
    req.body?.action?.detailParams?.bookingId?.origin ??
    req.body?.action?.params?.bookingId ??
    "0";

  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 카카오톡 챗봇이 보내는 요청 형식 예:
 * {
 *   "userRequest": { "utterance": "..." },
 *   "action": { ... }
 * }
 */

// ============================
// 예약 요청 스킬
// ============================
app.post('/skill/room-booking', (req, res) => {
  const bookingId = bookingIdCounter++;
  bookings.push({ id: bookingId, status: 'pending' });

  console.log(`새 예약 요청: ID ${bookingId}`);

  res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `예약 요청 완료!\n예약 ID: ${bookingId}`
          }
        }
      ]
    }
  });
});

// ============================
// 관리자: 예약 조회
// - pending 예약을 캐러셀(basicCard)로 나열
// - 각 카드에 승인/거절 버튼
// - 버튼 클릭 시 각각 "승인 블록/거절 블록"으로 이동 → 그 블록에 연결된 스킬 호출
// ============================
app.post('/skill/admin-bookings', (req, res) => {
  const pending = bookings.filter(b => b.status === 'pending');

  if (pending.length === 0) {
    return res.json({
      version: "2.0",
      template: {
        outputs: [
          { simpleText: { text: "대기 중인 예약이 없습니다." } }
        ]
      }
    });
  }

  // 너무 많이 쌓이면 캐러셀 제한용 (프로토타입이니 적당히 10개만)
  const MAX_ITEMS = 10;
  const shown = pending.slice(0, MAX_ITEMS);

  const items = shown.map(b => ({
    title: `예약 #${b.id}`,
    description: `상태: 대기`,
    // 썸네일은 프로토타입용 고정 이미지 (원하면 제거 가능)
    thumbnail: {
      imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzC53YIjNDkqbWK.jpg"
    },
    buttons: [
      {
        action: "block",
        label: "✅ 승인",
        blockId: APPROVE_BLOCK_ID,
        // 버튼 클릭으로 넘어갈 때 bookingId만 전달 (추가 정보 없음)
        extra: { bookingId: String(b.id) }
      },
      {
        action: "block",
        label: "❌ 거절",
        blockId: REJECT_BLOCK_ID,
        extra: { bookingId: String(b.id) }
      }
    ]
  }));

  // 10개 초과 안내(선택)
  const overflow = pending.length - shown.length;
  const extraText = overflow > 0 ? `\n(추가로 ${overflow}건 더 있음)` : "";

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `대기 중인 예약 ${pending.length}건${extraText}`
          }
        },
        {
          carousel: {
            type: "basicCard",
            items
          }
        }
      ]
    }
  });
});

// ============================
// 관리자: 예약 승인
// - bookingId는 버튼 extra → clientExtra로 받는 형태가 핵심
// ============================
app.post('/skill/admin-approve', (req, res) => {
  const bookingId = getBookingIdFromRequest(req);
  const booking = bookings.find(b => b.id === bookingId);

  let message;
  if (!bookingId) {
    message = "bookingId가 전달되지 않았습니다.";
  } else if (!booking) {
    message = `예약 ID ${bookingId}를 찾을 수 없습니다.`;
  } else if (booking.status !== 'pending') {
    message = `예약 ID ${bookingId}는 이미 처리되었습니다. (현재: ${booking.status})`;
  } else {
    booking.status = 'approved';
    message = `✅ 예약 ID ${bookingId} 승인됨`;
    console.log(`예약 ${bookingId} 승인됨`);
  }

  res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: message } }
      ]
    }
  });
});

// ============================
// 관리자: 예약 거절
// ============================
app.post('/skill/admin-reject', (req, res) => {
  const bookingId = getBookingIdFromRequest(req);
  const booking = bookings.find(b => b.id === bookingId);

  let message;
  if (!bookingId) {
    message = "bookingId가 전달되지 않았습니다.";
  } else if (!booking) {
    message = `예약 ID ${bookingId}를 찾을 수 없습니다.`;
  } else if (booking.status !== 'pending') {
    message = `예약 ID ${bookingId}는 이미 처리되었습니다. (현재: ${booking.status})`;
  } else {
    booking.status = 'rejected';
    message = `❌ 예약 ID ${bookingId} 거절됨`;
    console.log(`예약 ${bookingId} 거절됨`);
  }

  res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: message } }
      ]
    }
  });
});

// ============================
// 서버 시작
// ============================
app.listen(PORT, () => {
  console.log(`카카오톡 봇 스킬 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('\n사용 가능한 스킬:');
  console.log('- POST /skill/room-booking    : 예약 요청');
  console.log('- POST /skill/admin-bookings  : 관리자 - 예약 조회(캐러셀)');
  console.log('- POST /skill/admin-approve   : 관리자 - 예약 승인');
  console.log('- POST /skill/admin-reject    : 관리자 - 예약 거절');
  console.log('\n주의: APPROVE_BLOCK_ID / REJECT_BLOCK_ID에 오픈빌더 블록 ID를 넣어야 버튼이 동작합니다.');
});
