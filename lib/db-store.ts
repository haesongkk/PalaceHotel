import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import type {
  Room,
  Reservation,
  ChatbotMessage,
  ChatHistory,
  ChatMessage,
  ChatbotSituation,
  PendingReservation,
  ReservationType,
  RoomInventoryAdjustment,
  Customer,
  DayOfWeek,
} from '@/types';

const CHATBOT_SITUATIONS: ChatbotSituation[] = [
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

const SITUATION_DESCRIPTIONS: Record<ChatbotSituation, string> = {
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

function toDateStr(d: Date): string {
  return d.toISOString();
}
function toRoom(r: { id: string; imageUrl: string | null; type: string; inventory: number; discountRate: number | null; sortOrder: number | null; prices: unknown; dayUseCheckIn: string; dayUseCheckOut: string; stayCheckIn: string; stayCheckOut: string }): Room {
  return {
    id: r.id,
    imageUrl: r.imageUrl ?? undefined,
    type: r.type,
    inventory: r.inventory,
    discountRate: r.discountRate ?? undefined,
    sortOrder: r.sortOrder ?? undefined,
    prices: r.prices as Record<DayOfWeek, { stayPrice: number; dayUsePrice: number }>,
    dayUseCheckIn: r.dayUseCheckIn,
    dayUseCheckOut: r.dayUseCheckOut,
    stayCheckIn: r.stayCheckIn,
    stayCheckOut: r.stayCheckOut,
  };
}
function toCustomer(c: { id: string; name: string; phone: string; userId: string | null; memo: string | null; createdAt: Date; updatedAt: Date }): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    userId: c.userId ?? undefined,
    memo: c.memo ?? undefined,
    createdAt: toDateStr(c.createdAt),
    updatedAt: toDateStr(c.updatedAt),
  };
}
function toReservation(r: { id: string; roomId: string; customerId: string; source: string | null; reservationTypeId: string | null; checkIn: Date; checkOut: Date; status: string; totalPrice: number; adminMemo: string | null; guestCancellationConfirmed: boolean | null; createdAt: Date }): Reservation {
  return {
    id: r.id,
    roomId: r.roomId,
    customerId: r.customerId,
    source: (r.source as 'kakao' | 'manual') ?? undefined,
    reservationTypeId: r.reservationTypeId ?? undefined,
    checkIn: toDateStr(r.checkIn),
    checkOut: toDateStr(r.checkOut),
    status: r.status as Reservation['status'],
    totalPrice: r.totalPrice,
    adminMemo: r.adminMemo ?? undefined,
    guestCancellationConfirmed: r.guestCancellationConfirmed ?? undefined,
    createdAt: toDateStr(r.createdAt),
  };
}
function toReservationType(t: { id: string; name: string; color: string; createdAt: Date }): ReservationType {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    createdAt: toDateStr(t.createdAt),
  };
}
function toChatbotMessage(m: { situation: string; description: string; message: string; updatedAt: Date }): ChatbotMessage {
  return {
    situation: m.situation as ChatbotSituation,
    description: m.description,
    message: m.message,
    updatedAt: toDateStr(m.updatedAt),
  };
}
function toChatHistory(h: { id: string; customerId: string; messages: unknown; createdAt: Date; updatedAt: Date }): ChatHistory {
  return {
    id: h.id,
    customerId: h.customerId,
    messages: (h.messages as ChatMessage[]) ?? [],
    createdAt: toDateStr(h.createdAt),
    updatedAt: toDateStr(h.updatedAt),
  };
}
function toPendingReservation(p: { userId: string; roomId: string; checkIn: Date; checkOut: Date; totalPrice: number; createdAt: Date }): PendingReservation {
  return {
    roomId: p.roomId,
    checkIn: toDateStr(p.checkIn),
    checkOut: toDateStr(p.checkOut),
    totalPrice: p.totalPrice,
    createdAt: toDateStr(p.createdAt),
  };
}

/** PostgreSQL 기반 비동기 데이터 스토어 */
export const dbStore = {
  async getRooms(): Promise<Room[]> {
    const list = await prisma.room.findMany({ orderBy: { sortOrder: 'asc' } });
    return list.map(toRoom);
  },

  async getRoom(id: string): Promise<Room | undefined> {
    const r = await prisma.room.findUnique({ where: { id } });
    return r ? toRoom(r) : undefined;
  },

  async addRoom(room: Omit<Room, 'id'>): Promise<Room> {
    const maxOrder = await prisma.room.aggregate({ _max: { sortOrder: true } });
    const sortOrder = room.sortOrder ?? ((maxOrder._max.sortOrder ?? 0) + 1);
    const created = await prisma.room.create({
      data: {
        imageUrl: room.imageUrl,
        type: room.type,
        inventory: room.inventory,
        discountRate: room.discountRate,
        sortOrder,
        prices: room.prices as unknown as Prisma.InputJsonValue,
        dayUseCheckIn: room.dayUseCheckIn,
        dayUseCheckOut: room.dayUseCheckOut,
        stayCheckIn: room.stayCheckIn,
        stayCheckOut: room.stayCheckOut,
      },
    });
    return toRoom(created);
  },

  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await prisma.room.update({
      where: { id },
      data: {
        ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
        ...(updates.type !== undefined && { type: updates.type }),
        ...(updates.inventory !== undefined && { inventory: updates.inventory }),
        ...(updates.discountRate !== undefined && { discountRate: updates.discountRate }),
        ...(updates.sortOrder !== undefined && { sortOrder: updates.sortOrder }),
        ...(updates.prices !== undefined && { prices: updates.prices as unknown as Prisma.InputJsonValue }),
        ...(updates.dayUseCheckIn !== undefined && { dayUseCheckIn: updates.dayUseCheckIn }),
        ...(updates.dayUseCheckOut !== undefined && { dayUseCheckOut: updates.dayUseCheckOut }),
        ...(updates.stayCheckIn !== undefined && { stayCheckIn: updates.stayCheckIn }),
        ...(updates.stayCheckOut !== undefined && { stayCheckOut: updates.stayCheckOut }),
      },
    });
    return toRoom(updated);
  },

  async deleteRoom(id: string): Promise<boolean> {
    try {
      await prisma.room.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getReservations(): Promise<Reservation[]> {
    const list = await prisma.reservation.findMany();
    return list.map(toReservation);
  },

  async getReservation(id: string): Promise<Reservation | undefined> {
    const r = await prisma.reservation.findUnique({ where: { id } });
    return r ? toReservation(r) : undefined;
  },

  async addReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<Reservation> {
    const created = await prisma.reservation.create({
      data: {
        roomId: reservation.roomId,
        customerId: reservation.customerId,
        source: reservation.source,
        reservationTypeId: reservation.reservationTypeId,
        checkIn: new Date(reservation.checkIn),
        checkOut: new Date(reservation.checkOut),
        status: reservation.status,
        totalPrice: reservation.totalPrice,
        adminMemo: reservation.adminMemo,
        guestCancellationConfirmed: reservation.guestCancellationConfirmed,
      },
    });
    return toReservation(created);
  },

  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation | null> {
    const existing = await prisma.reservation.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(updates.roomId !== undefined && { roomId: updates.roomId }),
        ...(updates.customerId !== undefined && { customerId: updates.customerId }),
        ...(updates.source !== undefined && { source: updates.source }),
        ...(updates.reservationTypeId !== undefined && { reservationTypeId: updates.reservationTypeId }),
        ...(updates.checkIn !== undefined && { checkIn: new Date(updates.checkIn) }),
        ...(updates.checkOut !== undefined && { checkOut: new Date(updates.checkOut) }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.totalPrice !== undefined && { totalPrice: updates.totalPrice }),
        ...(updates.adminMemo !== undefined && { adminMemo: updates.adminMemo }),
        ...(updates.guestCancellationConfirmed !== undefined && { guestCancellationConfirmed: updates.guestCancellationConfirmed }),
      },
    });
    return toReservation(updated);
  },

  async deleteReservation(id: string): Promise<boolean> {
    try {
      await prisma.reservation.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getRoomInventoryAdjustment(roomId: string, date: string): Promise<number> {
    const item = await prisma.roomInventoryAdjustment.findUnique({
      where: { roomId_date: { roomId, date } },
    });
    return item?.delta ?? 0;
  },

  async setRoomInventoryAdjustment(roomId: string, date: string, delta: number): Promise<RoomInventoryAdjustment> {
    if (delta === 0) {
      await prisma.roomInventoryAdjustment.deleteMany({
        where: { roomId, date },
      });
      return { roomId, date, delta: 0 };
    }
    const item = await prisma.roomInventoryAdjustment.upsert({
      where: { roomId_date: { roomId, date } },
      create: { roomId, date, delta },
      update: { delta },
    });
    return { roomId: item.roomId, date: item.date, delta: item.delta };
  },

  async getRoomInventoryAdjustmentsForDate(date: string): Promise<RoomInventoryAdjustment[]> {
    const list = await prisma.roomInventoryAdjustment.findMany({
      where: { date },
    });
    return list.map(({ roomId, date: d, delta }) => ({ roomId, date: d, delta }));
  },

  async getRoomInventoryAdjustmentsInRange(startDate: string, endDate: string): Promise<RoomInventoryAdjustment[]> {
    const list = await prisma.roomInventoryAdjustment.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });
    return list.map(({ roomId, date, delta }) => ({ roomId, date, delta }));
  },

  async getReservationTypes(): Promise<ReservationType[]> {
    const list = await prisma.reservationType.findMany();
    return list.map(toReservationType);
  },

  async addReservationType(type: Omit<ReservationType, 'id' | 'createdAt'>): Promise<ReservationType> {
    const created = await prisma.reservationType.create({
      data: { name: type.name, color: type.color },
    });
    return toReservationType(created);
  },

  async updateReservationType(id: string, updates: Partial<ReservationType>): Promise<ReservationType | null> {
    if (id === 'default') {
      const t = await prisma.reservationType.findUnique({ where: { id } });
      return t ? toReservationType(t) : null;
    }
    try {
      const updated = await prisma.reservationType.update({
        where: { id },
        data: {
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.color !== undefined && { color: updates.color }),
        },
      });
      return toReservationType(updated);
    } catch {
      return null;
    }
  },

  async deleteReservationType(id: string): Promise<boolean> {
    if (id === 'default') return false;
    try {
      await prisma.reservationType.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async getCustomers(): Promise<Customer[]> {
    const list = await prisma.customer.findMany();
    return list.map(toCustomer);
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    const c = await prisma.customer.findUnique({ where: { id } });
    return c ? toCustomer(c) : undefined;
  },

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    const c = await prisma.customer.findUnique({ where: { userId } });
    return c ? toCustomer(c) : undefined;
  },

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const normalized = phone.replace(/\D/g, '');
    const list = await prisma.customer.findMany();
    const c = list.find((x) => x.phone.replace(/\D/g, '') === normalized);
    return c ? toCustomer(c) : undefined;
  },

  async getOrCreateCustomerForManual(name: string, phone: string): Promise<Customer> {
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const existing = await this.getCustomerByPhone(trimmedPhone);
      if (existing) {
        if (name.trim() && existing.name !== name.trim()) {
          const updated = await this.updateCustomer(existing.id, { name: name.trim() });
          return updated ?? existing;
        }
        return existing;
      }
    }
    return this.addCustomer({
      name: name.trim() || '관리자 수기 예약',
      phone: trimmedPhone,
    });
  },

  async addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const created = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        userId: data.userId,
        memo: data.memo,
      },
    });
    return toCustomer(created);
  },

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Customer | null> {
    try {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          ...(updates.name !== undefined && { name: updates.name }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.userId !== undefined && { userId: updates.userId }),
          ...(updates.memo !== undefined && { memo: updates.memo }),
        },
      });
      return toCustomer(updated);
    } catch {
      return null;
    }
  },

  async getOrCreateCustomerByUserId(
    userId: string,
    data: { name?: string; phone?: string; memo?: string }
  ): Promise<Customer> {
    let customer = await this.getCustomerByUserId(userId);
    if (!customer) {
      customer = await this.addCustomer({
        name: data.name?.trim() || (userId.length > 8 ? userId.slice(0, 8) : userId),
        phone: data.phone?.trim() || '',
        userId,
        memo: data.memo,
      });
    } else {
      const patch: Partial<Customer> = {};
      if (data.name !== undefined && data.name.trim()) patch.name = data.name.trim();
      if (data.phone !== undefined) patch.phone = data.phone.trim();
      if (data.memo !== undefined) patch.memo = data.memo;
      if (Object.keys(patch).length > 0) {
        const updated = await this.updateCustomer(customer.id, patch);
        if (updated) customer = updated;
      }
    }
    return customer;
  },

  async isRoomAvailable(roomId: string, checkIn: string, checkOut: string, excludeReservationId?: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;
    const baseInventory = room.inventory;
    if (baseInventory <= 0) return false;

    const start = new Date(checkIn);
    const rawEnd = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(rawEnd.getTime())) return false;

    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(rawEnd);
    dayEnd.setHours(0, 0, 0, 0);
    if (dayEnd < dayStart) return false;
    if (dayEnd.getTime() === dayStart.getTime()) dayEnd.setDate(dayEnd.getDate() + 1);

    const effectiveStatuses = ['pending', 'confirmed'] as const;
    const reservations = (await this.getReservations()).filter((r) => {
      if (r.roomId !== roomId) return false;
      if (excludeReservationId && r.id === excludeReservationId) return false;
      return effectiveStatuses.includes(r.status as (typeof effectiveStatuses)[number]);
    });

    for (let d = new Date(dayStart); d < dayEnd; d.setDate(d.getDate() + 1)) {
      const slotStart = new Date(d);
      const slotEnd = new Date(slotStart);
      slotEnd.setDate(slotEnd.getDate() + 1);
      const y = slotStart.getFullYear();
      const m = String(slotStart.getMonth() + 1).padStart(2, '0');
      const day = String(slotStart.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      const delta = await this.getRoomInventoryAdjustment(roomId, dateKey);
      const effectiveInventory = baseInventory + delta;
      if (effectiveInventory <= 0) return false;

      const soldCount = reservations.filter((r) => {
        const resStart = new Date(r.checkIn);
        const resEndRaw = new Date(r.checkOut);
        const resDayStart = new Date(resStart);
        resDayStart.setHours(0, 0, 0, 0);
        const resDayEnd = new Date(resEndRaw);
        resDayEnd.setHours(0, 0, 0, 0);
        if (resDayEnd.getTime() === resDayStart.getTime()) resDayEnd.setDate(resDayEnd.getDate() + 1);
        return resDayStart < slotEnd && resDayEnd > slotStart;
      }).length;
      if (soldCount >= effectiveInventory) return false;
    }
    return true;
  },

  async getChatbotMessages(): Promise<ChatbotMessage[]> {
    const list = await prisma.chatbotMessage.findMany();
    return list.map(toChatbotMessage);
  },

  async getChatbotMessage(situation: ChatbotSituation): Promise<ChatbotMessage | undefined> {
    const m = await prisma.chatbotMessage.findUnique({ where: { situation } });
    return m ? toChatbotMessage(m) : undefined;
  },

  async updateChatbotMessage(situation: ChatbotSituation, message: string): Promise<ChatbotMessage | null> {
    const existing = await prisma.chatbotMessage.findUnique({ where: { situation } });
    if (!existing) return null;
    if (existing.message !== message) {
      await this.addChatbotMessageHistory(situation, existing.message);
    }
    const updated = await prisma.chatbotMessage.update({
      where: { situation },
      data: { message },
    });
    return toChatbotMessage(updated);
  },

  async getChatHistories(): Promise<ChatHistory[]> {
    const list = await prisma.chatHistory.findMany();
    return list.map(toChatHistory);
  },

  async getChatHistory(id: string): Promise<ChatHistory | undefined> {
    const h = await prisma.chatHistory.findUnique({ where: { id } });
    return h ? toChatHistory(h) : undefined;
  },

  async getChatHistoryByCustomerId(customerId: string): Promise<ChatHistory | undefined> {
    const h = await prisma.chatHistory.findUnique({ where: { customerId } });
    return h ? toChatHistory(h) : undefined;
  },

  async getChatHistoryByUserId(userId: string): Promise<ChatHistory | undefined> {
    const customer = await this.getCustomerByUserId(userId);
    return customer ? this.getChatHistoryByCustomerId(customer.id) : undefined;
  },

  async addChatHistory(history: Omit<ChatHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatHistory> {
    const created = await prisma.chatHistory.create({
      data: {
        customerId: history.customerId,
        messages: history.messages as unknown as Prisma.InputJsonValue,
      },
    });
    return toChatHistory(created);
  },

  async getOrCreateChatHistoryByCustomerId(customerId: string): Promise<ChatHistory> {
    let history = await this.getChatHistoryByCustomerId(customerId);
    if (!history) {
      history = await this.addChatHistory({ customerId, messages: [] });
    }
    return history;
  },

  async getOrCreateChatHistory(userId: string, userName?: string): Promise<ChatHistory> {
    const customer = await this.getOrCreateCustomerByUserId(userId, { name: userName });
    return this.getOrCreateChatHistoryByCustomerId(customer.id);
  },

  async addMessageToHistory(
    userId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage> {
    const history = await this.getOrCreateChatHistory(userId);
    const now = new Date().toISOString();
    const newMessage: ChatMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: now,
    };
    const messages = [...(history.messages ?? []), newMessage];
    await prisma.chatHistory.update({
      where: { id: history.id },
        data: { messages: messages as unknown as Prisma.InputJsonValue },
    });
    return newMessage;
  },

  async updateChatHistory(id: string, updates: Partial<Pick<ChatHistory, 'messages'>>): Promise<ChatHistory | null> {
    try {
      const updated = await prisma.chatHistory.update({
        where: { id },
        data: {
          ...(updates.messages !== undefined && { messages: updates.messages as unknown as Prisma.InputJsonValue }),
        },
      });
      return toChatHistory(updated);
    } catch {
      return null;
    }
  },

  async savePendingReservation(userId: string, data: Omit<PendingReservation, 'createdAt'>): Promise<PendingReservation> {
    const pending: PendingReservation = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    await prisma.pendingReservation.upsert({
      where: { userId },
      create: {
        userId,
        roomId: data.roomId,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        totalPrice: data.totalPrice,
      },
      update: {
        roomId: data.roomId,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        totalPrice: data.totalPrice,
      },
    });
    return pending;
  },

  async getPendingReservation(userId: string): Promise<PendingReservation | undefined> {
    const p = await prisma.pendingReservation.findUnique({ where: { userId } });
    return p ? toPendingReservation(p) : undefined;
  },

  async deletePendingReservation(userId: string): Promise<boolean> {
    try {
      await prisma.pendingReservation.delete({ where: { userId } });
      return true;
    } catch {
      return false;
    }
  },

  async getTemplateHistory(displayName: string): Promise<Array<{ tplCode: string; content: string; savedAt: string }>> {
    const list = await prisma.templateHistory.findMany({
      where: { displayName },
      orderBy: { savedAt: 'desc' },
      take: 10,
    });
    return list.map((x) => ({
      tplCode: x.tplCode,
      content: x.content,
      savedAt: x.savedAt.toISOString(),
    }));
  },

  async addTemplateHistory(displayName: string, tplCode: string, content: string): Promise<void> {
    const existing = await prisma.templateHistory.findFirst({
      where: { displayName, tplCode },
    });
    if (existing) {
      await prisma.templateHistory.update({
        where: { id: existing.id },
        data: { content, savedAt: new Date() },
      });
    } else {
      await prisma.templateHistory.create({
        data: { displayName, tplCode, content },
      });
    }
    const all = await prisma.templateHistory.findMany({
      where: { displayName },
      orderBy: { savedAt: 'desc' },
    });
    if (all.length > 10) {
      for (const t of all.slice(10)) {
        await prisma.templateHistory.delete({ where: { id: t.id } });
      }
    }
  },

  async deleteTemplateHistoryItem(displayName: string, tplCode: string): Promise<void> {
    const active = await prisma.templateActive.findUnique({ where: { displayName } });
    let nextTplCode = '';
    if (active?.tplCode === tplCode) {
      const list = await prisma.templateHistory.findMany({
        where: { displayName },
        orderBy: { savedAt: 'desc' },
      });
      const next = list.find((x) => x.tplCode !== tplCode);
      nextTplCode = next?.tplCode ?? '';
    }
    await prisma.templateHistory.deleteMany({
      where: { displayName, tplCode },
    });
    if (active?.tplCode === tplCode) {
      await prisma.templateActive.upsert({
        where: { displayName },
        create: { displayName, tplCode: nextTplCode },
        update: { tplCode: nextTplCode },
      });
    }
  },

  async setTemplateActive(displayName: string, tplCode: string): Promise<void> {
    await prisma.templateActive.upsert({
      where: { displayName },
      create: { displayName, tplCode },
      update: { tplCode },
    });
  },

  async getTemplateActive(displayName: string): Promise<string | undefined> {
    const a = await prisma.templateActive.findUnique({ where: { displayName } });
    return a?.tplCode;
  },

  async getChatbotMessageHistory(situation: ChatbotSituation): Promise<Array<{ message: string; savedAt: string }>> {
    const list = await prisma.chatbotMessageHistory.findMany({
      where: { situation },
      orderBy: { savedAt: 'desc' },
      take: 10,
    });
    return list.map((x) => ({ message: x.message, savedAt: x.savedAt.toISOString() }));
  },

  async addChatbotMessageHistory(situation: ChatbotSituation, message: string): Promise<void> {
    const list = await prisma.chatbotMessageHistory.findMany({
      where: { situation },
      orderBy: { savedAt: 'desc' },
    });
    await prisma.chatbotMessageHistory.create({
      data: { situation, message },
    });
    if (list.length >= 10) {
      const toDel = list[list.length - 1];
      if (toDel) await prisma.chatbotMessageHistory.delete({ where: { id: toDel.id } });
    }
  },

  async deleteChatbotMessageHistoryItem(situation: ChatbotSituation, index: number): Promise<void> {
    const list = await prisma.chatbotMessageHistory.findMany({
      where: { situation },
      orderBy: { savedAt: 'desc' },
    });
    const item = list[index];
    if (item) await prisma.chatbotMessageHistory.delete({ where: { id: item.id } });
  },

  async cleanupExpiredReservations(): Promise<number> {
    const expired = new Date(Date.now() - 10 * 60 * 1000);
    const result = await prisma.pendingReservation.deleteMany({
      where: { createdAt: { lt: expired } },
    });
    return result.count;
  },
};

export { CHATBOT_SITUATIONS, SITUATION_DESCRIPTIONS };
