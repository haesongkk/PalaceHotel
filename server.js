const express = require('express');
const app = express();
const PORT = 3000;

// 요청 본문을 JSON으로 파싱
app.use(express.json());

// 예약 데이터 저장소 (메모리)
let bookings = []; // [{ id: 1, status: 'pending' }, ...]
let bookingIdCounter = 1;

/**
 * 카카오톡 챗봇이 보내는 요청 형식:
 * {
 *   "userRequest": {
 *     "utterance": "사용자가 입력한 텍스트"
 *   }
 * }
 */

// 예약 요청 스킬
app.post('/skill/room-booking', (req, res) => {
  // 새 예약 생성 (ID만 부여)
  const bookingId = bookingIdCounter++;
  bookings.push({
    id: bookingId,
    status: 'pending'
  });
  
  console.log(`새 예약 요청: ID ${bookingId}`);
  
  const response = {
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
  };
  
  res.json(response);
});

// 관리자: 예약 조회
app.post('/skill/admin-bookings', (req, res) => {
  const pendingIds = bookings
    .filter(b => b.status === 'pending')
    .map(b => b.id);
  
  let message;
  if (pendingIds.length === 0) {
    message = "대기 중인 예약이 없습니다.";
  } else {
    message = `대기 중인 예약: ${pendingIds.join(', ')}`;
  }

  
  
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          "carousel": {
            "type": "basicCard",
            "items": [
              {
                "title": "보물상자",
                "description": "보물상자 안에는 뭐가 있을까",
                "thumbnail": {
                  "imageUrl": "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzC53YIjNDkqbWK.jpg"
                },
                "buttons": [
                  {
                    "action": "message",
                    "label": "열어보기",
                    "messageText": "짜잔! 우리가 찾던 보물입니다"
                  },
                  {
                    "action":  "webLink",
                    "label": "구경하기",
                    "webLinkUrl": "https://e.kakao.com/t/hello-ryan"
                  }
                ]
              },
              {
                "title": "보물상자1",
                "description": "보물상자1 안에는 뭐가 있을까",
                "thumbnail": {
                  "imageUrl": "https://t1.kakaocdn.net/openbuilder/sample/lj3JUcmrzC53YIjNDkqbWK.jpg"
                },
                "buttons": [
                  {
                    "action": "message",
                    "label": "열어보기",
                    "messageText": "짜잔! 우리가 찾던 보물입니다"
                  },
                  {
                    "action":  "webLink",
                    "label": "구경하기",
                    "webLinkUrl": "https://e.kakao.com/t/hello-ryan"
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  };
    
  res.json(response);
});

// 관리자: 예약 승인
app.post('/skill/admin-approve', (req, res) => {
  const bookingId = parseInt(req.body.action?.detailParams?.bookingId?.origin || "0");
  const booking = bookings.find(b => b.id === bookingId);
  
  let message;
  if (!booking) {
    message = `예약 ID ${bookingId}를 찾을 수 없습니다.`;
  } else if (booking.status !== 'pending') {
    message = `예약 ID ${bookingId}는 이미 처리되었습니다.`;
  } else {
    booking.status = 'approved';
    message = `✅ 예약 ID ${bookingId} 승인됨`;
    console.log(`예약 ${bookingId} 승인됨`);
  }
  
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: message
          }
        }
      ]
    }
  };
  
  res.json(response);
});

// 관리자: 예약 거절
app.post('/skill/admin-reject', (req, res) => {
  const bookingId = parseInt(req.body.action?.detailParams?.bookingId?.origin || "0");
  const booking = bookings.find(b => b.id === bookingId);
  
  let message;
  if (!booking) {
    message = `예약 ID ${bookingId}를 찾을 수 없습니다.`;
  } else if (booking.status !== 'pending') {
    message = `예약 ID ${bookingId}는 이미 처리되었습니다.`;
  } else {
    booking.status = 'rejected';
    message = `❌ 예약 ID ${bookingId} 거절됨`;
    console.log(`예약 ${bookingId} 거절됨`);
  }
  
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: message
          }
        }
      ]
    }
  };
  
  res.json(response);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`카카오톡 봇 스킬 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('\n사용 가능한 스킬:');
  console.log('- POST /skill/room-booking : 예약 요청');
  console.log('- POST /skill/admin-bookings : 관리자 - 예약 조회');
  console.log('- POST /skill/admin-approve : 관리자 - 예약 승인');
  console.log('- POST /skill/admin-reject : 관리자 - 예약 거절');
});
