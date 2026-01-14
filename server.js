/**
 * PalaceHotel Kakao Skill Server — "AI는 타입 + payload만 출력"
 * - AI 출력 타입: CHAT / ROOM_LIST / ROOM_CARDS / CONFIRM / HISTORY
 * - 서버는 타입별 UI를 "고정 템플릿"으로 렌더링 (카카오 JSON 안정성)
 * - 서버는 툴로 "진짜"만 처리: 재고체크/예약확정/내역조회/취소
 *
 * 사용자 요구 반영(중요):
 * - 사용자 발화에 대해 서버가 "강제 라우팅" 하지 않음 (키워드로 뷰 강제 X)
 * - 다만, 서버가 만든 버튼(CMD:...)은 안정 처리를 위해 해석(이건 강제 라우팅이 아니라 UI 클릭 처리)
 * - 예약 확정 필수: roomId, checkIn, checkOut (이름/전화번호 제외)
 * - checkOut 자동계산 X (사용자가 1박이라 해도 반드시 체크아웃 받아야 함)
 * - 예약내역/취소: userId 기준, 취소 즉시 가능, 확인 팝업 없음
 * - inventory 날짜 키 없으면 만실(0) 처리
 * - 말투/운영: 짧게, 한 번에 질문 1개
 *
 * 필요 파일:
 *  data/rooms.json
 *  data/inventory.json
 *  data/bookings.json
 *
 * 패키지:
 *  npm i express openai dotenv dayjs
 */

require("dotenv").config();

const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const OpenAI = require("openai");

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Seoul";

const app = express();
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DATA_DIR = path.join(__dirname, "data");
const ROOMS_PATH = path.join(DATA_DIR, "rooms.json");
const INVENTORY_PATH = path.join(DATA_DIR, "inventory.json");
const BOOKINGS_PATH = path.join(DATA_DIR, "bookings.json");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-2024-08-06";
const PORT = Number(process.env.PORT || 3000);

// =========================
// 세션(메모리) — 최소 상태만
// =========================
// userId -> { history: [{role, content}], draft: {roomId, checkIn, checkOut} }
const sessions = new Map();

// ------------------------------------------------------------
// 0) 파일 I/O + write lock
// ------------------------------------------------------------
let writeLock = Promise.resolve();

async function withWriteLock(fn) {
  const prev = writeLock;
  let release;
  writeLock = new Promise((r) => (release = r));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function saveJson(filePath, obj) {
  const tmp = filePath + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

// ------------------------------------------------------------
// 1) 유틸
// ------------------------------------------------------------
function nowSeoulISO() {
  return dayjs().tz(TZ).toISOString();
}
function todaySeoul() {
  return dayjs().tz(TZ).startOf("day");
}
function isValidISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && dayjs.tz(s, TZ).isValid();
}
function checkInWithin30Days(checkInISO) {
  const t = todaySeoul();
  const d = dayjs.tz(checkInISO, TZ).startOf("day");
  const diff = d.diff(t, "day");
  return diff >= 0 && diff <= 30;
}
function dateRangeNights(checkInISO, checkOutISO) {
  const inD = dayjs.tz(checkInISO, TZ).startOf("day");
  const outD = dayjs.tz(checkOutISO, TZ).startOf("day");
  return outD.diff(inD, "day");
}
function enumerateStayDates(checkInISO, checkOutISO) {
  const nights = dateRangeNights(checkInISO, checkOutISO);
  const res = [];
  const start = dayjs.tz(checkInISO, TZ).startOf("day");
  for (let i = 0; i < nights; i++) res.push(start.add(i, "day").format("YYYY-MM-DD"));
  return res;
}

// messageText에 쓸 안전한 CMD 인코딩/디코딩(단순)
function enc(s) {
  return encodeURIComponent(String(s || ""));
}
function dec(s) {
  try { return decodeURIComponent(String(s || "")); } catch { return String(s || ""); }
}

// 카카오 JSON 생성(quickReplies 미사용)
function kakaoResponse(outputs) {
  return { version: "2.0", template: { outputs } };
}
function outSimpleText(text) {
  return { simpleText: { text } };
}
function outBasicCard({ title, description, imageUrl, buttons = [] }) {
  const card = { title, description };
  if (imageUrl) card.thumbnail = { imageUrl };
  if (buttons.length) card.buttons = buttons;
  return { basicCard: card };
}
function outListCard({ headerTitle, items, buttons = [] }) {
  const card = {
    header: { title: headerTitle },
    items
  };
  if (buttons.length) card.buttons = buttons;
  return { listCard: card };
}
function outCarouselBasicCard(items) {
  return { carousel: { type: "basicCard", items } };
}

// outputs 검증(가벼운)
function basicValidateKakao(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, msg: "응답이 객체가 아닙니다." };
  if (obj.version !== "2.0") return { ok: false, msg: "version이 2.0이 아닙니다." };
  if (!obj.template || typeof obj.template !== "object") return { ok: false, msg: "template이 없습니다." };
  if (!Array.isArray(obj.template.outputs)) return { ok: false, msg: "template.outputs가 배열이 아닙니다." };
  if (obj.template.quickReplies) return { ok: false, msg: "quickReplies는 사용하지 않습니다." };

  for (const out of obj.template.outputs) {
    const keys = Object.keys(out || {});
    if (keys.length !== 1) return { ok: false, msg: "outputs 항목은 단일 타입만 포함해야 합니다." };
    const k = keys[0];
    if (!["simpleText", "basicCard", "listCard", "carousel"].includes(k)) {
      return { ok: false, msg: `지원하지 않는 output 타입: ${k}` };
    }
  }
  return { ok: true };
}

function extractPlainTextForHistory(kakaoObj) {
  try {
    const outs = kakaoObj?.template?.outputs || [];
    const texts = [];
    for (const o of outs) {
      if (o?.simpleText?.text) texts.push(String(o.simpleText.text));
      else if (o?.basicCard?.title) texts.push(`[카드] ${o.basicCard.title}`);
      else if (o?.listCard?.header?.title) texts.push(`[리스트] ${o.listCard.header.title}`);
      else if (o?.carousel?.items?.length) texts.push(`[캐러셀] ${o.carousel.items.length}개`);
    }
    return texts.join("\n").slice(0, 800);
  } catch {
    return "";
  }
}

// ------------------------------------------------------------
// 2) 데이터 접근(rooms/inventory/bookings) + 툴
// ------------------------------------------------------------
async function getRooms() {
  const roomsObj = await loadJson(ROOMS_PATH);
  return roomsObj.rooms || [];
}

async function checkAvailability({ roomId, checkIn, checkOut }) {
  if (!roomId || !checkIn || !checkOut) return { ok: false, reason: "missing_fields" };
  if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) return { ok: false, reason: "bad_date" };
  //if (!checkInWithin30Days(checkIn)) return { ok: false, reason: "out_of_range" };
  if (dateRangeNights(checkIn, checkOut) <= 0) return { ok: false, reason: "bad_range" };

  // const inv = await loadJson(INVENTORY_PATH);
  // const inventory = inv.inventory || {};
  // const roomInv = inventory[roomId] || {};
  // const stayDates = enumerateStayDates(checkIn, checkOut);

  // for (const d of stayDates) {
  //   const remain = Number(roomInv[d] ?? 0); // 날짜 키 없으면 0(만실)
  //   if (remain <= 0) return { ok: false, reason: "sold_out" };
  // }
  return { ok: true };
}

async function listBookingsByUserId(userId, limit = 10) {
  const bookObj = await loadJson(BOOKINGS_PATH);
  const all = (bookObj.bookings || []).slice();
  all.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const filtered = all.filter(b => b.userId === userId);
  return filtered.slice(0, Math.min(Math.max(Number(limit || 10), 1), 20));
}

async function cancelBookingById({ userId, bookingId }) {
  if (!bookingId) return { ok: false, reason: "missing_fields" };

  return withWriteLock(async () => {
    const [invObj, bookObj] = await Promise.all([loadJson(INVENTORY_PATH), loadJson(BOOKINGS_PATH)]);
    const inventory = invObj.inventory || {};
    bookObj.bookings = bookObj.bookings || [];

    const idx = bookObj.bookings.findIndex(b => b.id === bookingId);
    if (idx < 0) return { ok: false, reason: "not_found" };

    const b = bookObj.bookings[idx];
    if (b.userId !== userId) return { ok: false, reason: "forbidden" };
    if (b.status !== "CONFIRMED") return { ok: false, reason: "not_confirmed", status: b.status };

    // 재고 복구
    inventory[b.roomId] = inventory[b.roomId] || {};
    const stayDates = enumerateStayDates(b.checkIn, b.checkOut);
    for (const d of stayDates) {
      inventory[b.roomId][d] = Number(inventory[b.roomId][d] ?? 0) + 1;
    }

    b.status = "CANCELED";
    b.canceledAt = nowSeoulISO();
    bookObj.bookings[idx] = b;

    invObj.inventory = inventory;
    await Promise.all([saveJson(INVENTORY_PATH, invObj), saveJson(BOOKINGS_PATH, bookObj)]);
    return { ok: true, booking: b };
  });
}

async function createBooking({ userId, roomId, checkIn, checkOut }) {
  // 이름/전화번호 제외 버전
  if (!userId || !roomId || !checkIn || !checkOut) return { ok: false, reason: "missing_fields" };
  const avail = await checkAvailability({ roomId, checkIn, checkOut });
  if (!avail.ok) return { ok: false, reason: avail.reason };

  return withWriteLock(async () => {
    const [invObj, bookObj] = await Promise.all([loadJson(INVENTORY_PATH), loadJson(BOOKINGS_PATH)]);
    const inventory = invObj.inventory || {};
    inventory[roomId] = inventory[roomId] || {};

    const stayDates = enumerateStayDates(checkIn, checkOut);
    for (const d of stayDates) {
      const remain = Number(inventory[roomId][d] ?? 0);
      if (remain <= 0) return { ok: false, reason: "sold_out" };
    }

    for (const d of stayDates) inventory[roomId][d] = Number(inventory[roomId][d] ?? 0) - 1;

    const bookingId = `B${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const booking = {
      id: bookingId,
      userId,
      roomId,
      checkIn,
      checkOut,
      createdAt: nowSeoulISO(),
      status: "CONFIRMED"
    };

    bookObj.bookings = bookObj.bookings || [];
    bookObj.bookings.push(booking);

    invObj.inventory = inventory;
    await Promise.all([saveJson(INVENTORY_PATH, invObj), saveJson(BOOKINGS_PATH, bookObj)]);
    return { ok: true, booking };
  });
}

// ------------------------------------------------------------
// 3) AI 출력 스키마(타입+payload) — oneOf 금지 대응
//    strict=true 이므로 모든 프로퍼티 required + 내부도 기본값으로 항상 채우게 설계
// ------------------------------------------------------------
const AI_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["CHAT", "ROOM_LIST", "ROOM_CARDS", "CONFIRM", "HISTORY"] },

    chat: {
      type: "object",
      additionalProperties: false,
      properties: {
        messages: {
          type: "array",
          minItems: 0,
          maxItems: 3,
          items: { type: "string" }
        }
      },
      required: ["messages"]
    },

    roomView: {
      type: "object",
      additionalProperties: false,
      properties: {
        roomIds: {
          type: "array",
          minItems: 0,
          maxItems: 10,
          items: { type: "string" }
        },
        // 0=안내없음, 1=짧은 안내
        caption: { type: "string" }
      },
      required: ["roomIds", "caption"]
    },

    confirm: {
      type: "object",
      additionalProperties: false,
      properties: {
        roomId: { type: "string" },   // 미사용 시 "" 허용(서버가 검증)
        checkIn: { type: "string" },  // 미사용 시 "" 허용
        checkOut: { type: "string" }, // 미사용 시 "" 허용
        caption: { type: "string" }
      },
      required: ["roomId", "checkIn", "checkOut", "caption"]
    },

    history: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "number" },
        caption: { type: "string" }
      },
      required: ["limit", "caption"]
    }
  },
  required: ["action", "chat", "roomView", "confirm", "history"]
};

// ------------------------------------------------------------
// 4) 툴 정의(모델이 필요 시 호출 가능)
//    서버는 "발화 강제"를 하지 않지만, 모델이 검증 필요하면 툴을 써서 사실 확인 가능
// ------------------------------------------------------------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_rooms",
      description: "객실 목록을 가져옵니다.",
      parameters: { type: "object", additionalProperties: false, properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "roomId + checkIn/checkOut 조합이 가능한지(재고/룰 포함) 확인합니다.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          roomId: { type: "string" },
          checkIn: { type: "string" },
          checkOut: { type: "string" }
        },
        required: ["roomId", "checkIn", "checkOut"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_bookings",
      description: "현재 userId의 예약 내역을 조회합니다.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { limit: { type: "number" } },
        required: ["limit"]
      }
    }
  }
];

// ------------------------------------------------------------
// 5) AI 실행(툴콜 루프) — 최종은 AI_OUTPUT_SCHEMA
// ------------------------------------------------------------
async function runAI({ userId, utterance, session, rooms }) {
  const nowISO = nowSeoulISO();
  const roomsSummary = rooms
    .map(r => `- ${r.id}: ${r.name} / ${r.basePrice} / max ${r.maxGuests}`)
    .slice(0, 12)
    .join("\n");

  const draft = session.draft || { roomId: "", checkIn: "", checkOut: "" };

  const system = `
당신은 호텔 프론트 상담원처럼 친근하지만 예의 있게 응대하는 챗봇입니다.
말투: 짧고 깔끔하게, 한 번에 질문 1개.

중요:
- 서버는 사용자 발화를 강제로 제어하지 않습니다. 당신이 자연스럽게 대화를 이끌어야 합니다.
- "예약 내역/조회/취소"는 HISTORY로 응답하세요.
- 예약 확정은 CONFIRM 타입으로 진행합니다. (필수: roomId, checkIn, checkOut) 이름/전화번호는 받지 않습니다.
- 체크인은 오늘 기준 30일 이내만 가능(서버 검증).

[예약 플로우 지침 — 일관성 고정(매우 중요)]
- 기본 진행 순서는 항상 아래 중 하나로 "상황에 맞게" 자동 선택하되, 사용자가 헷갈리지 않게 일관되게 유지하세요.
  A) 날짜(체크인/체크아웃 또는 숙박일수)가 먼저 확보된 경우 → 즉시 객실을 보여주고 선택받기
  B) 객실이 먼저 확보된 경우 → 즉시 숙박일수/체크아웃을 확정한 뒤 진행(필요하면 객실도 함께 보여주기)
  C) 둘 다 없는 경우(예약하기/예약하고싶어 같은 시작) → 기본은 "날짜(체크인)"를 먼저 받아 진행하기

- 절대 하면 안 되는 것:
  1) "객실을 먼저 물어보고 객실을 안 보여주는" 응답
  2) "객실 보여드릴까요?" 같은 허락 질문(필요하면 그냥 보여주기)
  3) 같은 단계에서 질문을 반복해서 되묻기(이해했으면 다음 단계로 진행)

[객실 표시 지침 — 묻지 말고 보여주기(매우 중요)]
- 아래 상황에서는 CHAT으로 "보여드릴까요?" 묻지 말고, 바로 ROOM_CARDS(기본) 또는 ROOM_LIST로 객실을 보여주세요.
  1) 사용자가 "객실 보여줘/추천/가격/방 보여줘" 등으로 객실 탐색을 원함
  2) 예약 진행 중인데 roomId가 아직 없음(= 객실 선택 단계)
  3) 날짜(체크인/체크아웃 또는 숙박일수)가 확보됐고 이제 객실만 고르면 됨
- 객실을 보여줄 때는 caption에 짧게 1문장만 붙이고(선택),
  같은 응답에서 "무슨 객실로 할까요?" 같은 질문을 따로 하지 마세요. (이미 카드가 선택 UI입니다)
  예) caption: "해당 일정으로 진행 가능해요 🙂 원하시는 객실을 골라주세요."

[숙박일수/체크아웃 처리 지침 — 매우 중요]
- 사용자가 "1박", "2박", "3박", "당일숙박(0박)"처럼 숙박일수를 말하면,
  체크인을 기준으로 체크아웃 날짜를 당신이 자동 계산해서 진행하세요(되묻지 말고 다음 단계로).
  예) "좋아요 🙂 1박이면 체크아웃은 2026-01-23(금)로 진행할게요."
- 사용자가 체크아웃 날짜를 직접 말했으면 그 값을 우선합니다(재계산/강요 금지).
- 체크인이 없는 상태에서 "1박"만 말하면, 체크인만 1개 질문하세요.

[날짜 입력 UX 지침 — 자동 진행이 원칙]
- 사용자가 날짜를 자연어로 말했을 때(예: "다음주 목요일", "내일", "1/20", "1월 20일"),
  의미를 '충분히 확실하게' 해석할 수 있으면 절대 확인 질문을 하지 말고
  그 날짜를 확정된 값(YYYY-MM-DD)으로 간주하고 다음 단계로 진행하세요.

- "자동 진행"의 기준(확실함):
  1) "오늘/내일/모레/글피" 등 상대일
  2) "이번주/다음주/다다음주/지난주 + 요일" 형태
  3) "YYYY-MM-DD" 형태
  4) "M/D", "M월 D일" 형태에서, 오늘 기준 30일 이내에 자연스럽게 들어오는 경우
     (필요하면 올해/내년을 알아서 붙이되, 30일 범위 밖이면 자동 확정하지 말고 아래 '예외'로 처리)

[예외 — 이 경우에만 1개 질문으로 확인]
- 사용자가 말한 값이 애매해서 서로 다른 해석이 가능한 경우:
  예) "수요일"(이번주/다음주 모호), "주말", "다음달 초"
  -> 선택지로 1개 질문만: "이번 주 수요일 / 다음 주 수요일 중 어느 쪽일까요?"
- 규칙 위반 가능성이 큰 경우(30일 초과 가능성이 높음) -> 1회 안내 + 1개 질문
- 사용자가 명시적으로 확인을 원한 경우("맞지?", "이 날짜 맞아?") -> 그때만 확인

- 사용자가 같은 자연어 날짜를 반복해서 보내면, 형식 오류로 취급하지 말고
  이미 해석한 날짜를 유지한 채 다음 단계로 진행하세요.

- 필요하면 tool로 확인(check_availability, list_bookings)하고 응답하세요.

현재 시각(Seoul): ${nowISO}

현재 확보된 예약 초안:
- roomId: ${draft.roomId || "(없음)"}
- checkIn: ${draft.checkIn || "(없음)"}
- checkOut: ${draft.checkOut || "(없음)"}

객실 목록(요약):
${roomsSummary}

출력은 반드시 "AI_OUTPUT_SCHEMA" JSON만 출력하세요.
- action에 따라 payload를 채우세요.
- action이 CHAT이면 chat.messages에 1~2문장 정도로 응답(필요시 질문 1개).
- action이 ROOM_LIST/ROOM_CARDS면 roomView.roomIds에 보여줄 객실 id 리스트.
- action이 CONFIRM이면 confirm.roomId/checkIn/checkOut을 채우고, caption에 "확정 질문" 문장을 넣으세요.
- action이 HISTORY면 history.limit를 적당히 넣고 caption에 안내 문장을 넣으세요.

[CONFIRM 데이터 채우기 규칙(중요)]
- 날짜/숙박일수 해석이 확실하면, confirm.checkIn/checkOut은 YYYY-MM-DD로 채워서 진행하세요.
- 애매한 경우에만 CHAT으로 1개 질문해서 확정한 뒤 CONFIRM으로 넘어가세요.
`.trim();


  // 히스토리(최근만)
  const history = (session.history || []).slice(-10);

  const tools = TOOLS.map(t => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters
    }
  }));

  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: utterance }
  ];

  for (let step = 0; step < 4; step++) {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      tools,
      tool_choice: "auto",
      response_format: {
        type: "json_schema",
        json_schema: { name: "ai_view_output", strict: true, schema: AI_OUTPUT_SCHEMA }
      }
    });

    const msg = resp.choices?.[0]?.message;
    if (!msg) throw new Error("No assistant message");

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });

      for (const tc of msg.tool_calls) {
        const toolName = tc.function?.name;
        let args = {};
        try { args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { args = {}; }

        let result = { ok: false, reason: "unknown_tool" };

        if (toolName === "get_rooms") {
          result = { ok: true, rooms };
        } else if (toolName === "check_availability") {
          result = await checkAvailability(args);
        } else if (toolName === "list_bookings") {
          const limit = Number(args.limit || 10);
          const bookings = await listBookingsByUserId(userId, limit);
          result = { ok: true, bookings };
        }

        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // 최종 JSON
    return JSON.parse(msg.content);
  }

  // 툴 루프 초과 시 fallback
  return {
    action: "CHAT",
    chat: { messages: ["죄송합니다. 잠시 처리에 문제가 생겼습니다. 다시 한 번 말씀해 주세요 🙏"] },
    roomView: { roomIds: [], caption: "" },
    confirm: { roomId: "", checkIn: "", checkOut: "", caption: "" },
    history: { limit: 10, caption: "" }
  };
}

// ------------------------------------------------------------
// 6) 타입별 렌더러(서버 고정 UI)
// ------------------------------------------------------------
function renderChat(aiOut) {
  const msgs = (aiOut?.chat?.messages || []).filter(s => String(s).trim().length > 0).slice(0, 3);
  if (msgs.length === 0) return kakaoResponse([outSimpleText("무엇을 도와드릴까요?")]);
  return kakaoResponse(msgs.map(m => outSimpleText(m)));
}

function renderRoomList(rooms, roomIds, caption) {
  const picked = roomIds?.length ? rooms.filter(r => roomIds.includes(r.id)) : rooms;
  const items = picked.slice(0, 5).map(r => ({
    title: `${r.name} · ${r.basePrice?.toLocaleString?.("ko-KR") ?? r.basePrice}원`,
    description: `${r.short || ""}`.trim() || "객실 안내",
    imageUrl: r.images?.[0] || undefined,
    link: r.images?.[0] ? { web: r.images[0] } : undefined
  }));

  // items가 비면 fallback
  if (items.length === 0) {
    return kakaoResponse([outSimpleText("보여드릴 객실이 없습니다. 다른 조건으로 말씀해 주세요.")]);
  }

  const headerTitle = "객실 목록";
  const listCard = outListCard({
    headerTitle,
    items,
    buttons: [
      { action: "message", label: "객실 다시 보기", messageText: "객실 보여줘" }
    ]
  });

  const outputs = [];
  if (caption && String(caption).trim()) outputs.push(outSimpleText(String(caption).trim()));
  outputs.push(listCard);

  return kakaoResponse(outputs);
}

function renderRoomCards(rooms, roomIds, caption) {
  const picked = roomIds?.length ? rooms.filter(r => roomIds.includes(r.id)) : rooms;
  const items = picked.slice(0, 10).map(r => ({
    title: r.name,
    description: `${r.short || ""}\n기준가 ${r.basePrice?.toLocaleString?.("ko-KR") ?? r.basePrice}원`.trim(),
    thumbnail: r.images?.[0] ? { imageUrl: r.images[0] } : undefined,
    buttons: [
      { action: "message", label: "이 객실 선택", messageText: `${r.name} 선택` }
    ]
  }));

  if (items.length === 0) {
    return kakaoResponse([outSimpleText("보여드릴 객실이 없습니다. 다른 조건으로 말씀해 주세요.")]);
  }

  const outputs = [];
  if (caption && String(caption).trim()) outputs.push(outSimpleText(String(caption).trim()));
  outputs.push(outCarouselBasicCard(items));
  return kakaoResponse(outputs);
}

function renderConfirm(rooms, confirmPayload) {
  const roomId = String(confirmPayload.roomId || "");
  const checkIn = String(confirmPayload.checkIn || "");
  const checkOut = String(confirmPayload.checkOut || "");
  const caption = String(confirmPayload.caption || "").trim();

  const room = rooms.find(r => r.id === roomId);
  const roomName = room?.name || roomId || "(객실 미지정)";

  const desc = [
    `객실: ${roomName}`,
    `체크인: ${checkIn}`,
    `체크아웃: ${checkOut}`
  ].join("\n");

  // 버튼: 확정/수정(수정은 강제 제어 없이 “날짜/객실 바꿀게요”로 유도)
  const card = outBasicCard({
    title: "예약 확정",
    description: desc,
    imageUrl: room?.images?.[0] || undefined,
    buttons: [
      { action: "message", label: "이대로 확정", messageText: `CMD:CONFIRM:${enc(roomId)}:${enc(checkIn)}:${enc(checkOut)}` },
      { action: "message", label: "수정할게요", messageText: "수정할게요" }
    ]
  });

  const outputs = [];
  if (caption) outputs.push(outSimpleText(caption));
  outputs.push(card);
  return kakaoResponse(outputs);
}

function renderHistory(rooms, bookings, caption) {
  const outputs = [];
  if (caption && String(caption).trim()) outputs.push(outSimpleText(String(caption).trim()));

  if (!bookings || bookings.length === 0) {
    outputs.push(outSimpleText("예약 내역이 없습니다."));
    return kakaoResponse(outputs);
  }

  const items = bookings.slice(0, 10).map(b => {
    const roomName = rooms.find(r => r.id === b.roomId)?.name || b.roomId;
    const title = `${b.id}`;
    const description = [`객실: ${roomName}`, `체크인: ${b.checkIn}`, `체크아웃: ${b.checkOut}`, `상태: ${b.status}`].join("\n");
    return {
      title,
      description,
      thumbnail: rooms.find(r => r.id === b.roomId)?.images?.[0] ? { imageUrl: rooms.find(r => r.id === b.roomId).images[0] } : undefined,
      buttons: [
        { action: "message", label: "취소", messageText: `CMD:CANCEL:${enc(b.id)}` }
      ]
    };
  });

  outputs.push(outCarouselBasicCard(items));
  return kakaoResponse(outputs);
}

// ------------------------------------------------------------
// 7) CMD 버튼 처리(서버가 만든 버튼 클릭만 처리)
// ------------------------------------------------------------
function parseCMD(text) {
  const u = String(text || "").trim();
  if (!u.startsWith("CMD:")) return null;
  const parts = u.split(":");
  // CMD:SET_ROOM:<id>  / CMD:CONFIRM:<roomId>:<checkIn>:<checkOut> / CMD:CANCEL:<bookingId>
  return parts;
}

// ------------------------------------------------------------
// 8) 메인 엔드포인트
// ------------------------------------------------------------
app.post("/kakao/skill", async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body?.userRequest?.user?.id;
    const utterance = body?.userRequest?.utterance || "";

    if (!userId) {
      return res.json(kakaoResponse([outSimpleText("사용자 식별값을 확인할 수 없습니다. (userRequest.user.id)")]));
    }

    if (!sessions.has(userId)) {
      sessions.set(userId, { history: [], draft: { roomId: "", checkIn: "", checkOut: "" } });
    }
    const session = sessions.get(userId);

    const rooms = await getRooms();

    // 8-1) CMD 처리 (서버 UI 버튼 클릭)
    const cmd = parseCMD(utterance);
    if (cmd) {
      if (cmd[1] === "SET_ROOM") {
        const roomId = dec(cmd[2] || "");
        session.draft.roomId = roomId;

        // 강제 라우팅은 아니고, 상태만 업데이트 후 "chat"으로 안내
        const msg = `좋아요 🙂 ${rooms.find(r => r.id === roomId)?.name || roomId} 선택하셨어요.\n체크인 날짜를 알려주세요. (YYYY-MM-DD)`;
        const payload = kakaoResponse([outSimpleText(msg)]);
        session.history.push({ role: "user", content: utterance });
        session.history.push({ role: "assistant", content: msg });
        session.history = session.history.slice(-20);
        return res.json(payload);
      }

      if (cmd[1] === "CONFIRM") {
        const roomId = dec(cmd[2] || "");
        const checkIn = dec(cmd[3] || "");
        const checkOut = dec(cmd[4] || "");

        // 서버 검증 + 재고 체크
        if (!roomId || !checkIn || !checkOut) {
          const msg = "예약 확정에 필요한 정보가 부족합니다. 객실/체크인/체크아웃을 다시 알려주세요.";
          return res.json(kakaoResponse([outSimpleText(msg)]));
        }
        const avail = await checkAvailability({ roomId, checkIn, checkOut });
        if (!avail.ok) {
          const msg = "죄송합니다 🙏 해당 기간에는 예약이 어렵습니다. 다른 날짜나 객실로 다시 안내해드릴까요?";
          return res.json(kakaoResponse([outSimpleText(msg)]));
        }

        const result = await createBooking({ userId, roomId, checkIn, checkOut });
        if (!result.ok) {
          const msg = "죄송합니다 🙏 예약 확정 중 문제가 생겼습니다. 다시 시도해 주세요.";
          return res.json(kakaoResponse([outSimpleText(msg)]));
        }

        // 확정 후 draft 초기화
        session.draft = { roomId: "", checkIn: "", checkOut: "" };

        const roomName = rooms.find(r => r.id === roomId)?.name || roomId;
        const done = [
          "예약이 확정되었습니다 ✅",
          `예약번호: ${result.booking.id}`,
          `객실: ${roomName}`,
          `체크인: ${checkIn}`,
          `체크아웃: ${checkOut}`
        ].join("\n");

        session.history.push({ role: "user", content: utterance });
        session.history.push({ role: "assistant", content: done });
        session.history = session.history.slice(-20);

        return res.json(kakaoResponse([outSimpleText(done)]));
      }

      if (cmd[1] === "CANCEL") {
        const bookingId = dec(cmd[2] || "");
        const result = await cancelBookingById({ userId, bookingId });
        if (!result.ok) {
          const msg =
            result.reason === "not_found" ? "예약을 찾지 못했습니다." :
            result.reason === "forbidden" ? "해당 예약을 취소할 권한이 없습니다." :
            result.reason === "not_confirmed" ? `이미 취소되었거나 확정 상태가 아닙니다. (상태: ${result.status})` :
            "취소 처리 중 오류가 발생했습니다.";
          return res.json(kakaoResponse([outSimpleText(msg)]));
        }
        const msg = `예약이 취소되었습니다 ✅\n예약번호: ${result.booking.id}`;
        session.history.push({ role: "user", content: utterance });
        session.history.push({ role: "assistant", content: msg });
        session.history = session.history.slice(-20);
        return res.json(kakaoResponse([outSimpleText(msg)]));
      }
    }

    // 8-2) AI 실행 (타입 + payload 생성)
    const aiOut = await runAI({ userId, utterance, session, rooms });

    // 8-3) 서버가 draft를 "강제"로 채우진 않되,
    //      AI가 CONFIRM을 내면 payload에 roomId/checkIn/checkOut이 있으니 draft에 반영(안전한 동기화)
    if (aiOut?.action === "CONFIRM") {
      if (aiOut.confirm.roomId) session.draft.roomId = aiOut.confirm.roomId;
      if (aiOut.confirm.checkIn) session.draft.checkIn = aiOut.confirm.checkIn;
      if (aiOut.confirm.checkOut) session.draft.checkOut = aiOut.confirm.checkOut;
    }

    // 8-4) action별 렌더링 + 서버 검증(필수 데이터 부족 시 CHAT fallback)
    let kakao = null;

    if (aiOut.action === "CHAT") {
      kakao = renderChat(aiOut);
    } else if (aiOut.action === "ROOM_LIST") {
      kakao = renderRoomList(rooms, aiOut.roomView.roomIds, aiOut.roomView.caption);
    } else if (aiOut.action === "ROOM_CARDS") {
      kakao = renderRoomCards(rooms, aiOut.roomView.roomIds, aiOut.roomView.caption);
    } else if (aiOut.action === "HISTORY") {
      const limit = Math.min(Math.max(Number(aiOut.history.limit || 10), 1), 20);
      const bookings = await listBookingsByUserId(userId, limit);
      kakao = renderHistory(rooms, bookings, aiOut.history.caption);
    } else if (aiOut.action === "CONFIRM") {
      const roomId = String(aiOut.confirm.roomId || "");
      const checkIn = String(aiOut.confirm.checkIn || "");
      const checkOut = String(aiOut.confirm.checkOut || "");

      // 서버 검증: 필수 3개가 없으면 CHAT로 짧게 되묻기(강제 라우팅이 아니라 안전 fallback)
      if (!roomId || !checkIn || !checkOut) {
        kakao = kakaoResponse([outSimpleText("예약 확정을 위해 객실, 체크인, 체크아웃 날짜를 알려주세요. (YYYY-MM-DD)")]);
      } else if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
        kakao = kakaoResponse([outSimpleText("날짜 형식은 YYYY-MM-DD로 부탁드립니다. 예: 2026-01-20")]);
      } else if (!checkInWithin30Days(checkIn)) {
        const t = todaySeoul().format("YYYY-MM-DD");
        const limit = todaySeoul().add(30, "day").format("YYYY-MM-DD");
        kakao = kakaoResponse([outSimpleText(`체크인은 오늘(${t})부터 ${limit}까지(30일 이내)만 가능합니다.`)]);
      } else if (dateRangeNights(checkIn, checkOut) <= 0) {
        kakao = kakaoResponse([outSimpleText("체크아웃은 체크인보다 이후 날짜여야 합니다.")]);
      } else {
        // 확정 UI를 띄우기 전에 재고 체크를 한 번 더(확정 질문에서 뒤집히는 UX 방지)
        const avail = await checkAvailability({ roomId, checkIn, checkOut });
        if (!avail.ok) {
          kakao = kakaoResponse([outSimpleText("죄송합니다 🙏 해당 기간에는 예약이 어렵습니다. 다른 날짜나 객실로 안내해드릴까요?")]);
        } else {
          kakao = renderConfirm(rooms, aiOut.confirm);
        }
      }
    } else {
      kakao = kakaoResponse([outSimpleText("무엇을 도와드릴까요?")]);
    }

    // 검증
    const v = basicValidateKakao(kakao);
    if (!v.ok) {
      kakao = kakaoResponse([outSimpleText(`죄송합니다. 응답 생성 중 문제가 발생했습니다. (${v.msg})`)]);
    }

    // 히스토리 업데이트(짧게)
    session.history.push({ role: "user", content: utterance });
    session.history.push({ role: "assistant", content: extractPlainTextForHistory(kakao) || "(응답)" });
    session.history = session.history.slice(-20);

    return res.json(kakao);
  } catch (err) {
    console.error(err);
    return res.json(kakaoResponse([outSimpleText("죄송합니다. 잠시 오류가 발생했습니다 🙏 잠깐 뒤 다시 시도해 주세요.")]));
  }
});

app.get("/health", (_, res) => res.send("ok"));
app.listen(PORT, () => console.log(`Skill server listening on :${PORT}`));
