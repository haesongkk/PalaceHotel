/**
 * 알리고 알림톡 API 유틸리티
 * https://smartsms.aligo.in/alimapi.html
 * Host: https://kakaoapi.aligo.in
 */

const ALIGO_ALIMTALK_BASE = 'https://kakaoapi.aligo.in';

export interface AlimtalkTemplate {
  senderKey: string;
  templtCode: string;
  templtContent: string;
  templtName: string;
  templateType?: string;
  templateEmType?: string;
  templtTitle?: string;
  templtSubtitle?: string;
  status: string; // R: 대기, A: 정상, S: 중단
  inspStatus: string; // REG: 등록, REQ: 심사요청, APR: 승인, REJ: 반려
  cdate: string;
  buttons?: Array<{
    ordering: string;
    name: string;
    linkType: string;
    linkMo?: string;
    linkPc?: string;
  }>;
}

export interface AlimtalkApiResponse<T = unknown> {
  code: number;
  message: string;
  list?: T[];
  data?: T;
  info?: T;
}

function getAlimtalkConfig(): {
  apikey: string;
  userid: string;
  senderkey: string;
  sender: string;
} {
  const apikey = process.env.ALIGO_API_KEY;
  const userid = process.env.ALIGO_USER_ID;
  const senderkey = process.env.ALIGO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER;

  if (!apikey || !userid || !senderkey || !sender) {
    throw new Error(
      '알림톡 API 설정이 완료되지 않았습니다. .env에 ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER_KEY, ALIGO_SENDER를 확인하세요.'
    );
  }
  return { apikey, userid, senderkey, sender };
}

async function aligoPost<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<AlimtalkApiResponse<T>> {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      body.append(k, String(v));
    }
  });

  const res = await fetch(`${ALIGO_ALIMTALK_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let data: AlimtalkApiResponse<T>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`알리고 API 응답 파싱 실패: ${text.substring(0, 200)}`);
  }
  return data;
}

/**
 * 등록된 알림톡 템플릿 목록 조회
 */
export async function getTemplateList(): Promise<AlimtalkTemplate[]> {
  const { apikey, userid, senderkey } = getAlimtalkConfig();
  const res = await aligoPost<AlimtalkTemplate[]>('/akv10/template/list/', {
    apikey,
    userid,
    senderkey,
  });
  if (res.code !== 0) {
    throw new Error(`알림톡 템플릿 목록 조회 실패: ${res.message}`);
  }
  const raw = res.list ?? [];
  const list = Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])
    ? (raw as AlimtalkTemplate[][]).flat()
    : raw;
  return list as AlimtalkTemplate[];
}

/**
 * 템플릿 코드로 템플릿 본문 조회 (발송 시 변수 치환용)
 */
export async function getTemplateContent(tplCode: string): Promise<string | null> {
  const list = await getTemplateList();
  const t = list.find((x) => x.templtCode === tplCode);
  return t?.templtContent ?? null;
}

/**
 * 신규 템플릿 생성 (등록 후 검수 요청 필요)
 */
export async function createTemplate(params: {
  tpl_name: string;
  tpl_content: string;
  tpl_type?: string; // BA: 기본형, EX: 부가정보형, AD: 광고추가형, MI: 복합형
  tpl_emtype?: string; // NONE, TEXT, IMAGE
  tpl_title?: string;
  tpl_stitle?: string;
  tpl_button?: string; // JSON string
}): Promise<{ templtCode: string; templtContent: string; templtName: string; inspStatus: string; status: string }> {
  const { apikey, userid, senderkey } = getAlimtalkConfig();
  const res = await aligoPost<{
    senderKey: string;
    templtContent: string;
    templtName: string;
    templtCode: string;
    inspStatus: string;
    status: string;
  }>('/akv10/template/add/', {
    apikey,
    userid,
    senderkey,
    tpl_name: params.tpl_name,
    tpl_content: params.tpl_content,
    tpl_type: params.tpl_type ?? 'BA',
    tpl_emtype: params.tpl_emtype ?? 'NONE',
    tpl_title: params.tpl_title,
    tpl_stitle: params.tpl_stitle,
    tpl_button: params.tpl_button,
  });
  if (res.code !== 0) {
    throw new Error(`템플릿 생성 실패: ${res.message}`);
  }
  const d = res.data as { templtCode: string; templtContent: string; templtName: string; inspStatus: string; status: string };
  return d;
}

/**
 * 템플릿 수정 (상태 R, inspStatus REG 또는 REJ일 때만)
 */
export async function modifyTemplate(params: {
  tpl_code: string;
  tpl_name: string;
  tpl_content: string;
  tpl_button?: string;
  tpl_title?: string;
  tpl_stitle?: string;
}): Promise<void> {
  const { apikey, userid, senderkey } = getAlimtalkConfig();
  const res = await aligoPost('/akv10/template/modify/', {
    apikey,
    userid,
    senderkey,
    tpl_code: params.tpl_code,
    tpl_name: params.tpl_name,
    tpl_content: params.tpl_content,
    tpl_button: params.tpl_button,
    tpl_title: params.tpl_title,
    tpl_stitle: params.tpl_stitle,
  });
  if (res.code !== 0) {
    throw new Error(`템플릿 수정 실패: ${res.message}`);
  }
}

/**
 * 템플릿 삭제 (승인 전 템플릿만)
 */
export async function deleteTemplate(tpl_code: string): Promise<void> {
  const { apikey, userid, senderkey } = getAlimtalkConfig();
  const res = await aligoPost('/akv10/template/del/', {
    apikey,
    userid,
    senderkey,
    tpl_code,
  });
  if (res.code !== 0) {
    throw new Error(`템플릿 삭제 실패: ${res.message}`);
  }
}

/**
 * 템플릿 검수 요청 (승인 신청, 카카오 검수 4~5일 소요)
 */
export async function requestTemplateApproval(tpl_code: string): Promise<void> {
  const { apikey, userid, senderkey } = getAlimtalkConfig();
  const res = await aligoPost('/akv10/template/request/', {
    apikey,
    userid,
    senderkey,
    tpl_code,
  });
  if (res.code !== 0) {
    throw new Error(`검수 요청 실패: ${res.message}`);
  }
}

export interface SendAlimtalkResult {
  code: number;
  message: string;
  info?: { mid?: string; scnt?: number; fcnt?: number };
}

/**
 * 알림톡 1건 발송
 * subject_1: 제목(필수), message_1: 본문(템플릿과 동일하게, 변수만 치환)
 */
export async function sendAlimtalk(params: {
  tpl_code: string;
  receiver: string;
  subject: string;
  message: string;
  recvname?: string;
  testMode?: boolean;
}): Promise<SendAlimtalkResult> {
  const { apikey, userid, senderkey, sender } = getAlimtalkConfig();
  const res = await aligoPost<{ mid?: string; scnt?: number; fcnt?: number }>('/akv10/alimtalk/send/', {
    apikey,
    userid,
    senderkey,
    tpl_code: params.tpl_code,
    sender,
    receiver_1: params.receiver,
    recvname_1: params.recvname,
    subject_1: params.subject,
    message_1: params.message,
    testMode: params.testMode ? 'Y' : 'N',
  });
  return {
    code: res.code,
    message: res.message,
    info: res.info,
  };
}

function formatDateForAlimtalk(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/** 관리자용 새 예약 알림 템플릿 코드 (.env: ALIMTALK_TEMPLATE_ADMIN) */
const TEMPLATE_ADMIN = process.env.ALIMTALK_TEMPLATE_ADMIN;
/** 고객용 예약 확정 템플릿 코드 (.env: ALIMTALK_TEMPLATE_CONFIRMED) */
const TEMPLATE_CONFIRMED = process.env.ALIMTALK_TEMPLATE_CONFIRMED;
/** 고객용 예약 거절 템플릿 코드 (.env: ALIMTALK_TEMPLATE_REJECTED) */
const TEMPLATE_REJECTED = process.env.ALIMTALK_TEMPLATE_REJECTED;

/**
 * 예약 요청 알림 (관리자에게 알림톡)
 */
export async function sendReservationNotificationAlimtalk(reservationId: string): Promise<SendAlimtalkResult> {
  const adminPhone = process.env.ALIGO_ADMIN_PHONE;
  if (!adminPhone) {
    throw new Error('관리자 전화번호가 설정되지 않았습니다. ALIGO_ADMIN_PHONE을 .env에 설정하세요.');
  }
  const tplCode = TEMPLATE_ADMIN;
  if (!tplCode) {
    throw new Error(
      '관리자 알림 템플릿 코드가 없습니다. 알림톡 템플릿 승인 후 .env에 ALIMTALK_TEMPLATE_ADMIN을 설정하세요.'
    );
  }
  const content = await getTemplateContent(tplCode);
  const message = content ?? '[팰리스호텔] 새로운 예약 요청이 있습니다. 관리자 채널에서 확인해 주세요.';
  return sendAlimtalk({
    tpl_code: tplCode,
    receiver: adminPhone,
    subject: '팰리스호텔 예약 알림',
    message: message.replace(/#{예약ID}/g, reservationId),
  });
}

/**
 * 예약 확정/거절 알림 (고객에게 알림톡)
 * 템플릿 본문은 #{roomType}, #{checkIn}, #{checkOut}, #{totalPrice}(확정 시만) 사용
 */
export async function sendReservationStatusAlimtalk(
  phoneNumber: string,
  situation: 'reservation_confirmed' | 'reservation_rejected',
  reservationInfo: {
    roomType: string;
    checkIn: string;
    checkOut: string;
    totalPrice?: number;
  }
): Promise<SendAlimtalkResult> {
  const tplCode = situation === 'reservation_confirmed' ? TEMPLATE_CONFIRMED : TEMPLATE_REJECTED;
  if (!tplCode) {
    const key =
      situation === 'reservation_confirmed' ? 'ALIMTALK_TEMPLATE_CONFIRMED' : 'ALIMTALK_TEMPLATE_REJECTED';
    throw new Error(`알림톡 템플릿 코드가 없습니다. .env에 ${key}를 설정하세요.`);
  }
  const content = await getTemplateContent(tplCode);
  if (!content) {
    throw new Error(`템플릿 코드 ${tplCode}의 본문을 가져올 수 없습니다.`);
  }
  const checkIn = formatDateForAlimtalk(reservationInfo.checkIn);
  const checkOut = formatDateForAlimtalk(reservationInfo.checkOut);
  let message = content
    .replace(/#{roomType}/g, reservationInfo.roomType)
    .replace(/#{checkIn}/g, checkIn)
    .replace(/#{checkOut}/g, checkOut);
  if (reservationInfo.totalPrice !== undefined) {
    message = message.replace(/#{totalPrice}/g, reservationInfo.totalPrice.toLocaleString());
  }
  const subject = situation === 'reservation_confirmed' ? '예약 확정 안내' : '예약 안내';
  return sendAlimtalk({
    tpl_code: tplCode,
    receiver: phoneNumber,
    subject,
    message,
  });
}
