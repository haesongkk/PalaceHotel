import { Room, Reservation, ChatbotMessage, ChatHistory, ChatMessage, ChatbotSituation, PendingReservation } from '@/types';

// 메모리 데이터 저장소
class DataStore {
  private rooms: Room[] = [];
  private reservations: Reservation[] = [];
  private chatbotMessages: Map<ChatbotSituation, ChatbotMessage> = new Map();
  private chatHistories: ChatHistory[] = [];
  private pendingReservations: Map<string, PendingReservation> = new Map(); // userId -> PendingReservation

  // 상황별 설명 정의
  private situationDescriptions: Record<ChatbotSituation, string> = {
    channel_added: '사용자가 카카오톡 채널을 추가했을 때 표시되는 환영 메시지입니다.',
    today_day_use: '사용자가 "오늘 대실" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    today_stay: '사용자가 "오늘 숙박" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    saturday_reservation: '사용자가 "토요일 예약" 옵션을 선택했을 때 표시되는 안내 메시지입니다.',
    make_reservation: '사용자가 "예약하기" 버튼을 클릭했을 때 표시되는 안내 메시지입니다.',
    phone_input_request: '사용자가 객실을 선택한 후 전화번호를 입력하도록 요청할 때 표시되는 안내 메시지입니다.',
    reservation_request: '사용자가 예약을 요청했을 때 표시되는 확인 메시지입니다.',
    reservation_inquiry: '사용자가 예약 내역을 조회했을 때 표시되는 안내 메시지입니다.',
    reservation_cancel: '사용자가 예약을 취소했을 때 표시되는 안내 메시지입니다.',
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

    // 샘플 객실 데이터 (짧은 이미지 URL 사용)
    this.rooms = [
      {
        id: '1',
        imageUrl: 'https://picsum.photos/800/600?random=1',
        type: '스탠다드',
        discountRate: 10,
        prices: defaultPrices,
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
        description: '기본 객실',
      },
      {
        id: '2',
        imageUrl: 'https://picsum.photos/800/600?random=2',
        type: '디럭스',
        discountRate: 10,
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
        imageUrl: 'https://picsum.photos/800/600?random=3',
        type: '스위트',
        discountRate: 10,
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

    // 예약 데이터는 빈 배열로 시작 (실제 예약은 카카오 채널/API로 추가됨)
    this.reservations = [];

    // 샘플 챗봇 멘트 데이터 (10가지 상황 모두 초기화)
    const situations: ChatbotSituation[] = [
      'channel_added',
      'today_day_use',
      'today_stay',
      'saturday_reservation',
      'make_reservation',
      'phone_input_request',
      'reservation_request',
      'reservation_inquiry',
      'reservation_cancel',
    ];

    const defaultMessages: Record<ChatbotSituation, string> = {
      channel_added: '안녕하세요! 호텔 예약 챗봇입니다. 무엇을 도와드릴까요?',
      today_day_use: '오늘 대실 가능한 객실을 안내해드리겠습니다.',
      today_stay: '오늘 숙박 가능한 객실을 안내해드리겠습니다.',
      saturday_reservation: '토요일 예약 가능한 객실을 안내해드리겠습니다.',
      make_reservation: '예약을 진행하시겠습니까? 원하시는 날짜와 인원수를 알려주세요.',
      phone_input_request: '예약을 완료하기 위해 전화번호를 입력해주세요.\n형식: 010-1234-5678',
      reservation_request: '예약 요청이 접수되었습니다. 확인 후 연락드리겠습니다.',
      reservation_inquiry: '예약 내역을 조회해드리겠습니다.',
      reservation_cancel: '예약이 취소되었습니다. 다른 도움이 필요하시면 말씀해주세요.',
    };

    situations.forEach((situation) => {
      this.chatbotMessages.set(situation, {
        situation,
        description: this.situationDescriptions[situation],
        message: defaultMessages[situation],
        updatedAt: new Date().toISOString(),
      });
    });

    // chatHistories는 이미 빈 배열로 선언되어 있으므로 초기화하지 않음
    // 실제 대화 내역은 addMessageToHistory()를 통해 추가됨
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
    if (existing.message !== message) {
      this.addChatbotMessageHistory(situation, existing.message);
    }
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

  getChatHistoryByUserId(userId: string): ChatHistory | undefined {
    return this.chatHistories.find(history => history.userId === userId);
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

  // 표시용 기본 이름: userId 앞 8자 (또는 전체)
  private defaultUserName(userId: string): string {
    return userId.length > 8 ? userId.slice(0, 8) : userId;
  }

  // 사용자별 대화 내역 찾기 또는 생성 (생성 시 슬라이스한 userId를 userName으로 저장)
  getOrCreateChatHistory(userId: string, userName?: string): ChatHistory {
    let history = this.chatHistories.find(h => h.userId === userId);
    const defaultName = this.defaultUserName(userId);

    if (!history) {
      const now = new Date().toISOString();
      history = {
        id: Date.now().toString(),
        userId,
        userName: userName?.trim() || defaultName,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      this.chatHistories.push(history);
    } else {
      if (userName?.trim() && history.userName !== userName.trim()) {
        history.userName = userName.trim();
      } else if (!history.userName?.trim()) {
        // 기존 내역에 이름이 없으면 슬라이스한 값을 저장
        history.userName = defaultName;
      }
    }

    return history;
  }

  // 대화 내역에 메시지 추가
  addMessageToHistory(
    userId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): ChatMessage {
    const history = this.getOrCreateChatHistory(userId);
    const now = new Date().toISOString();
    
    const newMessage: ChatMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
    };
    
    history.messages.push(newMessage);
    history.updatedAt = now;
    
    return newMessage;
  }

  // 대화 내역 업데이트
  updateChatHistory(id: string, updates: Partial<ChatHistory>): ChatHistory | null {
    const index = this.chatHistories.findIndex(h => h.id === id);
    if (index === -1) return null;
    
    this.chatHistories[index] = {
      ...this.chatHistories[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    return this.chatHistories[index];
  }

  // 임시 예약 정보 관련 메서드
  savePendingReservation(userId: string, data: Omit<PendingReservation, 'createdAt'>): PendingReservation {
    const pending: PendingReservation = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.pendingReservations.set(userId, pending);
    return pending;
  }

  getPendingReservation(userId: string): PendingReservation | undefined {
    return this.pendingReservations.get(userId);
  }

  deletePendingReservation(userId: string): boolean {
    return this.pendingReservations.delete(userId);
  }

  // 알림톡 템플릿 이전 버전 & 활성 매핑 (메모리)
  private templateHistory: Map<string, Array<{ tplCode: string; content: string; savedAt: string }>> = new Map();
  private templateActiveMapping: Map<string, string> = new Map(); // displayName -> tplCode

  getTemplateHistory(displayName: string): Array<{ tplCode: string; content: string; savedAt: string }> {
    return this.templateHistory.get(displayName) ?? [];
  }

  addTemplateHistory(displayName: string, tplCode: string, content: string): void {
    const list = this.templateHistory.get(displayName) ?? [];
    list.unshift({ tplCode, content, savedAt: new Date().toISOString() });
    if (list.length > 10) list.pop();
    this.templateHistory.set(displayName, list);
  }

  deleteTemplateHistoryItem(displayName: string, tplCode: string): void {
    const list = this.templateHistory.get(displayName) ?? [];
    const idx = list.findIndex((x) => x.tplCode === tplCode);
    if (idx >= 0) {
      list.splice(idx, 1);
      this.templateHistory.set(displayName, list);
      if (this.templateActiveMapping.get(displayName) === tplCode) {
        this.templateActiveMapping.set(displayName, list[0]?.tplCode ?? '');
      }
    }
  }

  setTemplateActive(displayName: string, tplCode: string): void {
    this.templateActiveMapping.set(displayName, tplCode);
  }

  getTemplateActive(displayName: string): string | undefined {
    return this.templateActiveMapping.get(displayName);
  }

  // 챗봇 멘트 이전 버전 (메모리)
  private chatbotMessageHistory: Map<ChatbotSituation, Array<{ message: string; savedAt: string }>> = new Map();

  getChatbotMessageHistory(situation: ChatbotSituation): Array<{ message: string; savedAt: string }> {
    return this.chatbotMessageHistory.get(situation) ?? [];
  }

  addChatbotMessageHistory(situation: ChatbotSituation, message: string): void {
    const list = this.chatbotMessageHistory.get(situation) ?? [];
    list.unshift({ message, savedAt: new Date().toISOString() });
    if (list.length > 10) list.pop();
    this.chatbotMessageHistory.set(situation, list);
  }

  deleteChatbotMessageHistoryItem(situation: ChatbotSituation, index: number): void {
    const list = this.chatbotMessageHistory.get(situation) ?? [];
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this.chatbotMessageHistory.set(situation, list);
    }
  }

  // 만료된 임시 예약 정보 정리 (10분 이상 경과)
  cleanupExpiredReservations(): number {
    const now = new Date().getTime();
    const expiredMinutes = 10;
    let cleaned = 0;

    for (const [userId, pending] of this.pendingReservations.entries()) {
      const createdAt = new Date(pending.createdAt).getTime();
      const diffMinutes = (now - createdAt) / (1000 * 60);
      
      if (diffMinutes > expiredMinutes) {
        this.pendingReservations.delete(userId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// 싱글톤 인스턴스 - Next.js 개발 모드에서 모듈 재로드 시에도 유지되도록 전역 변수 사용
declare global {
  // eslint-disable-next-line no-var
  var __dataStore: DataStore | undefined;
}

// 전역 변수를 사용하여 모듈 재로드 시에도 동일한 인스턴스 유지
if (typeof globalThis.__dataStore === 'undefined') {
  globalThis.__dataStore = new DataStore();
}

export const dataStore = globalThis.__dataStore;

// 관리자 채팅 입력: 모듈 레벨 Map 사용 (Next.js 번들/캐시 이슈 회피)
const pendingAdminMessagesMap = new Map<string, string>();

export function setPendingAdminMessage(userId: string, text: string): void {
  pendingAdminMessagesMap.set(String(userId), text);
}

export function getAndClearPendingAdminMessage(userId: string): string | null {
  const key = String(userId);
  const text = pendingAdminMessagesMap.get(key) ?? null;
  pendingAdminMessagesMap.delete(key);
  return text;
}
