import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = process.env.DATABASE_URL?.trim() ?? '';

if (!url) {
  throw new Error('DATABASE_URL이 설정되지 않았습니다. .env에 Render PostgreSQL(또는 사용할 DB) URL을 설정하세요.');
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const CHATBOT_SITUATIONS = [
  { situation: 'channel_added', description: '사용자가 카카오톡 채널을 추가했을 때 표시되는 환영 메시지입니다.', message: '안녕하세요! 호텔 예약 챗봇입니다. 무엇을 도와드릴까요?' },
  { situation: 'today_day_use', description: '사용자가 "오늘 대실" 옵션을 선택했을 때 표시되는 안내 메시지입니다.', message: '오늘 대실 가능한 객실을 안내해드리겠습니다.' },
  { situation: 'today_stay', description: '사용자가 "오늘 숙박" 옵션을 선택했을 때 표시되는 안내 메시지입니다.', message: '오늘 숙박 가능한 객실을 안내해드리겠습니다.' },
  { situation: 'saturday_reservation', description: '사용자가 "토요일 예약" 옵션을 선택했을 때 표시되는 안내 메시지입니다.', message: '토요일 예약 가능한 객실을 안내해드리겠습니다.' },
  { situation: 'make_reservation', description: '사용자가 "예약하기" 버튼을 클릭했을 때 표시되는 안내 메시지입니다.', message: '예약을 진행하시겠습니까? 원하시는 날짜를 알려주세요.' },
  { situation: 'phone_input_request', description: '사용자가 객실을 선택한 후 전화번호를 입력하도록 요청할 때 표시되는 안내 메시지입니다.', message: '예약을 완료하기 위해 전화번호를 입력해주세요.\n형식: 010-1234-5678' },
  { situation: 'reservation_request', description: '사용자가 예약을 요청했을 때 표시되는 확인 메시지입니다.', message: '예약 요청이 접수되었습니다. 확인 후 연락드리겠습니다.' },
  { situation: 'reservation_inquiry', description: '사용자가 예약 내역을 조회했을 때 표시되는 안내 메시지입니다.', message: '예약 내역을 조회해드리겠습니다.' },
  { situation: 'reservation_cancel', description: '사용자가 예약을 취소했을 때 표시되는 안내 메시지입니다.', message: '예약이 취소되었습니다. 다른 도움이 필요하시면 말씀해주세요.' },
  { situation: 'default_greeting', description: '상황이 없거나 멘트를 불러오지 못할 때 사용하는 기본 인사입니다.', message: '안녕하세요! 무엇을 도와드릴까요?' },
  { situation: 'reservation_empty', description: '예약 내역이 없을 때 리스트 카드 대신 표시하는 문구입니다.', message: '예약 내역이 없습니다.' },
  { situation: 'reservation_not_found', description: '예약 ID로 조회했으나 해당 예약이 없을 때 표시합니다.', message: '해당 예약을 찾을 수 없습니다.' },
  { situation: 'reservation_already_cancelled', description: '이미 취소된 예약을 다시 취소하려 할 때 표시합니다.', message: '이미 취소된 예약입니다.' },
  { situation: 'reservation_cancelled_by_user', description: '예약 진행 중 사용자가 "취소" 입력 시 표시합니다.', message: '예약이 취소되었습니다.' },
  { situation: 'phone_format_error', description: '전화번호 형식이 잘못되었을 때 안내 문구입니다.', message: '전화번호 형식이 올바르지 않습니다.\n다시 입력해주세요.\n예: 010-1234-5678' },
  { situation: 'room_sold_out', description: '선택한 날짜에 재고가 없을 때 표시합니다.', message: '죄송합니다. 선택하신 날짜에는 남은 객실이 없습니다.\n다른 날짜를 선택하시거나 객실 타입을 변경해서 다시 시도해 주세요.' },
  { situation: 'saturday_day_use_confirm', description: '토요일 예약에서 "대실"을 선택했을 때 표시하는 문구입니다.', message: '토요일 대실 예약 가능한 객실을 안내해드리겠습니다.' },
  { situation: 'saturday_stay_confirm', description: '토요일 예약에서 "숙박"을 선택했을 때 표시하는 문구입니다.', message: '토요일 숙박 예약 가능한 객실을 안내해드리겠습니다.' },
  { situation: 'date_select_stay', description: '예약하기 > 숙박 > 날짜선택 후 객실 카드 위에 표시하는 문구입니다.', message: '선택하신 날짜에 예약 가능한 객실입니다.' },
  { situation: 'date_select_day_use', description: '예약하기 > 대실 > 날짜선택 후 객실 카드 위에 표시하는 문구입니다.', message: '선택하신 날짜에 대실 가능한 객실입니다.' },
];

async function main() {
  for (const { situation, description, message } of CHATBOT_SITUATIONS) {
    await prisma.chatbotMessage.upsert({
      where: { situation },
      create: { situation, description, message },
      update: { description, message },
    });
  }

  console.log('Seed completed (chatbot messages only).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
