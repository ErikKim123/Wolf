// Design Ref: 설명.txt 쿠폰관리 — 고객 쿠폰 검증/할인 계산 (공개 읽기 RLS)
import type { Currency } from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';

export interface Coupon {
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

export type CouponResult =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: 'invalid' | 'min' | 'expired' | 'used' };

/** 할인액(최소단위) 계산 — 총액을 넘지 않도록 캡 */
export function computeDiscount(coupon: Coupon, totalMinor: number, currency: Currency): number {
  let d = 0;
  if (coupon.discount_type === 'percent') {
    d = Math.floor((totalMinor * coupon.discount_value) / 100);
  } else if (coupon.currency === currency) {
    d = coupon.discount_value; // 정액: 통화 일치 시에만
  }
  return Math.min(d, totalMinor);
}

/** 쿠폰 코드 검증 + 할인 계산 */
export async function validateCoupon(
  code: string,
  totalMinor: number,
  currency: Currency,
  today: string,
): Promise<CouponResult> {
  const { data } = await createClient()
    .from('coupons')
    .select(
      'code, discount_type, discount_value, min_amount, currency, starts_at, ends_at, usage_limit, used_count, is_active',
    )
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  const coupon = data as Coupon | null;
  if (!coupon) return { ok: false, reason: 'invalid' };
  if (coupon.starts_at && coupon.starts_at > today) return { ok: false, reason: 'expired' };
  if (coupon.ends_at && coupon.ends_at < today) return { ok: false, reason: 'expired' };
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, reason: 'used' };
  }
  if (coupon.min_amount > 0 && totalMinor < coupon.min_amount) {
    return { ok: false, reason: 'min' };
  }
  return { ok: true, coupon, discount: computeDiscount(coupon, totalMinor, currency) };
}
