// Design Ref: §5 Phase 4 — 체크아웃 (주문 생성: orders + order_items, seller 분리 = 파트너 정산 근거)
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { pickI18n, pickPrice, toDisplayAmount, type Currency, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart/CartContext';
import { validateCoupon } from '@/lib/coupon';
import type { Dictionary } from '@/i18n/dictionaries';

function makeOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  // 시분초 + 3자리 난수 → order_no unique 충돌 사실상 제거
  const hms = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(
    d.getSeconds(),
  ).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ORD-${ymd}-${hms}${rand}`;
}

export function CheckoutView({
  locale,
  dict,
  userId,
}: {
  locale: Locale;
  dict: Dictionary;
  userId: string;
}) {
  const { items, clear } = useCart();
  const currency = currencyForLocale(locale) as Currency;
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);

  const fmt = (minor: number) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
    }).format(toDisplayAmount(minor, currency));

  const totalMinor = items.reduce((s, i) => s + (pickPrice(i.prices, currency) ?? 0) * i.qty, 0);

  const [couponCode, setCouponCode] = useState('');
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const discountMinor = applied?.discount ?? 0;
  const finalMinor = Math.max(0, totalMinor - discountMinor);

  async function applyCoupon() {
    setCouponMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    const res = await validateCoupon(couponCode, totalMinor, currency, today);
    if (res.ok) {
      setApplied({ code: res.coupon.code, discount: res.discount });
      setCouponMsg(dict.cart.couponApplied);
    } else {
      setApplied(null);
      setCouponMsg(res.reason === 'min' ? dict.cart.couponMin : dict.cart.couponInvalid);
    }
  }

  async function placeOrder() {
    setError(null);
    setPlacing(true);
    try {
      const supabase = createClient();
      const no = makeOrderNo();
      const { data: order, error: oerr } = await supabase
        .from('orders')
        .insert({
          order_no: no,
          buyer_id: userId,
          status: 'pending',
          total_amount: finalMinor,
          currency,
          payment_method: null,
          coupon_code: applied?.code ?? null,
          discount_amount: discountMinor,
        })
        .select('id')
        .single();
      if (oerr) throw oerr;

      // 주문항목 — seller_id 분리 저장(정산 근거)
      const rows = items.map((i) => {
        const unit = pickPrice(i.prices, currency) ?? 0;
        return {
          order_id: order.id,
          product_id: i.id,
          seller_id: i.seller_id,
          qty: i.qty,
          unit_price: unit,
          line_amount: unit * i.qty,
          currency,
        };
      });
      const { error: ierr } = await supabase.from('order_items').insert(rows);
      if (ierr) throw ierr;

      // 쿠폰 사용 횟수 원자적 증가(RLS 우회 RPC). 주문은 이미 생성됐으므로 실패해도 주문은 유지.
      if (applied?.code) {
        await supabase.rpc('redeem_coupon', { p_code: applied.code });
      }

      clear();
      setOrderNo(no);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPlacing(false);
    }
  }

  // 주문 완료
  if (orderNo) {
    return (
      <div className="container-wolf flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <CheckCircle2 size={56} className="text-success" />
        <h1 className="section-title">{dict.cart.orderComplete}</h1>
        <p className="text-grey-500">
          {dict.cart.orderNo}: <span className="font-medium text-black">{orderNo}</span>
        </p>
        <Link href={`/${locale}`} className="btn btn-secondary btn-sm">
          {dict.cart.continue}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-wolf py-20 text-center">
        <p className="text-grey-500">{dict.cart.empty}</p>
        <Link href={`/${locale}`} className="btn btn-secondary btn-sm mt-4">
          {dict.cart.continue}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-wolf max-w-2xl py-8">
      <h1 className="section-title mb-6">{dict.cart.checkout}</h1>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <ul className="divide-y divide-grey-100 border-y border-grey-100">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
            <span className="truncate">
              {pickI18n(i.name_i18n, locale)} × {i.qty}
            </span>
            <span className="font-medium">{fmt((pickPrice(i.prices, currency) ?? 0) * i.qty)}</span>
          </li>
        ))}
      </ul>

      {/* 쿠폰 */}
      <div className="mt-6 flex gap-2">
        <input
          className="input flex-1"
          placeholder={dict.cart.couponPlaceholder}
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
        <button type="button" className="btn btn-secondary btn-sm whitespace-nowrap" onClick={applyCoupon}>
          {dict.cart.apply}
        </button>
      </div>
      {couponMsg && (
        <p className={`mt-1.5 text-sm ${applied ? 'text-success' : 'text-danger'}`}>{couponMsg}</p>
      )}

      {/* 합계 */}
      <div className="mt-6 space-y-1.5 border-t border-grey-100 pt-4">
        <div className="flex justify-between text-sm text-grey-600">
          <span>{dict.cart.subtotal}</span>
          <span>{fmt(totalMinor)}</span>
        </div>
        {discountMinor > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>
              {dict.cart.discount} ({applied?.code})
            </span>
            <span>-{fmt(discountMinor)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="label-caps">{dict.cart.total}</span>
          <span className="font-display text-2xl">{fmt(finalMinor)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={placeOrder}
        disabled={placing}
        className="btn btn-primary mt-6 w-full"
      >
        {placing ? '…' : dict.cart.checkout}
      </button>
    </div>
  );
}
