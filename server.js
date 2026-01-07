const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// ============================
// 메모리 저장소(프로토타입)
// ============================
let bookings = []; 
// bookings: [{ id: number, status: 'pending'|'approved'|'rejected', userId: string }]
let bookingIdCounter = 1;

// outboxByUser: { [userId]: string[] }
const outboxByUser = Object.create(null);

// ============================
// 오픈빌더에서 만든 블록 ID를 여기에 넣으세요
// - 승인 블록: /skill/admin-approve 스킬 연결
// - 거절 블록: /skill/admin-reject  스킬 연결
// ============================
const APPROVE_BLOCK_ID = "695e59a72f7e3a5658185d6b";
const REJECT_BLOCK_ID  = "695e5a099438f53ce5f67676";

// ============================
// 유저 ID 추출 (문서 기준: userRequest.user.id) :contentReference[oaicite:4]{index=4}
// ============================
function getUserIdFromRequest(req) {
  // 가장 기본/권장: bot 단위 유저 식별자 :contentReference[oaicite:5]{index=5}
  const id = req.body?.userRequest?.user?.id;
  if (typeof id === 'string' && id.length > 0) return id;

  // (옵션) 채널 user_key에 해당 :contentReference[oaicite:6]{index=6}
  const plusfriendUserKey = req.body?.userRequest?.user?.properties?.plusfriendUserKey;
  if (typeof plusfriendUserKey === 'string' && plusfriendUserKey.length > 0) return plusfriendUserKey;

  // 마지막 fallback
  return "UNKNOWN_USER";
}

// ============================
// bookingId 추출 (버튼 extra → clientExtra 권장)
// ============================
function getBookingIdFromRequest(req) {
  const raw =
    req.body?.action?.clientExtra?.bookingId ??        // 버튼 extra → clientExtra
    req.body?.action?.detailParams?.bookingId?.origin ?? // 발화 파라미터 fallback
    req.body?.action?.params?.bookingId ??
    "0";

  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

function pushOutbox(userId, text) {
  if (!outboxByUser[userId]) outboxByUser[userId] = [];
  outboxByUser[userId].push(text);
}

// ============================
// 1) 예약 요청 스킬
// ============================
app.post('/skill/room-booking', (req, res) => {
  const userId = getUserIdFromRequest(req);

  const bookingId = bookingIdCounter++;
  bookings.push({
    id: bookingId,
    status: 'pending',
    userId,
  });

  console.log(`새 예약 요청: ID ${bookingId}, userId=${userId}`);

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
// 2) 관리자: 예약 조회 (pending → 캐러셀)
// ============================
app.post('/skill/admin-bookings', (req, res) => {
  const pending = bookings.filter(b => b.status === 'pending');

  if (pending.length === 0) {
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "대기 중인 예약이 없습니다." } }] }
    });
  }

  const MAX_ITEMS = 10;
  const shown = pending.slice(0, MAX_ITEMS);

  const items = shown.map(b => ({
    title: `예약 #${b.id}`,
    description: `상태: 대기`,
    thumbnail: {
      imageUrl: "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzC53YIjNDkqbWK.jpg"
    },
    buttons: [
      {
        action: "block",
        label: "✅ 승인",
        blockId: APPROVE_BLOCK_ID,
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

  const overflow = pending.length - shown.length;
  const extraText = overflow > 0 ? `\n(추가로 ${overflow}건 더 있음)` : "";

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: `대기 중인 예약 ${pending.length}건${extraText}` } },
        { carousel: { type: "basicCard", items } }
      ]
    }
  });
});

// ============================
// 3) 관리자: 예약 승인
// - 승인되면 "원래 고객에게 선톡으로 갔어야 할 메시지"를 outbox에 쌓아둠
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

    // ✅ 데모용 "선톡 내용" 적재
    pushOutbox(
      booking.userId,
      `[선톡 데모] 예약 #${bookingId}가 승인되었습니다.`
    );
  }

  res.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: message } }] }
  });
});

// ============================
// 4) 관리자: 예약 거절
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

    // ✅ 데모용 "선톡 내용" 적재
    pushOutbox(
      booking.userId,
      `[선톡 데모] 예약 #${bookingId}가 거절되었습니다.`
    );
  }

  res.json({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: message } }] }
  });
});

// ============================
// 5) 고객: '2222' 입력 시 보여줄 "선톡 데모" (outbox 확인)
// - 오픈빌더에서 '2222' 발화에 반응하는 블록을 만들고
//   그 블록에 이 스킬(/skill/customer-outbox)을 연결하면 됨
// ============================
app.post('/skill/customer-outbox', (req, res) => {
  const userId = getUserIdFromRequest(req);
  const box = outboxByUser[userId] || [];

  if (box.length === 0) {
    return res.json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "도착한 알림(선톡 데모)이 없습니다." } }] }
    });
  }

  // 보여주기만 하고 비울지 여부는 취향인데, 데모 느낌이면 "읽음 처리"가 자연스러워서 비움
  const text = box.join('\n');
  outboxByUser[userId] = [];

  return res.json({
    version: "2.0",
    template: {
      outputs: [
        { simpleText: { text: `아래는 원래 선톡으로 갔어야 할 내용(데모)입니다:\n\n${text}` } }
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
  console.log('- POST /skill/room-booking      : 예약 요청(유저ID 저장)');
  console.log('- POST /skill/admin-bookings    : 관리자 - 예약 조회(캐러셀)');
  console.log('- POST /skill/admin-approve     : 관리자 - 예약 승인(+선톡 데모 적재)');
  console.log('- POST /skill/admin-reject      : 관리자 - 예약 거절(+선톡 데모 적재)');
  console.log('- POST /skill/customer-outbox   : 고객 - 2222 데모(선톡 내용 표시)');
  console.log('\n주의: APPROVE_BLOCK_ID / REJECT_BLOCK_ID에 오픈빌더 블록 ID를 넣어야 버튼이 동작합니다.');
});
