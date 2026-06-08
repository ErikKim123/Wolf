// Design Ref: §5 Phase 4 — 서버 측 금액 재계산 (클라이언트 total 신뢰 안 함)
// 클라이언트는 상품id+수량+쿠폰코드만 보낸다. 단가/합계/할인은 전부 DB 기준으로 서버가 다시 계산.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  pickI18n,
  pickPrice,
  type Currency,
  type Locale,
  type Prices,
} from '@wolf/shared';

export interface CartLine {
  id: string;
  qty: number;
}

export interface QuoteItem {
  productId: string;
  sellerId: string;
  qty: number;
  unitPrice: number;
  lineAmount: number;
}

export interface Quote {
  currency: Currency;
  items: QuoteItem[];
  subtotal: number; // 최소단위
  discount: number; // 최소단위
  total: number; // 최소단위 (= subtotal - discount, 0 이상)
  couponCode: string | null;
  orderName: string; // PG 표시용 ("상품명 외 N건")
}

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; reason: 'empty' | 'invalid_item' | 'unavailable' | 'coupon' };

interface ProductRow {
  id: string;
  seller_id: string;
  status: string;
  name_i18n: Record<string, string>;
  prices: Prices;
}

interface CouponRow {
  code: string;
  discount_type: string;
  discount_value: number;
  min_amount: number;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

/** 할인액(최소단위) — 총액을 넘지 않도록 캡. 정액 쿠폰은 통화 일치 시에만. */
function computeDiscount(coupon: CouponRow, subtotal: number, currency: Currency): number {
  let d = 0;
  if (coupon.discount_type === 'percent') {
    d = Math.floor((subtotal * coupon.discount_value) / 100);
  } else if (coupon.currency === currency) {
    d = coupon.discount_value;
  }
  return Math.min(Math.max(0, d), subtotal);
}

function buildOrderName(items: QuoteItem[], names: Map<string, string>, locale: Locale): string {
  const first = names.get(items[0]?.productId ?? '') || 'Wolf';
  const more = items.length - 1;
  if (more <= 0) return first;
  return locale === 'ko' ? `${first} 외 ${more}건` : `${first} +${more} more`;
}

/**
 * 장바구니(상품id+수량)와 쿠폰코드로 서버 권위 견적을 만든다.
 * 가격은 DB 의 products.prices[currency] 에서만 읽는다 → 클라이언트 가격 위조 불가.
 * db: 로그인 사용자 세션 클라이언트(RLS 적용). 상품/쿠폰은 공개 조회라 anon 으로 충분 → service role 불필요.
 */
export async function quoteCart(
  db: SupabaseClient,
  lines: CartLine[],
  currency: Currency,
  locale: Locale,
  couponCode: string | null,
  today: string,
): Promise<QuoteResult> {
  const clean = (lines ?? []).filter(
    (l) => l && typeof l.id === 'string' && Number.isInteger(l.qty) && l.qty > 0,
  );
  if (clean.length === 0) return { ok: false, reason: 'empty' };

  const ids = [...new Set(clean.map((l) => l.id))];
  const { data, error } = await db
    .from('products')
    .select('id, seller_id, status, name_i18n, prices')
    .in('id', ids);
  if (error) return { ok: false, reason: 'invalid_item' };

  const byId = new Map<string, ProductRow>((data as ProductRow[]).map((p) => [p.id, p]));
  const names = new Map<string, string>();
  const items: QuoteItem[] = [];

  for (const line of clean) {
    const p = byId.get(line.id);
    if (!p) return { ok: false, reason: 'invalid_item' };
    if (p.status !== 'active') return { ok: false, reason: 'unavailable' };
    const unit = pickPrice(p.prices, currency);
    if (unit == null) return { ok: false, reason: 'unavailable' };
    names.set(p.id, pickI18n(p.name_i18n, locale) || 'Wolf');
    items.push({
      productId: p.id,
      sellerId: p.seller_id,
      qty: line.qty,
      unitPrice: unit,
      lineAmount: unit * line.qty,
    });
  }

  const subtotal = items.reduce((s, i) => s + i.lineAmount, 0);

  // 쿠폰 서버 검증 (클라이언트 검증과 동일 규칙을 서버 권위로 재확인)
  let discount = 0;
  let appliedCode: string | null = null;
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const { data: crow } = await db
      .from('coupons')
      .select(
        'code, discount_type, discount_value, min_amount, currency, starts_at, ends_at, usage_limit, used_count, is_active',
      )
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    const coupon = crow as CouponRow | null;
    if (coupon) {
      const expired =
        (coupon.starts_at && coupon.starts_at > today) ||
        (coupon.ends_at && coupon.ends_at < today);
      const usedUp = coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit;
      const belowMin = coupon.min_amount > 0 && subtotal < coupon.min_amount;
      if (expired || usedUp || belowMin) return { ok: false, reason: 'coupon' };
      discount = computeDiscount(coupon, subtotal, currency);
      appliedCode = coupon.code;
    } else {
      return { ok: false, reason: 'coupon' };
    }
  }

  const total = Math.max(0, subtotal - discount);
  return {
    ok: true,
    quote: {
      currency,
      items,
      subtotal,
      discount,
      total,
      couponCode: appliedCode,
      orderName: buildOrderName(items, names, locale),
    },
  };
}
