import { Room, Reservation, ChatbotMessage, ChatHistory, ChatMessage, ChatbotSituation, PendingReservation, ReservationType, RoomInventoryAdjustment, Customer } from '@/types';

// 메모리 데이터 저장소
class DataStore {
  private rooms: Room[] = [];
  private reservations: Reservation[] = [];
  private reservationTypes: ReservationType[] = [];
  private customers: Customer[] = [];
  private chatbotMessages: Map<ChatbotSituation, ChatbotMessage> = new Map();
  private chatHistories: ChatHistory[] = [];
  private pendingReservations: Map<string, PendingReservation> = new Map(); // userId -> PendingReservation
  // 객실 타입 × 날짜 단위 재고 조정치 (roomId:date -> delta)
  private roomInventoryAdjustments: Map<string, RoomInventoryAdjustment> = new Map();

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
    default_greeting: '상황이 없거나 멘트를 불러오지 못할 때 사용하는 기본 인사입니다.',
    reservation_empty: '예약 내역이 없을 때 리스트 카드 대신 표시하는 문구입니다.',
    reservation_not_found: '예약 ID로 조회했으나 해당 예약이 없을 때 표시합니다.',
    reservation_already_cancelled: '이미 취소된 예약을 다시 취소하려 할 때 표시합니다.',
    reservation_cancelled_by_user: '예약 진행 중 사용자가 "취소" 입력 시 표시합니다.',
    phone_format_error: '전화번호 형식이 잘못되었을 때 안내 문구입니다.',
    room_sold_out: '선택한 날짜에 재고가 없을 때 표시합니다.',
    saturday_day_use_confirm: '토요일 예약에서 "대실"을 선택했을 때 표시하는 문구입니다.',
    saturday_stay_confirm: '토요일 예약에서 "숙박"을 선택했을 때 표시하는 문구입니다.',
    date_select_stay: '예약하기 > 숙박 > 날짜선택 후 객실 카드 위에 표시하는 문구입니다.',
    date_select_day_use: '예약하기 > 대실 > 날짜선택 후 객실 카드 위에 표시하는 문구입니다.',
  };

  // 초기 샘플 데이터
  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // 객실·예약 타입·알림톡 템플릿 등은 초기값 없음. 챗봇 멘트만 초기화.

    // 챗봇 멘트 데이터 (모든 상황 초기화)
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
      'default_greeting',
      'reservation_empty',
      'reservation_not_found',
      'reservation_already_cancelled',
      'reservation_cancelled_by_user',
      'phone_format_error',
      'room_sold_out',
      'saturday_day_use_confirm',
      'saturday_stay_confirm',
      'date_select_stay',
      'date_select_day_use',
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
      default_greeting: '안녕하세요! 무엇을 도와드릴까요?',
      reservation_empty: '예약 내역이 없습니다.',
      reservation_not_found: '해당 예약을 찾을 수 없습니다.',
      reservation_already_cancelled: '이미 취소된 예약입니다.',
      reservation_cancelled_by_user: '예약이 취소되었습니다.',
      phone_format_error: '전화번호 형식이 올바르지 않습니다.\n다시 입력해주세요.\n예: 010-1234-5678',
      room_sold_out: '죄송합니다. 선택하신 날짜에는 남은 객실이 없습니다.\n다른 날짜를 선택하시거나 객실 타입을 변경해서 다시 시도해 주세요.',
      saturday_day_use_confirm: '토요일 대실 예약 가능한 객실을 안내해드리겠습니다.',
      saturday_stay_confirm: '토요일 숙박 예약 가능한 객실을 안내해드리겠습니다.',
      date_select_stay: '선택하신 날짜에 예약 가능한 객실입니다.',
      date_select_day_use: '선택하신 날짜에 대실 가능한 객실입니다.',
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
  }

  // 객실 관련 메서드
  getRooms(): Room[] {
    // sortOrder가 설정되어 있으면 그것을 기준으로, 없으면 기존 등록 순서를 기준으로 정렬
    return this.rooms
      .map((room, index) => ({ room, index }))
      .sort((a, b) => {
        const orderA = a.room.sortOrder ?? a.index;
        const orderB = b.room.sortOrder ?? b.index;
        if (orderA === orderB) return 0;
        return orderA < orderB ? -1 : 1;
      })
      .map(({ room }) => room);
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.find(room => room.id === id);
  }

  addRoom(room: Omit<Room, 'id'>): Room {
    const currentMaxOrder =
      this.rooms.reduce((max, r) => {
        const v = r.sortOrder ?? 0;
        return v > max ? v : max;
      }, 0) || 0;

    const newRoom: Room = {
      ...room,
      id: Date.now().toString(),
      sortOrder: (room.sortOrder ?? currentMaxOrder + 1),
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

  // 재고 조정 관련 메서드
  private buildInventoryAdjustmentKey(roomId: string, date: string): string {
    return `${roomId}:${date}`;
  }

  /** 특정 객실/날짜에 대한 재고 조정치(delta) 조회 (없으면 0) */
  getRoomInventoryAdjustment(roomId: string, date: string): number {
    const key = this.buildInventoryAdjustmentKey(roomId, date);
    const item = this.roomInventoryAdjustments.get(key);
    return item?.delta ?? 0;
  }

  /** 특정 객실/날짜의 재고 조정치(delta)를 설정 (0이면 항목 제거) */
  setRoomInventoryAdjustment(roomId: string, date: string, delta: number): RoomInventoryAdjustment {
    const key = this.buildInventoryAdjustmentKey(roomId, date);
    if (delta === 0) {
      this.roomInventoryAdjustments.delete(key);
      return { roomId, date, delta: 0 };
    }
    const value: RoomInventoryAdjustment = { roomId, date, delta };
    this.roomInventoryAdjustments.set(key, value);
    return value;
  }

  /** 특정 날짜에 대한 모든 객실 재고 조정 목록 조회 */
  getRoomInventoryAdjustmentsForDate(date: string): RoomInventoryAdjustment[] {
    const result: RoomInventoryAdjustment[] = [];
    for (const item of this.roomInventoryAdjustments.values()) {
      if (item.date === date) {
        result.push(item);
      }
    }
    return result;
  }

  /** 날짜 범위(YYYY-MM-DD) 내 모든 재고 조정 목록 조회 */
  getRoomInventoryAdjustmentsInRange(startDate: string, endDate: string): RoomInventoryAdjustment[] {
    const result: RoomInventoryAdjustment[] = [];
    for (const item of this.roomInventoryAdjustments.values()) {
      if (item.date >= startDate && item.date <= endDate) {
        result.push(item);
      }
    }
    return result;
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

  // 고객 관련 메서드
  getCustomers(): Customer[] {
    return this.customers;
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  getCustomerByUserId(userId: string): Customer | undefined {
    return this.customers.find((c) => c.userId === userId);
  }

  getCustomerByPhone(phone: string): Customer | undefined {
    const normalized = phone.replace(/\D/g, '');
    return this.customers.find((c) => c.phone.replace(/\D/g, '') === normalized);
  }

  /** 수기 예약용: 전화번호로 고객 찾거나 없으면 생성 후 반환 */
  getOrCreateCustomerForManual(name: string, phone: string): Customer {
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const existing = this.getCustomerByPhone(trimmedPhone);
      if (existing) {
        if (name.trim() && existing.name !== name.trim()) {
          this.updateCustomer(existing.id, { name: name.trim() });
          return this.getCustomer(existing.id)!;
        }
        return existing;
      }
    }
    return this.addCustomer({
      name: name.trim() || '관리자 수기 예약',
      phone: trimmedPhone,
    });
  }

  addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...data,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  updateCustomer(id: string, updates: Partial<Omit<Customer, 'id'>>): Customer | null {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.customers[index] = {
      ...this.customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.customers[index];
  }

  /**
   * userId로 고객을 찾거나, 없으면 생성 후 반환. 이름/전화번호가 있으면 갱신.
   */
  getOrCreateCustomerByUserId(
    userId: string,
    data: { name?: string; phone?: string; memo?: string }
  ): Customer {
    let customer = this.getCustomerByUserId(userId);
    const now = new Date().toISOString();
    if (!customer) {
      customer = this.addCustomer({
        name: data.name?.trim() || (userId.length > 8 ? userId.slice(0, 8) : userId),
        phone: data.phone?.trim() || '',
        userId,
        memo: data.memo,
      });
    } else {
      const updates: Partial<Customer> = { updatedAt: now };
      if (data.name !== undefined && data.name.trim()) updates.name = data.name.trim();
      if (data.phone !== undefined) updates.phone = data.phone.trim();
      if (data.memo !== undefined) updates.memo = data.memo;
      if (Object.keys(updates).length > 1) {
        const updated = this.updateCustomer(customer.id, updates);
        if (updated) customer = updated;
      }
    }
    return customer;
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

    const baseInventory = room.inventory;
    if (baseInventory <= 0) return false;

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

    // 날짜별로 순회하면서 (기본 재고 + 조정치) 기준 재고 초과 여부 확인
    for (let d = new Date(dayStart); d < dayEnd; d.setDate(d.getDate() + 1)) {
      const slotStart = new Date(d);
      const slotEnd = new Date(slotStart);
      slotEnd.setDate(slotEnd.getDate() + 1);

      const y = slotStart.getFullYear();
      const m = String(slotStart.getMonth() + 1).padStart(2, '0');
      const day = String(slotStart.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      const delta = this.getRoomInventoryAdjustment(roomId, dateKey);
      const effectiveInventory = baseInventory + delta;

      if (effectiveInventory <= 0) {
        return false;
      }

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

      if (soldCount >= effectiveInventory) {
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

  getChatHistoryByCustomerId(customerId: string): ChatHistory | undefined {
    return this.chatHistories.find((h) => h.customerId === customerId);
  }

  /** 카카오 userId로 대화 내역 조회 (Customer.userId → customerId → ChatHistory) */
  getChatHistoryByUserId(userId: string): ChatHistory | undefined {
    const customer = this.getCustomerByUserId(userId);
    return customer ? this.getChatHistoryByCustomerId(customer.id) : undefined;
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

  /** customerId로 대화 내역 찾기 또는 생성 */
  getOrCreateChatHistoryByCustomerId(customerId: string): ChatHistory {
    let history = this.getChatHistoryByCustomerId(customerId);
    if (!history) {
      const now = new Date().toISOString();
      history = {
        id: Date.now().toString(),
        customerId,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      this.chatHistories.push(history);
    }
    return history;
  }

  /** 카카오 userId로 대화 내역 찾기 또는 생성 (고객 생성 후 customerId 기준으로 생성) */
  getOrCreateChatHistory(userId: string, userName?: string): ChatHistory {
    const customer = this.getOrCreateCustomerByUserId(userId, { name: userName });
    return this.getOrCreateChatHistoryByCustomerId(customer.id);
  }

  // 대화 내역에 메시지 추가 (userId → Customer → ChatHistory)
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
  updateChatHistory(id: string, updates: Partial<Pick<ChatHistory, 'messages'>>): ChatHistory | null {
    const index = this.chatHistories.findIndex((h) => h.id === id);
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
    // 동일 tplCode가 이미 있으면 중복 추가 대신 내용을 최신으로 갱신하고 맨 앞으로 이동
    const existingIndex = list.findIndex((x) => x.tplCode === tplCode);
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      list.splice(existingIndex, 1);
      list.unshift({
        tplCode,
        content,
        // savedAt은 항상 "가장 최근에 사용/연결한 시점"을 의미하도록 현재 시각으로 갱신
        savedAt: new Date().toISOString(),
      });
    } else {
      list.unshift({ tplCode, content, savedAt: new Date().toISOString() });
    }
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

// PostgreSQL 사용 시 dbStore로 전환. env에 DATABASE_URL이 있으면 DB 사용
const useDb = Boolean(process.env.DATABASE_URL?.trim());

// 싱글톤 인스턴스 - Next.js 개발 모드에서 모듈 재로드 시에도 유지되도록 전역 변수 사용
declare global {
  // eslint-disable-next-line no-var
  var __dataStore: DataStore | undefined;
}

if (typeof globalThis.__dataStore === 'undefined') {
  globalThis.__dataStore = new DataStore();
}

const memoryStore = globalThis.__dataStore;

// DATABASE_URL이 있으면 dbStore, 없으면 메모리 스토어 사용
// dbStore는 비동기이므로 호출 시 await 필요
export const dataStore = {
  getRooms: () => (useDb ? import('./db-store').then((m) => m.dbStore.getRooms()) : Promise.resolve(memoryStore.getRooms())),
  getRoom: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getRoom(id)) : Promise.resolve(memoryStore.getRoom(id))),
  addRoom: (room: Parameters<DataStore['addRoom']>[0]) => (useDb ? import('./db-store').then((m) => m.dbStore.addRoom(room)) : Promise.resolve(memoryStore.addRoom(room))),
  updateRoom: (id: string, updates: Partial<Room>) => (useDb ? import('./db-store').then((m) => m.dbStore.updateRoom(id, updates)) : Promise.resolve(memoryStore.updateRoom(id, updates))),
  deleteRoom: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.deleteRoom(id)) : Promise.resolve(memoryStore.deleteRoom(id))),
  getReservations: () => (useDb ? import('./db-store').then((m) => m.dbStore.getReservations()) : Promise.resolve(memoryStore.getReservations())),
  getReservation: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getReservation(id)) : Promise.resolve(memoryStore.getReservation(id))),
  addReservation: (r: Parameters<DataStore['addReservation']>[0]) => (useDb ? import('./db-store').then((m) => m.dbStore.addReservation(r)) : Promise.resolve(memoryStore.addReservation(r))),
  updateReservation: (id: string, u: Partial<Reservation>) => (useDb ? import('./db-store').then((m) => m.dbStore.updateReservation(id, u)) : Promise.resolve(memoryStore.updateReservation(id, u))),
  deleteReservation: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.deleteReservation(id)) : Promise.resolve(memoryStore.deleteReservation(id))),
  getRoomInventoryAdjustment: (roomId: string, date: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getRoomInventoryAdjustment(roomId, date)) : Promise.resolve(memoryStore.getRoomInventoryAdjustment(roomId, date))),
  setRoomInventoryAdjustment: (roomId: string, date: string, delta: number) => (useDb ? import('./db-store').then((m) => m.dbStore.setRoomInventoryAdjustment(roomId, date, delta)) : Promise.resolve(memoryStore.setRoomInventoryAdjustment(roomId, date, delta))),
  getRoomInventoryAdjustmentsForDate: (date: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getRoomInventoryAdjustmentsForDate(date)) : Promise.resolve(memoryStore.getRoomInventoryAdjustmentsForDate(date))),
  getRoomInventoryAdjustmentsInRange: (start: string, end: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getRoomInventoryAdjustmentsInRange(start, end)) : Promise.resolve(memoryStore.getRoomInventoryAdjustmentsInRange(start, end))),
  getReservationTypes: () => (useDb ? import('./db-store').then((m) => m.dbStore.getReservationTypes()) : Promise.resolve(memoryStore.getReservationTypes())),
  addReservationType: (t: Parameters<DataStore['addReservationType']>[0]) => (useDb ? import('./db-store').then((m) => m.dbStore.addReservationType(t)) : Promise.resolve(memoryStore.addReservationType(t))),
  updateReservationType: (id: string, u: Partial<ReservationType>) => (useDb ? import('./db-store').then((m) => m.dbStore.updateReservationType(id, u)) : Promise.resolve(memoryStore.updateReservationType(id, u))),
  deleteReservationType: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.deleteReservationType(id)) : Promise.resolve(memoryStore.deleteReservationType(id))),
  getCustomers: () => (useDb ? import('./db-store').then((m) => m.dbStore.getCustomers()) : Promise.resolve(memoryStore.getCustomers())),
  getCustomer: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getCustomer(id)) : Promise.resolve(memoryStore.getCustomer(id))),
  getCustomerByUserId: (userId: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getCustomerByUserId(userId)) : Promise.resolve(memoryStore.getCustomerByUserId(userId))),
  getCustomerByPhone: (phone: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getCustomerByPhone(phone)) : Promise.resolve(memoryStore.getCustomerByPhone(phone))),
  getOrCreateCustomerForManual: (name: string, phone: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getOrCreateCustomerForManual(name, phone)) : Promise.resolve(memoryStore.getOrCreateCustomerForManual(name, phone))),
  addCustomer: (d: Parameters<DataStore['addCustomer']>[0]) => (useDb ? import('./db-store').then((m) => m.dbStore.addCustomer(d)) : Promise.resolve(memoryStore.addCustomer(d))),
  updateCustomer: (id: string, u: Parameters<DataStore['updateCustomer']>[1]) => (useDb ? import('./db-store').then((m) => m.dbStore.updateCustomer(id, u)) : Promise.resolve(memoryStore.updateCustomer(id, u))),
  getOrCreateCustomerByUserId: (userId: string, d: Parameters<DataStore['getOrCreateCustomerByUserId']>[1]) => (useDb ? import('./db-store').then((m) => m.dbStore.getOrCreateCustomerByUserId(userId, d)) : Promise.resolve(memoryStore.getOrCreateCustomerByUserId(userId, d))),
  isRoomAvailable: (roomId: string, checkIn: string, checkOut: string, excludeId?: string) => (useDb ? import('./db-store').then((m) => m.dbStore.isRoomAvailable(roomId, checkIn, checkOut, excludeId)) : Promise.resolve(memoryStore.isRoomAvailable(roomId, checkIn, checkOut, excludeId))),
  getChatbotMessages: () => (useDb ? import('./db-store').then((m) => m.dbStore.getChatbotMessages()) : Promise.resolve(memoryStore.getChatbotMessages())),
  getChatbotMessage: (situation: import('@/types').ChatbotSituation) => (useDb ? import('./db-store').then((m) => m.dbStore.getChatbotMessage(situation)) : Promise.resolve(memoryStore.getChatbotMessage(situation))),
  updateChatbotMessage: (situation: import('@/types').ChatbotSituation, msg: string) => (useDb ? import('./db-store').then((m) => m.dbStore.updateChatbotMessage(situation, msg)) : Promise.resolve(memoryStore.updateChatbotMessage(situation, msg))),
  getChatHistories: () => (useDb ? import('./db-store').then((m) => m.dbStore.getChatHistories()) : Promise.resolve(memoryStore.getChatHistories())),
  getChatHistory: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getChatHistory(id)) : Promise.resolve(memoryStore.getChatHistory(id))),
  getChatHistoryByCustomerId: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getChatHistoryByCustomerId(id)) : Promise.resolve(memoryStore.getChatHistoryByCustomerId(id))),
  getChatHistoryByUserId: (userId: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getChatHistoryByUserId(userId)) : Promise.resolve(memoryStore.getChatHistoryByUserId(userId))),
  addChatHistory: (h: Parameters<DataStore['addChatHistory']>[0]) => (useDb ? import('./db-store').then((m) => m.dbStore.addChatHistory(h)) : Promise.resolve(memoryStore.addChatHistory(h))),
  getOrCreateChatHistoryByCustomerId: (id: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getOrCreateChatHistoryByCustomerId(id)) : Promise.resolve(memoryStore.getOrCreateChatHistoryByCustomerId(id))),
  getOrCreateChatHistory: (userId: string, userName?: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getOrCreateChatHistory(userId, userName)) : Promise.resolve(memoryStore.getOrCreateChatHistory(userId, userName))),
  addMessageToHistory: (userId: string, msg: Parameters<DataStore['addMessageToHistory']>[1]) => (useDb ? import('./db-store').then((m) => m.dbStore.addMessageToHistory(userId, msg)) : Promise.resolve(memoryStore.addMessageToHistory(userId, msg))),
  updateChatHistory: (id: string, u: Parameters<DataStore['updateChatHistory']>[1]) => (useDb ? import('./db-store').then((m) => m.dbStore.updateChatHistory(id, u)) : Promise.resolve(memoryStore.updateChatHistory(id, u))),
  savePendingReservation: (userId: string, d: Omit<import('@/types').PendingReservation, 'createdAt'>) => (useDb ? import('./db-store').then((m) => m.dbStore.savePendingReservation(userId, d)) : Promise.resolve(memoryStore.savePendingReservation(userId, d))),
  getPendingReservation: (userId: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getPendingReservation(userId)) : Promise.resolve(memoryStore.getPendingReservation(userId))),
  deletePendingReservation: (userId: string) => (useDb ? import('./db-store').then((m) => m.dbStore.deletePendingReservation(userId)) : Promise.resolve(memoryStore.deletePendingReservation(userId))),
  getTemplateHistory: (displayName: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getTemplateHistory(displayName)) : Promise.resolve(memoryStore.getTemplateHistory(displayName))),
  addTemplateHistory: (displayName: string, tplCode: string, content: string) => (useDb ? import('./db-store').then((m) => m.dbStore.addTemplateHistory(displayName, tplCode, content)) : Promise.resolve(memoryStore.addTemplateHistory(displayName, tplCode, content))),
  deleteTemplateHistoryItem: (displayName: string, tplCode: string) => (useDb ? import('./db-store').then((m) => m.dbStore.deleteTemplateHistoryItem(displayName, tplCode)) : Promise.resolve(memoryStore.deleteTemplateHistoryItem(displayName, tplCode))),
  setTemplateActive: (displayName: string, tplCode: string) => (useDb ? import('./db-store').then((m) => m.dbStore.setTemplateActive(displayName, tplCode)) : Promise.resolve(memoryStore.setTemplateActive(displayName, tplCode))),
  getTemplateActive: (displayName: string) => (useDb ? import('./db-store').then((m) => m.dbStore.getTemplateActive(displayName)) : Promise.resolve(memoryStore.getTemplateActive(displayName))),
  getChatbotMessageHistory: (situation: import('@/types').ChatbotSituation) => (useDb ? import('./db-store').then((m) => m.dbStore.getChatbotMessageHistory(situation)) : Promise.resolve(memoryStore.getChatbotMessageHistory(situation))),
  addChatbotMessageHistory: (situation: import('@/types').ChatbotSituation, msg: string) => (useDb ? import('./db-store').then((m) => m.dbStore.addChatbotMessageHistory(situation, msg)) : Promise.resolve(memoryStore.addChatbotMessageHistory(situation, msg))),
  deleteChatbotMessageHistoryItem: (situation: import('@/types').ChatbotSituation, idx: number) => (useDb ? import('./db-store').then((m) => m.dbStore.deleteChatbotMessageHistoryItem(situation, idx)) : Promise.resolve(memoryStore.deleteChatbotMessageHistoryItem(situation, idx))),
  cleanupExpiredReservations: () => (useDb ? import('./db-store').then((m) => m.dbStore.cleanupExpiredReservations()) : Promise.resolve(memoryStore.cleanupExpiredReservations())),
};

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
