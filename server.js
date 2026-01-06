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

// 계산 스킬
app.post('/skill/calculate', (req, res) => {
  const userInput = req.body.userRequest.utterance;
  
  // 예: "2더하기3" -> 2+3 = 5
  let result;
  try {
    // 간단한 계산 (eval은 실제로는 보안상 위험하므로 주의)
    const expression = userInput
      .replace(/더하기/g, '+')
      .replace(/빼기/g, '-')
      .replace(/곱하기/g, '*')
      .replace(/나누기/g, '/');
    
    result = eval(expression);
  } catch (error) {
    result = '계산할 수 없습니다';
  }
  
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `계산 결과: ${result}`
          }
        }
      ]
    }
  };
  
  res.json(response);
});

// 날씨 정보 스킬 (더미 데이터)
app.post('/skill/weather', (req, res) => {
  const weatherData = {
    city: "서울",
    temp: "15°C",
    description: "맑음"
  };
  
  const response = {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: `${weatherData.city} 날씨: ${weatherData.temp}, ${weatherData.description}`
          }
        }
      ]
    }
  };
  
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
  console.log('- POST /skill/calculate : 계산');
  console.log('- POST /skill/weather : 날씨');
  console.log('- GET /health : 상태 확인\n');
});
