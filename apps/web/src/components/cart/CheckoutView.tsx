// Design Ref: §5 Phase 4 — 체크아웃 (서버 결제 시작 → Stripe 리다이렉트 / PortOne SDK).
// 주문 생성·금액계산·쿠폰차감은 전부 서버(/api/payments/checkout)가 수행. 여기선 장바구니→결제 트리거만.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { pickI18n, pickPrice, toDisplayAmount, type Currency, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { useCart } from '@/lib/cart/CartContext';
import { validateCoupon } from '@/lib/coupon';
import type { Dictionary } from '@/i18n/dictionaries';

export function CheckoutView({
  locale,
  dict,
  userId,
  paymentEnabled,
}: {
  locale: Locale;
  dict: Dictionary;
  userId: string;
  paymentEnabled: boolean;
}) {
  // userId 는 서버 가드용으로 받지만 결제 본인확인은 서버가 세션으로 재확인한다.
  void userId;
  const { items, clear } = useCart();
  const currency = currencyForLocale(locale) as Currency;
  const search = useSearchParams();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(
    search.get('canceled') ? dict.cart.canceled : null,
  );

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

  async function pay() {
    setError(null);
    setPlacing(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          couponCode: applied?.code ?? null,
          locale,
        }),
      });

      if (!res.ok) {
        setError(res.status === 503 ? dict.cart.payDisabled : dict.cart.payFailed);
        return;
      }
      const data = await res.json();

      // Stripe / 0원주문 → 호스티드 페이지 또는 완료 페이지로 이동 (장바구니는 완료 페이지에서 비움)
      if (data.kind === 'stripe' || data.kind === 'free') {
        window.location.href = data.url ?? data.redirectUrl;
        return;
      }

      // PortOne → 브라우저 SDK 결제창
      if (data.kind === 'portone') {
        const PortOne = await import('@portone/browser-sdk/v2');
        const response = await PortOne.requestPayment({
          storeId: data.storeId,
          channelKey: data.channelKey,
          paymentId: data.paymentId,
          orderName: data.orderName,
          totalAmount: data.amount,
          currency: 'CURRENCY_KRW',
          payMethod: 'CARD',
          redirectUrl: data.redirectUrl,
        });
        // 모바일은 redirectUrl 로 페이지 전환되어 여기 도달 안 함. 데스크톱 팝업만 응답 반환.
        if (response?.code != null) {
          setError(response.message || dict.cart.payFailed);
          return;
        }
        // 서버 검증으로 확정
        const comp = await fetch('/api/payments/portone/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, paymentId: data.paymentId }),
        });
        const cdata = await comp.json().catch(() => ({}));
        if (!comp.ok || !cdata.ok) {
          setError(dict.cart.payFailed);
          return;
        }
        clear();
        window.location.href = `/${locale}/checkout/success?order=${data.orderNo}`;
        return;
      }

      setError(dict.cart.payFailed);
    } catch {
      setError(dict.cart.payFailed);
    } finally {
      setPlacing(false);
    }
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
        onClick={pay}
        disabled={placing || !paymentEnabled}
        className="btn btn-primary mt-6 w-full"
      >
        {placing ? dict.cart.paying : dict.cart.pay}
      </button>
      {!paymentEnabled && (
        <p className="mt-2 text-center text-sm text-grey-500">{dict.cart.payDisabled}</p>
      )}
    </div>
  );
}
