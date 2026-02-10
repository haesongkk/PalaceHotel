import { Room, Reservation, ChatbotMessage, ChatHistory, ChatMessage, ChatbotSituation, PendingReservation, ReservationType } from '@/types';

// 메모리 데이터 저장소
class DataStore {
  private rooms: Room[] = [];
  private reservations: Reservation[] = [];
  private reservationTypes: ReservationType[] = [];
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
      monday: { stayPrice: 30000, dayUsePrice: 30000 },
      tuesday: { stayPrice: 30000, dayUsePrice: 30000 },
      wednesday: { stayPrice: 30000, dayUsePrice: 30000 },
      thursday: { stayPrice: 30000, dayUsePrice: 30000 },
      friday: { stayPrice: 30000, dayUsePrice: 30000 },
      saturday: { stayPrice: 30000, dayUsePrice: 30000 },
      sunday: { stayPrice: 30000, dayUsePrice: 30000 },
    };

    // 샘플 객실 데이터 (짧은 이미지 URL 사용)
    this.rooms = [
      {
        id: '1',
        imageUrl: 'https://picsum.photos/800/600?random=1',
        inventory: 10,
        type: '올나잇대실',
        discountRate: 10,
        prices: defaultPrices,
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
      },
      {
        id: '2',
        imageUrl: 'https://picsum.photos/800/600?random=2',
        inventory: 8,
        type: '2PC게임',
        discountRate: 10,
        prices: {
          monday: { stayPrice: 60000, dayUsePrice: 30000 },
          tuesday: { stayPrice: 60000, dayUsePrice: 30000 },
          wednesday: { stayPrice: 60000, dayUsePrice: 30000 },
          thursday: { stayPrice: 60000, dayUsePrice: 30000 },
          friday: { stayPrice: 70000, dayUsePrice: 40000 },
          saturday: { stayPrice: 80000, dayUsePrice: 50000 },
          sunday: { stayPrice: 90000, dayUsePrice: 60000 },
        },
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
      },
      {
        id: '3',
        imageUrl: 'https://picsum.photos/800/600?random=3',
        inventory: 5,
        type: '디럭스',
        discountRate: 10,
        prices: {
          monday: { stayPrice: 35000, dayUsePrice: 20000 },
          tuesday: { stayPrice: 35000, dayUsePrice: 20000 },
          wednesday: { stayPrice: 35000, dayUsePrice: 20000 },
          thursday: { stayPrice: 35000, dayUsePrice: 20000 },
          friday: { stayPrice: 45000, dayUsePrice: 30000 },
          saturday: { stayPrice: 55000, dayUsePrice: 40000 },
          sunday: { stayPrice: 65000, dayUsePrice: 50000 },
        },
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
      },
      {
        id: '4',
        imageUrl: 'https://picsum.photos/800/600?random=4',
        inventory: 8,
        type: '도보특가',
        discountRate: 10,
        prices: {
          monday: { stayPrice: 60000, dayUsePrice: 30000 },
          tuesday: { stayPrice: 60000, dayUsePrice: 30000 },
          wednesday: { stayPrice: 60000, dayUsePrice: 30000 },
          thursday: { stayPrice: 60000, dayUsePrice: 30000 },
          friday: { stayPrice: 70000, dayUsePrice: 40000 },
          saturday: { stayPrice: 80000, dayUsePrice: 50000 },
          sunday: { stayPrice: 90000, dayUsePrice: 60000 },
        },
        dayUseCheckIn: '10:00',
        dayUseCheckOut: '18:00',
        stayCheckIn: '15:00',
        stayCheckOut: '11:00',
      },
    ];

    // 예약 타입 샘플 데이터 (수기 예약용)
    // 기본 타입: "일반" (수정/삭제 불가)
    this.reservationTypes = [
      {
        id: 'default',
        name: '일반',
        color: 'bg-gray-100 text-gray-800',
        createdAt: new Date().toISOString(),
      },
    ];

    // 예약 데이터: 2월 수기 예약 더미 데이터
    this.reservations = this.buildFebruaryDummyReservations();

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
      make_reservation: '예약을 진행하시겠습니까? 원하시는 날짜를 알려주세요.',
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

    // 알림톡 템플릿 활성 코드 더미 초기값 (처음 실행 시 기본 연결용)
    // TODO: 실제 알리고 templtCode 값으로 교체해서 사용하세요.
    const initialTemplateActive: Array<{ displayName: string; tplCode: string }> = [
      { displayName: '예약 요청 알림', tplCode: 'UF_2255' },
      { displayName: '예약 취소 알림', tplCode: 'UF_4109' },
      { displayName: '예약 확정 안내', tplCode: 'UF_2256' },
      { displayName: '예약 거절 안내', tplCode: 'UF_2257' },
      { displayName: '예약 취소 안내', tplCode: 'UF_4110' },
    ];

    initialTemplateActive.forEach(({ displayName, tplCode }) => {
      if (tplCode) {
        this.templateActiveMapping.set(displayName, tplCode);
      }
    });
  }

  private buildFebruaryDummyReservations(): Reservation[] {
    const year = new Date().getFullYear();
    const toISO = (y: number, m: number, d: number) =>
      new Date(y, m - 1, d, 12, 0, 0).toISOString();

    type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    const getDayKey = (date: Date): DayOfWeek => {
      const map: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return map[date.getDay()];
    };

    const calcPrice = (room: Room, checkIn: string, checkOut: string): number => {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      let total = 0;
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const key = getDayKey(d);
        total += room.prices[key]?.stayPrice ?? 30000;
      }
      return total || 30000;
    };

    // [year, MMDD] 형태 - 201=2/1, 228=2/28, 301=3/1
    const dummySpecs: Array<{ roomId: string; checkIn: [number, number]; checkOut: [number, number]; memo?: string }> = [
      { roomId: '1', checkIn: [year, 201], checkOut: [year, 202],  memo: '전화 예약' },
      { roomId: '2', checkIn: [year, 203], checkOut: [year, 205],  memo: 'OTA 예약' },
      { roomId: '3', checkIn: [year, 205], checkOut: [year, 207], },
      { roomId: '4', checkIn: [year, 207], checkOut: [year, 208],  memo: '단체 할인' },
      { roomId: '1', checkIn: [year, 208], checkOut: [year, 210], },
      { roomId: '2', checkIn: [year, 210], checkOut: [year, 212],  memo: '회원 할인' },
      { roomId: '3', checkIn: [year, 212], checkOut: [year, 214], },
      { roomId: '4', checkIn: [year, 214], checkOut: [year, 216],  memo: '전화 예약' },
      { roomId: '1', checkIn: [year, 215], checkOut: [year, 216], },
      { roomId: '2', checkIn: [year, 217], checkOut: [year, 219],  memo: '대실' },
      { roomId: '3', checkIn: [year, 218], checkOut: [year, 220], },
      { roomId: '4', checkIn: [year, 220], checkOut: [year, 222],  memo: 'OTA 예약' },
      { roomId: '1', checkIn: [year, 221], checkOut: [year, 223], },
      { roomId: '2', checkIn: [year, 223], checkOut: [year, 225],  memo: '주말 예약' },
      { roomId: '3', checkIn: [year, 225], checkOut: [year, 227], },
      { roomId: '4', checkIn: [year, 227], checkOut: [year, 228],  memo: '전화 예약' },
      { roomId: '1', checkIn: [year, 228], checkOut: [year, 301], },
    ];

    const base = Date.now();
    const list: Reservation[] = [];
    for (let i = 0; i < dummySpecs.length; i++) {
      const s = dummySpecs[i];
      const [y, mdIn] = s.checkIn;
      const [_, mdOut] = s.checkOut;
      const mIn = Math.floor(mdIn / 100);
      const dIn = mdIn % 100;
      const mOut = Math.floor(mdOut / 100);
      const dOut = mdOut % 100;
      const checkIn = toISO(y, mIn, dIn);
      const checkOut = toISO(y, mOut, dOut);
      const room = this.rooms.find((r) => r.id === s.roomId);
      const totalPrice = room ? calcPrice(room, checkIn, checkOut) : 50000;
      list.push({
        id: `dummy-feb-${i + 1}-${base}`,
        roomId: s.roomId,
        guestName: '',
        guestPhone: '',
        checkIn,
        checkOut,
        status: 'confirmed',
        totalPrice,
        source: 'manual',
        reservationTypeId: 'default',
        adminMemo: s.memo,
        createdAt: toISO(y, 1, 1),
      });
    }
    return list;
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

  // 예약 타입 관련 메서드
  getReservationTypes(): ReservationType[] {
    return this.reservationTypes;
  }

  addReservationType(type: Omit<ReservationType, 'id' | 'createdAt'>): ReservationType {
    const newType: ReservationType = {
      ...type,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.reservationTypes.push(newType);
    return newType;
  }

  updateReservationType(id: string, updates: Partial<ReservationType>): ReservationType | null {
    // 기본 타입 "일반"은 수정 불가
    if (id === 'default') {
      return this.reservationTypes.find((t) => t.id === 'default') ?? null;
    }
    const index = this.reservationTypes.findIndex((t) => t.id === id);
    if (index === -1) return null;
    this.reservationTypes[index] = { ...this.reservationTypes[index], ...updates };
    return this.reservationTypes[index];
  }

  deleteReservationType(id: string): boolean {
    // 기본 타입 "일반"은 삭제 불가
    if (id === 'default') return false;
    const index = this.reservationTypes.findIndex((t) => t.id === id);
    if (index === -1) return false;

    // 해당 타입을 사용 중인 예약들의 reservationTypeId는 남겨두되,
    // 타입 목록에서만 제거 (과거 데이터 표시용)
    this.reservationTypes.splice(index, 1);
    return true;
  }

  /**
   * 특정 객실이 주어진 기간 동안 재고 내에서 예약 가능한지 여부를 체크
   * - 숙박: 체크인 포함, 체크아웃 당일은 제외하는 일반 호텔 룰
   * - 대실(당일 이용): checkIn과 checkOut 날짜가 같으면 그 날짜 하루를 점유하는 것으로 처리
   * - 대기/확정 상태의 예약만 재고를 점유한다고 가정
   */
  isRoomAvailable(roomId: string, checkIn: string, checkOut: string, excludeReservationId?: string): boolean {
    const room = this.getRoom(roomId);
    if (!room) return false;

    const totalInventory = room.inventory;
    if (totalInventory <= 0) return false;

    const start = new Date(checkIn);
    const rawEnd = new Date(checkOut);

    // 유효하지 않은 기간이면 예약 불가
    if (!(start instanceof Date) || isNaN(start.getTime()) || !(rawEnd instanceof Date) || isNaN(rawEnd.getTime())) {
      return false;
    }

    // 날짜 단위 비교를 위해 시각 제거
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(rawEnd);
    dayEnd.setHours(0, 0, 0, 0);

    // checkOut 날짜가 checkIn 날짜보다 이전이면 잘못된 입력
    if (dayEnd < dayStart) return false;

    // 대실: checkIn과 checkOut이 같은 날짜인 경우, 그 날 하루만 점유하도록 dayEnd를 +1일
    if (dayEnd.getTime() === dayStart.getTime()) {
      dayEnd.setDate(dayEnd.getDate() + 1);
    }

    const effectiveStatuses = ['pending', 'confirmed'] as const;

    const reservations = this.reservations.filter((r) => {
      if (r.roomId !== roomId) return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      return effectiveStatuses.includes(r.status as (typeof effectiveStatuses)[number]);
    });

    // 날짜별로 순회하면서 재고 초과 여부 확인
    for (let d = new Date(dayStart); d < dayEnd; d.setDate(d.getDate() + 1)) {
      const slotStart = new Date(d);
      const slotEnd = new Date(slotStart);
      slotEnd.setDate(slotEnd.getDate() + 1);

      const soldCount = reservations.filter((r) => {
        const resStart = new Date(r.checkIn);
        const resEndRaw = new Date(r.checkOut);

        const resDayStart = new Date(resStart);
        resDayStart.setHours(0, 0, 0, 0);
        const resDayEnd = new Date(resEndRaw);
        resDayEnd.setHours(0, 0, 0, 0);

        // 대실 예약: checkIn과 checkOut 날짜가 같으면 하루만 점유
        if (resDayEnd.getTime() === resDayStart.getTime()) {
          resDayEnd.setDate(resDayEnd.getDate() + 1);
        }

        // [resDayStart, resDayEnd) 와 [slotStart, slotEnd) 가 겹치는지 확인
        return resDayStart < slotEnd && resDayEnd > slotStart;
      }).length;

      if (soldCount >= totalInventory) {
        return false;
      }
    }

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
