/**
 * 알리고 SMS API 유틸리티
 * https://smartsms.aligo.in/
 */

interface AligoSendSMSOptions {
  receiver: string; // 수신번호 (쉼표로 여러개 가능)
  msg: string; // 메시지 내용 (1~2,000 Byte)
  testmode?: boolean; // 테스트 모드 (기본값: true)
}

interface AligoResponse {
  result_code: string;
  message: string;
  msg_id?: string;
  success_cnt?: number;
  error_cnt?: number;
}

/**
 * 알리고 API를 통해 SMS 발송
 */
export async function sendSMS(options: AligoSendSMSOptions): Promise<AligoResponse> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;
  const testMode = process.env.ALIGO_TEST_MODE === 'Y' || options.testmode !== false;

  if (!apiKey || !userId || !sender) {
    throw new Error('알리고 API 설정이 완료되지 않았습니다. .env 파일을 확인하세요.');
  }

  // EUC-KR 인코딩을 위해 URLSearchParams 사용
  const params = new URLSearchParams();
  params.append('key', apiKey);
  params.append('user_id', userId);
  params.append('sender', sender);
  params.append('receiver', options.receiver);
  params.append('msg', options.msg);
  if (testMode) {
    params.append('testmode_yn', 'Y');
  }

  try {
    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // 알리고 API는 text/html로 응답할 수 있음
    const text = await response.text();
    
    // JSON 파싱 시도
    let data: AligoResponse;
    try {
      data = JSON.parse(text);
    } catch {
      // JSON이 아닌 경우 HTML 응답일 수 있음
      throw new Error(`알리고 API 응답 파싱 실패: ${text.substring(0, 200)}`);
    }

    if (data.result_code !== '1') {
      throw new Error(`알리고 API 오류: ${data.message || data.result_code}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('알리고 SMS 발송 중 오류가 발생했습니다.');
  }
}

/**
 * 예약 요청 알림 SMS 발송
 * 관리자에게 "나중에 카톡으로 보낼 예정" 안내 + 링크만 전송
 */
export async function sendReservationNotificationSMS(reservationId: string): Promise<AligoResponse> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const adminPhone = process.env.ALIGO_ADMIN_PHONE;

  if (!adminPhone) {
    throw new Error('관리자 전화번호가 설정되지 않았습니다. ALIGO_ADMIN_PHONE을 .env에 설정하세요.');
  }

  const link = `${baseUrl}/admin/reservation/${reservationId}`;
  const message = `[팰리스호텔] 새로운 예약 요청이 있습니다. 나중에 카카오톡으로 보내드립니다. 확인: ${link}`;

  return sendSMS({
    receiver: adminPhone,
    msg: message,
  });
}

/**
 * 예약 확정/거절 SMS 발송 (고객에게)
 * store에 저장된 메시지 템플릿을 사용하여 예약 정보를 포함한 메시지 전송
 */
export async function sendReservationStatusSMS(
  phoneNumber: string,
  messageTemplate: string,
  reservationInfo: {
    roomType: string;
    checkIn: string;
    checkOut: string;
    totalPrice?: number;
  }
): Promise<AligoResponse> {
  // 메시지 템플릿의 변수를 실제 값으로 치환
  let message = messageTemplate
    .replace(/{roomType}/g, reservationInfo.roomType)
    .replace(/{checkIn}/g, formatDateForSMS(reservationInfo.checkIn))
    .replace(/{checkOut}/g, formatDateForSMS(reservationInfo.checkOut));

  if (reservationInfo.totalPrice !== undefined) {
    message = message.replace(/{totalPrice}/g, reservationInfo.totalPrice.toLocaleString());
  }

  return sendSMS({
    receiver: phoneNumber,
    msg: message,
  });
}

/**
 * 날짜를 SMS에 적합한 형식으로 변환 (YYYY년 MM월 DD일)
 */
function formatDateForSMS(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}
