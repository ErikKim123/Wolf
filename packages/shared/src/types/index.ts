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
