/**
 * 카카오톡 챗봇 스킬 API 타입 정의
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/make_skill
 * @see https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/response_format
 */

/** 스킬 서버로 전달되는 요청 (스킬 payload) */
export interface KakaoSkillRequest {
  intent?: {
    id: string;
    name: string;
    extra?: Record<string, unknown>;
  };

  bot?: {
    id: string;
    name: string;
  };

  action: {
    id: string;
    name: string;

    /** 엔티티 파라미터(문자열 맵) */
    params?: Record<string, string>;

    /** 엔티티 상세 파라미터 */
    detailParams?: Record<
      string,
      { origin?: string; value?: string; groupName?: string }
    >;

    /**
     * quickReplies/buttons의 extra 등으로 전달된 값이 들어오는 영역
     * (실제 요청에서 종종 사용)
     */
    clientExtra?: Record<string, unknown> | null;
  };

  userRequest: {
    timezone: string;
    params?: Record<string, unknown>;
    block?: { id: string; name: string };
    utterance: string;
    lang: string;
    user: {
      id: string;
      type: string;

      /**
       * plusfriendUserKey, appUserId, isFriend 등
       * 케이스가 다양하므로 Record로 두는 편이 안전
       */
      properties?: Record<string, unknown>;
    };
  };

  contexts?: Array<{
    name: string;
    lifeSpan: number;
    params?: Record<string, { value: string; origin?: string }>;
    ttl?: number;
  }>;

  /** 대화 흐름 정보 */
  flow?: {
    trigger?: {
      type?: string;
      referrerBlock?: { id: string; name: string };
    };
    lastBlock?: { id: string; name: string };
  };
}

/* ---------------------------------------
 * Common Subtypes
 * ------------------------------------- */

export interface KakaoLink {
  pc?: string;
  mobile?: string;
  web?: string;
}

export type KakaoButtonAction =
  | "webLink"
  | "message"
  | "phone"
  | "block"
  | "share"
  | "operator";

export interface KakaoButton {
  label: string;
  action: KakaoButtonAction;

  // action별 필드
  webLinkUrl?: string; // webLink
  messageText?: string; // message/block에서 사용되는 경우가 많음
  phoneNumber?: string; // phone
  blockId?: string; // block
  extra?: Record<string, unknown>; // 다음 요청에서 action.clientExtra로 수신될 수 있음
}

export type KakaoButtonLayout = "vertical" | "horizontal";

export interface KakaoThumbnail {
  imageUrl: string;
  altText?: string;
  link?: KakaoLink;
  fixedRatio?: boolean;
}

/* ---------------------------------------
 * Outputs (Components)
 * ------------------------------------- */

export interface KakaoSimpleText {
  simpleText: { text: string };
}

export interface KakaoSimpleImage {
  simpleImage: { imageUrl: string; altText: string };
}

/** TextCard */
export interface KakaoTextCard {
  textCard: {
    title?: string;
    description?: string;
    buttons?: KakaoButton[];
    buttonLayout?: KakaoButtonLayout;
  };
}

/** -----------------------
 * BasicCard (Body + Wrapper)
 * ---------------------- */

export interface KakaoBasicCardBody {
  title?: string;
  description?: string;
  thumbnail: KakaoThumbnail;
  buttons?: KakaoButton[];
  buttonLayout?: KakaoButtonLayout;
}

export interface KakaoBasicCard {
  basicCard: KakaoBasicCardBody;
}

/** -----------------------
 * CommerceCard (Body + Wrapper)
 * ---------------------- */

export interface KakaoCommerceCardBody {
  title?: string;
  description?: string;

  price: number;
  currency?: "won" | string;

  discount?: number;
  discountRate?: number;
  discountedPrice?: number;

  thumbnails: KakaoThumbnail[];

  profile?: {
    nickname: string;
    imageUrl?: string;
  };

  buttons?: KakaoButton[];
  buttonLayout?: KakaoButtonLayout;
}

export interface KakaoCommerceCard {
  commerceCard: KakaoCommerceCardBody;
}

/** -----------------------
 * ListCard (Body + Wrapper)
 * ---------------------- */

export interface KakaoListItem {
  title: string;
  description?: string;
  imageUrl?: string;
  link?: KakaoLink;

  action?: "block" | "message";
  blockId?: string;
  messageText?: string;
  extra?: Record<string, unknown>;
}

export interface KakaoListCardBody {
  header: KakaoListItem;
  items: KakaoListItem[];
  buttons?: KakaoButton[];
  buttonLayout?: KakaoButtonLayout;
}

export interface KakaoListCard {
  listCard: KakaoListCardBody;
}

/** -----------------------
 * ItemCard (Body + Wrapper)
 * ---------------------- */

export interface KakaoItemCardBody {
  thumbnail?: {
    imageUrl: string;
    altText?: string;
    width?: number;
    height?: number;
    link?: KakaoLink;
  };

  head?: { title: string };

  profile?: {
    title: string;
    imageUrl?: string;
    width?: number;
    height?: number;
  };

  imageTitle?: {
    title: string;
    description?: string;
    imageUrl?: string;
  };

  title?: string;
  description?: string;

  itemList: Array<{ title: string; description: string }>;
  itemListAlignment?: "left" | "right";
  itemListSummary?: { title: string; description: string };

  buttons?: KakaoButton[];
  buttonLayout?: KakaoButtonLayout;
}

export interface KakaoItemCard {
  itemCard: KakaoItemCardBody;
}


/** Carousel */
export type KakaoCarouselType = "basicCard" | "commerceCard" | "listCard" | "itemCard";

export interface KakaoCarouselHeader {
  title: string;
  description?: string;
  thumbnail?: KakaoThumbnail;
}

export type KakaoCarouselItem = KakaoBasicCardBody | KakaoCommerceCardBody | KakaoListCardBody | KakaoItemCardBody;

export interface KakaoCarousel {
  carousel: {
    type: KakaoCarouselType;
    items: KakaoCarouselItem[];
    header?: KakaoCarouselHeader;
  };
}

/** (추가 확장 여지) itemCard 외에 itemCard v2 / itemCard+ 등 변형이 생길 수 있으므로 필요 시 union에 계속 추가 */

/** 최종 outputs 컴포넌트 유니온 */
export type KakaoOutputComponent =
  | KakaoSimpleText
  | KakaoSimpleImage
  | KakaoTextCard
  | KakaoBasicCard
  | KakaoCommerceCard
  | KakaoListCard
  | KakaoItemCard
  | KakaoCarousel;

/* ---------------------------------------
 * QuickReplies
 * ------------------------------------- */

/**
 * quickReplies는 구현/문서/레거시에 따라 action 값이 대소문자 차이가 나는 경우가 있어
 * 안전하게 허용 범위를 넓혀 둡니다.
 */
export type KakaoQuickReplyAction = "message" | "Message" | "block";

export type KakaoQuickReply =
  | {
      label: string;
      action: "message" | "Message";
      messageText: string;
      extra?: Record<string, unknown>;
    }
  | {
      label: string;
      action: "block";
      messageText: string;
      blockId: string;
      extra?: Record<string, unknown>;
    };

/* ---------------------------------------
 * Response + Context Control
 * ------------------------------------- */

export interface KakaoContextValue {
  name: string;
  lifeSpan: number;
  ttl?: number;
  params?: Record<string, unknown>;
}

export interface KakaoSkillResponse {
  version: "2.0";

  template?: {
    outputs: KakaoOutputComponent[];
    quickReplies?: KakaoQuickReply[];
  };

  /** 컨텍스트 설정/갱신 */
  context?: {
    values?: KakaoContextValue[];
  };

  /** 임의 데이터(클라이언트/서버간 전달용) */
  data?: Record<string, unknown>;
}
