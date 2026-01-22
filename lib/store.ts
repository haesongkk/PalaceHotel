import { Room, Reservation, ChatbotMessage, ChatHistory, ChatbotSituation } from '@/types';

// 메모리 데이터 저장소
class DataStore {
  private rooms: Room[] = [];
  private reservations: Reservation[] = [];
  private chatbotMessages: Map<ChatbotSituation, ChatbotMessage> = new Map();
  private chatHistories: ChatHistory[] = [];

  // 상황별 설명 정의
  private situationDescriptions: Record<ChatbotSituation, string> = {
    channel_added: '사용자가 카카오톡 채널을 추가했을 때 표시되는 환영 메시지입니다.',
    today_day_use: '사용자가 "오늘 대실" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    today_stay: '사용자가 "오늘 숙박" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    saturday_reservation: '사용자가 "토요일 예약" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    make_reservation: '사용자가 "예약하기" 버튼을 클릭했을 때 표시되는 안내 메시지입니다.',
    reservation_request: '사용자가 예약을 요청했을 때 표시되는 확인 메시지입니다.',
    reservation_confirmed: '예약이 확정되었을 때 사용자에게 전송되는 확정 메시지입니다.',
    reservation_inquiry: '사용자가 예약 내역을 조회했을 때 표시되는 안내 메시지입니다.',
  };

  // 초기 샘플 데이터
  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // 기본 요일별 가격 템플릿
    const defaultPrices = {
      monday: { stayPrice: 100000, dayUsePrice: 50000 },
      tuesday: { stayPrice: 100000, dayUsePrice: 50000 },
      wednesday: { stayPrice: 100000, dayUsePrice: 50000 },
      thursday: { stayPrice: 120000, dayUsePrice: 60000 },
      friday: { stayPrice: 150000, dayUsePrice: 70000 },
      saturday: { stayPrice: 180000, dayUsePrice: 80000 },
      sunday: { stayPrice: 150000, dayUsePrice: 70000 },
    };

    // 샘플 객실 데이터
    this.rooms = [
      {
        id: '1',
        imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
        type: '스탠다드',
        prices: defaultPrices,
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
        description: '기본 객실',
      },
      {
        id: '2',
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
        type: '디럭스',
        prices: {
          monday: { stayPrice: 150000, dayUsePrice: 70000 },
          tuesday: { stayPrice: 150000, dayUsePrice: 70000 },
          wednesday: { stayPrice: 150000, dayUsePrice: 70000 },
          thursday: { stayPrice: 170000, dayUsePrice: 80000 },
          friday: { stayPrice: 200000, dayUsePrice: 90000 },
          saturday: { stayPrice: 230000, dayUsePrice: 100000 },
          sunday: { stayPrice: 200000, dayUsePrice: 90000 },
        },
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
        description: '넓은 객실',
      },
      {
        id: '3',
        imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        type: '스위트',
        prices: {
          monday: { stayPrice: 250000, dayUsePrice: 120000 },
          tuesday: { stayPrice: 250000, dayUsePrice: 120000 },
          wednesday: { stayPrice: 250000, dayUsePrice: 120000 },
          thursday: { stayPrice: 270000, dayUsePrice: 130000 },
          friday: { stayPrice: 300000, dayUsePrice: 140000 },
          saturday: { stayPrice: 330000, dayUsePrice: 150000 },
          sunday: { stayPrice: 300000, dayUsePrice: 140000 },
        },
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
        description: '프리미엄 스위트',
      },
    ];

    // 샘플 예약 데이터
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    this.reservations = [
      {
        id: '1',
        roomId: '1',
        guestName: '홍길동',
        guestPhone: '010-1234-5678',
        checkIn: tomorrow.toISOString(),
        checkOut: dayAfter.toISOString(),
        status: 'confirmed',
        totalPrice: 200000,
        notes: '늦은 체크인 요청',
        createdAt: today.toISOString(),
      },
      {
        id: '2',
        roomId: '2',
        guestName: '김영희',
        guestPhone: '010-9876-5432',
        checkIn: today.toISOString(),
        checkOut: tomorrow.toISOString(),
        status: 'checked-in',
        totalPrice: 150000,
        createdAt: new Date(today.getTime() - 86400000).toISOString(),
      },
    ];

    // 샘플 챗봇 멘트 데이터 (8가지 상황 모두 초기화)
    const situations: ChatbotSituation[] = [
      'channel_added',
      'today_day_use',
      'today_stay',
      'saturday_reservation',
      'make_reservation',
      'reservation_request',
      'reservation_confirmed',
      'reservation_inquiry',
    ];

    const defaultMessages: Record<ChatbotSituation, string> = {
      channel_added: '안녕하세요! 호텔 예약 챗봇입니다. 무엇을 도와드릴까요?',
      today_day_use: '오늘 대실 가능한 객실을 안내해드리겠습니다.',
      today_stay: '오늘 숙박 가능한 객실을 안내해드리겠습니다.',
      saturday_reservation: '토요일 예약 가능한 객실을 안내해드리겠습니다.',
      make_reservation: '예약을 진행하시겠습니까? 원하시는 날짜와 인원수를 알려주세요.',
      reservation_request: '예약 요청이 접수되었습니다. 확인 후 연락드리겠습니다.',
      reservation_confirmed: '예약이 확정되었습니다. 감사합니다!',
      reservation_inquiry: '예약 내역을 조회해드리겠습니다.',
    };

    situations.forEach((situation) => {
      this.chatbotMessages.set(situation, {
        situation,
        description: this.situationDescriptions[situation],
        message: defaultMessages[situation],
        updatedAt: new Date().toISOString(),
      });
    });

    // 샘플 대화 내역 데이터
    this.chatHistories = [
      {
        id: '1',
        userId: 'user123',
        userName: '홍길동',
        messages: [
          {
            id: 'm1',
            sender: 'user',
            content: '예약하고 싶어요',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'm2',
            sender: 'bot',
            content: '예약 문의를 도와드리겠습니다. 원하시는 날짜와 인원수를 알려주세요.',
            timestamp: new Date(Date.now() - 3590000).toISOString(),
          },
          {
            id: 'm3',
            sender: 'user',
            content: '내일부터 2박 3일, 2명이요',
            timestamp: new Date(Date.now() - 3580000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3580000).toISOString(),
      },
      {
        id: '2',
        userId: 'user456',
        userName: '김영희',
        messages: [
          {
            id: 'm4',
            sender: 'user',
            content: '체크인 시간이 언제인가요?',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'm5',
            sender: 'bot',
            content: '체크인 시간은 오후 3시부터입니다. 조기 체크인은 객실 상황에 따라 가능합니다.',
            timestamp: new Date(Date.now() - 7190000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7190000).toISOString(),
      },
    ];
  }

  // 객실 관련 메서드
  getRooms(): Room[] {
    return this.rooms;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.find(room => room.id === id);
  }

  addRoom(room: Omit<Room, 'id'>): Room {
    const newRoom: Room = {
      ...room,
      id: Date.now().toString(),
    };
    this.rooms.push(newRoom);
    return newRoom;
  }

  updateRoom(id: string, updates: Partial<Room>): Room | null {
    const index = this.rooms.findIndex(room => room.id === id);
    if (index === -1) return null;
    this.rooms[index] = { ...this.rooms[index], ...updates };
    return this.rooms[index];
  }

  deleteRoom(id: string): boolean {
    const index = this.rooms.findIndex(room => room.id === id);
    if (index === -1) return false;
    this.rooms.splice(index, 1);
    return true;
  }

  // 예약 관련 메서드
  getReservations(): Reservation[] {
    return this.reservations;
  }

  getReservation(id: string): Reservation | undefined {
    return this.reservations.find(res => res.id === id);
  }

  addReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>): Reservation {
    const newReservation: Reservation = {
      ...reservation,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.reservations.push(newReservation);
    return newReservation;
  }

  updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const index = this.reservations.findIndex(res => res.id === id);
    if (index === -1) return null;
    this.reservations[index] = { ...this.reservations[index], ...updates };
    return this.reservations[index];
  }

  deleteReservation(id: string): boolean {
    const index = this.reservations.findIndex(res => res.id === id);
    if (index === -1) return false;
    this.reservations.splice(index, 1);
    return true;
  }

  // 챗봇 멘트 관련 메서드
  getChatbotMessages(): ChatbotMessage[] {
    return Array.from(this.chatbotMessages.values());
  }

  getChatbotMessage(situation: ChatbotSituation): ChatbotMessage | undefined {
    return this.chatbotMessages.get(situation);
  }

  updateChatbotMessage(situation: ChatbotSituation, message: string): ChatbotMessage | null {
    const existing = this.chatbotMessages.get(situation);
    if (!existing) return null;
    
    const updated: ChatbotMessage = {
      ...existing,
      message,
      updatedAt: new Date().toISOString(),
    };
    this.chatbotMessages.set(situation, updated);
    return updated;
  }

  // 대화 내역 관련 메서드
  getChatHistories(): ChatHistory[] {
    return this.chatHistories;
  }

  getChatHistory(id: string): ChatHistory | undefined {
    return this.chatHistories.find(history => history.id === id);
  }

  addChatHistory(history: Omit<ChatHistory, 'id' | 'createdAt' | 'updatedAt'>): ChatHistory {
    const now = new Date().toISOString();
    const newHistory: ChatHistory = {
      ...history,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    this.chatHistories.push(newHistory);
    return newHistory;
  }
}

// 싱글톤 인스턴스
export const dataStore = new DataStore();
