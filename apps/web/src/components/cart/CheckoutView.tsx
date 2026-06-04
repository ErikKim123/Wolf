// Design Ref: §5 Phase 4 — 체크아웃 (주문 생성: orders + order_items, seller 분리 = 파트너 정산 근거)
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { pickI18n, pickPrice, toDisplayAmount, type Currency, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/cart/CartContext';
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
          total_amount: totalMinor,
          currency,
          payment_method: null,
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

      <div className="mt-6 flex items-center justify-between">
        <span className="label-caps">{dict.cart.total}</span>
        <span className="font-display text-2xl">{fmt(totalMinor)}</span>
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
