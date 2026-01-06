const express = require('express');
const app = express();
const PORT = 3000;

// 요청 본문을 JSON으로 파싱
app.use(express.json());

/**
 * 카카오톡 챗봇이 보내는 요청 형식:
 * {
 *   "userRequest": {
 *     "utterance": "사용자가 입력한 텍스트"
 *   }
 * }
 */

// 기본 응답 엔드포인트
app.post('/skill/greeting', (req, res) => {
  const userInput = req.body.userRequest.utterance;
  
  // 간단한 응답 생성
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `안녕하세요! 당신이 보낸 메시지: "${userInput}"`
          }
        }
      ]
    }
  };
  
  res.json(response);
});

// 객실 검색 스킬 (캐로셀 + 아이템 카드)
app.post('/skill/room-search', (req, res) => {
  // 카카오톡 action.detailParams에서 날짜 추출
  const checkInDate = req.body.action?.detailParams?.checkInDate?.origin || "2026-01-10";
  const checkOutDate = req.body.action?.detailParams?.checkOutDate?.origin || "2026-01-12";
  
  // 더미 객실 데이터
  const rooms = [
    {
      id: 1,
      name: "디럭스 싱글룸",
      price: "150,000원",
      image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop",
      description: "넓은 창문으로 밝은 채광, 프리미엄 침구류"
    },
    {
      id: 2,
      name: "디럭스 더블룸",
      price: "200,000원",
      image: "https://images.unsplash.com/photo-1570129477492-45a003537e1f?w=400&h=300&fit=crop",
      description: "킹사이즈 침대, 도시 전망"
    },
    {
      id: 3,
      name: "스탠다드 트윈룸",
      price: "170,000원",
      image: "https://images.unsplash.com/photo-1590073242678-70414c7e63a2?w=400&h=300&fit=crop",
      description: "분리된 침대 2개, 가족 단위 여행객 추천"
    },
    {
      id: 4,
      name: "주니어 스위트",
      price: "280,000원",
      image: "https://images.unsplash.com/photo-1512631516975-590b458cda59?w=400&h=300&fit=crop",
      description: "거실 공간이 있는 넓은 방"
    },
    {
      id: 5,
      name: "디럭스 스위트",
      price: "350,000원",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop",
      description: "침실과 거실, 욕실 분리, 최고급 시설"
    },
    {
      id: 6,
      name: "로열 스위트",
      price: "500,000원",
      image: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&h=300&fit=crop",
      description: "최상위 시설, 전용 라운지 접근권"
    }
  ];
  
const response = {
  "version": "2.0",
  "template": {
    "outputs": [
        {
            "simpleText": {
                "text": `입실: ${checkInDate} | 퇴실: ${checkOutDate}`
            }
          },
      {
        "carousel": {
          "type": "itemCard",
          "items": [
            {
              "imageTitle": {
                "title": "예약 완료",
                "imageUrl" : "https://t1.kakaocdn.net/openbuilder/docs_image/wine.jpg"
              },
              "itemList": [
                {
                  "title": "매장명",
                  "description": "판교 A스퀘어점"
                },
                {
                  "title": "예약 일시",
                  "description": "2022.12.25, 19:30"
                },
                {
                  "title" : "예약 인원",
                  "description" : "4명"
                },
                {
                  "title" : "예약금",
                  "description" : "40,000원 (결제 완료)"
                }
              ],
              "itemListAlignment": "left",
              "buttons": [
                {
                  "label": "예약 정보",
                  "action": "message",
                  "messageText" : "예약 정보"
                },
                {
                  "label": "예약 취소",
                  "action": "message",
                  "messageText": "예약 취소"
                }
              ]
            },
            {
              "imageTitle": {
                "title": "결제 대기",
                "imageUrl": "https://t1.kakaocdn.net/openbuilder/docs_image/pizza.jpg"
              },
              "itemList": [
                {
                  "title": "매장명",
                  "description": "정자역점"
                },
                {
                  "title": "예약 일시",
                  "description": "2022.12.25, 19:25"
                },
                {
                  "title" : "예약 인원",
                  "description" : "3명"
                },
                {
                  "title" : "예약금",
                  "description" : "30,000원 (결제 대기)"
                }
              ],
              "itemListAlignment": "left",
              "buttons": [
                {
                  "label": "예약 취소",
                  "action": "message",
                  "messageText" : "예약 취소"
                },
                {
                  "label": "결제",
                  "action": "message",
                  "messageText": "결제"
                }
              ]
            }
          ]
        }
      }
    ],
    "quickReplies": [
      {
        "messageText": "인기 메뉴",
        "action": "message",
        "label": "인기 메뉴"
      },
      {
        "messageText": "최근 주문",
        "action": "message",
        "label": "최근 주문"
      },
      {
        "messageText": "장바구니",
        "action": "message",
        "label": "장바구니"
      }
    ]
  }
}
  
  res.json(response);
});

// 건강 체크
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`카카오톡 봇 스킬 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('\n사용 가능한 스킬:');
  console.log('- POST /skill/greeting : 인사말');
  console.log('- POST /skill/room-search : 객실 검색 (캐로셀)');
  console.log('- GET /health : 상태 확인\n');
});
