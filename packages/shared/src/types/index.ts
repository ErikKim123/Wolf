// Design Ref: §3.1 — 공통 도메인 타입 (Domain 레이어, 외부 의존 없음)
// Plan SC: 다국어(*_i18n)·다통화(prices)·타입(product_type)을 1급 개념으로

// ── 기본 유니온 ──────────────────────────────────────────────
export type Locale = 'en' | 'ko' | 'ja' | 'zh-TW';
export type Currency = 'USD' | 'KRW';
export type Role = 'customer' | 'partner' | 'admin';
export type ProductType = 'physical' | 'ticket' | 'subscription';
export type ProductStatus = 'draft' | 'pending' | 'active' | 'soldout';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'done'
  | 'cancelled'
  | 'refunded';
export type PaymentMethod = 'stripe' | 'portone';
export type ShipmentRegion = 'domestic' | 'overseas';
export type ShipmentStatus = 'preparing' | 'shipped' | 'delivered';
export type PartnerStatus = 'pending' | 'active' | 'suspended';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type BoardType = 'notice' | 'qna' | 'review' | 'faq';
export type SectionType = 'hero' | 'slider' | 'featured' | 'category_strip';

// ── 다국어/다통화 표현 ───────────────────────────────────────
/** 언어별 텍스트. 예: { en: "Apparel", ko: "의류" } */
export type I18n = Partial<Record<Locale, string>>;
/** 통화별 금액(최소단위 정수). 예: { USD: 1990, KRW: 2900000 } */
export type Prices = Partial<Record<Currency, number>>;

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ko', 'ja', 'zh-TW'];
export const DEFAULT_LOCALE: Locale = 'en';
export const SUPPORTED_CURRENCIES: readonly Currency[] = ['USD', 'KRW'];
export const DEFAULT_CURRENCY: Currency = 'USD';

// ── 엔티티 ───────────────────────────────────────────────────
export interface Profile {
  id: string; // = auth.users.id
  email: string | null;
  role: Role;
  name: string | null;
  phone: string | null;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  userId: string; // → profiles.id (role=partner)
  companyName: string | null;
  bizNo: string | null;
  commissionRate: number; // 0..1
  settlementInfo: Record<string, unknown> | null;
  status: PartnerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  code: string | null;
  parentId: string | null; // null = 대분류
  nameI18n: I18n;
  sortOrder: number;
  isVisible: boolean;
}

export interface Product {
  id: string;
  code: string | null;
  sellerId: string; // 자사=admin id, 파트너=partner profile id
  isPartnerProduct: boolean;
  productType: ProductType;
  categoryId: string | null;
  nameI18n: I18n;
  detailHtmlI18n: I18n; // 목록 쿼리에서는 제외(성능)
  prices: Prices;
  attributes: Record<string, unknown>; // ticket: {date,seat}, subscription: {tier}
  externalRef: Record<string, unknown> | null; // 123Pass 연동 대비
  aiGenerated: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

// ── 이벤트(티켓) 페이지 템플릿 ──────────────────────────────
/** 이벤트 앵커 메뉴 = 섹션 키 (렌더/메뉴 순서). 콘텐츠 있는 것만 노출 */
export const EVENT_SECTION_KEYS = [
  'about',
  'venue',
  'notice',
  'contact',
  'channel',
  'recommend',
  'refund',
] as const;
export type EventSectionKey = (typeof EVENT_SECTION_KEYS)[number];

// ── 행사(티켓) 확장 — goandance "Create Event" 레퍼런스 기반 ──
// 모두 products.event_content(jsonb) 인라인. 별도 테이블 미사용(주최자 포함).

/** 행사 유형 (Step1 Event type) */
export const EVENT_TYPE_KEYS = [
  'festival',
  'congress',
  'workshop',
  'bootcamp',
  'party',
  'social',
  'competition',
  'other',
] as const;
export type EventType = (typeof EVENT_TYPE_KEYS)[number];

/** 참가자 추천 레벨 (Step6 Attendees levels) */
export const ATTENDEE_LEVEL_KEYS = ['beginner', 'intermediate', 'advanced'] as const;
export type AttendeeLevel = (typeof ATTENDEE_LEVEL_KEYS)[number];

/** 참가자 주요 출신 (Step6 Attendees location) */
export const ATTENDEES_LOCATION_KEYS = ['local', 'national', 'international'] as const;
export type AttendeesLocation = (typeof ATTENDEES_LOCATION_KEYS)[number];

/** 티켓(패스) 종류 (Step5 Ticket type) */
export const TICKET_TIER_TYPE_KEYS = [
  'full_pass',
  'day_pass',
  'party_pass',
  'hotel',
  'shuttle',
  'other',
] as const;
export type TicketTierType = (typeof TICKET_TIER_TYPE_KEYS)[number];

/** 결제 수수료 부담 주체 (Step5 Fees) */
export type TicketFeeMode = 'client' | 'absorb';

/** 댄스 스타일 — 멀티선택 칩 (Step6 Dancing styles). 값=영문 표준 명칭, 표시도 동일. */
export const DANCE_STYLES = [
  'Bachata', 'Kizomba', 'Salsa',
  'Afro', 'Afro House', 'Bachata Influence', 'Bachazouk', 'Balboa', 'Ballet',
  'Ballroom dancing', 'Belly Dance', 'Bolero', 'Bollywood', 'Break Dance', 'Burlesque',
  'Capoeira', 'Cha Cha Cha', 'Classic dance', 'Contemporary dance', 'Country', 'Cuban Salsa',
  'DanceHall', 'Dembow', 'Dominican Bachata', 'Flamenco', 'Forró', 'Funky', 'Guaguanco',
  'Hip Hop', 'Hula', 'Jazz', 'Krump', 'Kuduru', 'Lady style', 'Lambazouk', 'Lindy Hop',
  'Locking', 'Mambo', 'Merengue', 'Modern dance', 'Oriental dance', 'Pachanga', 'Pilates',
  'Pole Dance', 'Popping', 'Reggaeton', 'Rock & Roll', 'Rumba', 'Samba', 'Semba', 'Swing',
  'Tango', 'Tap dance', 'Twerk', 'Urban', 'Vals', 'West Coast Swing', 'Zouk',
] as const;
export type DanceStyle = (typeof DANCE_STYLES)[number];

/** 구조화 행사 주소 (Step3 Edit address) — 기존 location(i18n 텍스트)과 병행 */
export interface EventAddress {
  line1?: string; // 도로명/상세 주소
  city?: string;
  postalCode?: string; // 우편번호
  country?: string; // 국가 (표시명 또는 ISO)
  province?: string; // 시/도 (Province)
}

/** 주최자 프로필 (Step2) — event_content 인라인(별도 테이블 미사용) */
export interface EventOrganizer {
  name?: I18n;
  logo?: string; // 로고 이미지 URL
  description?: I18n;
  contact?: string; // 이메일/전화/URL
}

/** 티켓(패스) 티어 — 1행사 N티켓 (Step5) */
export interface EventTicketTier {
  key: string; // 로컬 식별자(렌더 key/정렬용, 저장 유지)
  name?: I18n; // 티켓명
  type?: TicketTierType; // 패스 종류
  units?: number; // 판매 수량(총)
  price?: Prices; // 판매가(다통화)
  feeMode?: TicketFeeMode; // 수수료 부담 주체
}

/** 대상(오디언스) (Step6) */
export interface EventAudience {
  estimatedAttendees?: number; // 예상 참가자 수
  attendeesLocation?: AttendeesLocation; // 참가자 주요 출신
  levels?: AttendeeLevel[]; // 추천 레벨(복수)
  danceStyles?: string[]; // 댄스 스타일(복수)
}

/** 구조화 주소 → 한 줄 표시 문자열 (빈 값 제외, 콤마 결합). 고객 페이지 장소 표기용. */
export function formatEventAddress(a?: EventAddress): string {
  if (!a) return '';
  return [a.line1, a.city, a.province, a.postalCode, a.country]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** 티켓 상품의 이벤트 페이지 콘텐츠(products.event_content). 모든 텍스트는 i18n. */
export interface EventContent {
  banner?: I18n; // 히어로 배너 이미지 URL (locale별)
  badge?: I18n; // 상단 배지 텍스트 (예: "전문가와 함께하는 …")
  subtitle?: I18n; // 부제 (예: "조직 생존을 위한 …")
  startAt?: string; // 일시 시작 (ISO, datetime-local)
  endAt?: string; // 일시 종료
  applyStart?: string; // 신청 시작
  applyEnd?: string; // 신청 종료
  priceText?: I18n; // 비용 표기 (비우면 상품가격/무료 자동)
  location?: I18n; // 장소(자유 텍스트 표기)
  media?: string[]; // 미디어 URL 목록(유튜브/인스타/이미지/동영상 자동판별, 언어공통) — 본문 상단 갤러리
  sections?: Partial<Record<EventSectionKey, I18n>>; // 섹션별 i18n HTML
  // ── goandance 레퍼런스 확장 ──
  eventType?: EventType; // 행사 유형
  address?: EventAddress; // 구조화 장소
  organizer?: EventOrganizer; // 주최자 프로필(인라인)
  tickets?: EventTicketTier[]; // 티켓 티어 목록
  audience?: EventAudience; // 대상(오디언스)
}

export interface Order {
  id: string;
  orderNo: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: Currency;
  paymentMethod: PaymentMethod | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  sellerId: string; // 정산 근거
  qty: number;
  unitPrice: number;
  lineAmount: number;
  currency: Currency;
}

export interface Shipment {
  id: string;
  orderId: string;
  region: ShipmentRegion;
  carrier: string | null;
  trackingNo: string | null;
  status: ShipmentStatus;
  shippedAt: string | null;
  eta: string | null;
  cost: number;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string; // 'JNJ' | 'DIV' (+tier)
  status: SubscriptionStatus;
  periodStart: string | null;
  periodEnd: string | null;
  price: number | null;
  currency: Currency;
}

export interface Banner {
  id: string;
  position: string | null;
  titleI18n: I18n;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
}

export interface Board {
  id: string;
  boardType: BoardType | null;
  title: string | null;
  content: string | null;
  authorId: string | null;
  status: string;
  createdAt: string;
}

export interface MainSection {
  id: string;
  sectionType: SectionType | null;
  config: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
}

export interface AiProductJob {
  id: string;
  productId: string | null;
  input: Record<string, unknown> | null;
  generatedHtml: string | null;
  status: string;
  createdAt: string;
}
