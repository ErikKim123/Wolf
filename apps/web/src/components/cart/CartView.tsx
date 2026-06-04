// Design Ref: §5 Phase 4 — 장바구니 화면 (수량 조절·삭제·합계·체크아웃)
'use client';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { pickI18n, pickPrice, toDisplayAmount, type Currency, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { useCart, type CartItem } from '@/lib/cart/CartContext';
import type { Dictionary } from '@/i18n/dictionaries';

export function CartView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, setQty, remove } = useCart();
  const currency = currencyForLocale(locale);

  const fmt = (minor: number) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: currency as Currency,
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
    }).format(toDisplayAmount(minor, currency));

  const lineMinor = (i: CartItem) => (pickPrice(i.prices, currency) ?? 0) * i.qty;
  const totalMinor = items.reduce((s, i) => s + lineMinor(i), 0);

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
    <div className="container-wolf max-w-3xl py-8">
      <h1 className="section-title mb-6">{dict.cart.title}</h1>

      <ul className="divide-y divide-grey-100 border-y border-grey-100">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{pickI18n(i.name_i18n, locale)}</p>
              <p className="text-sm text-grey-500">{fmt(pickPrice(i.prices, currency) ?? 0)}</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQty(i.id, i.qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-pill border border-grey-300 hover:bg-grey-100"
                aria-label="-"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm">{i.qty}</span>
              <button
                type="button"
                onClick={() => setQty(i.id, i.qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-pill border border-grey-300 hover:bg-grey-100"
                aria-label="+"
              >
                <Plus size={14} />
              </button>
            </div>

            <p className="w-24 text-right font-medium">{fmt(lineMinor(i))}</p>
            <button
              type="button"
              onClick={() => remove(i.id)}
              className="text-grey-400 hover:text-danger"
              aria-label={dict.cart.remove}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="label-caps">{dict.cart.total}</span>
        <span className="font-display text-2xl">{fmt(totalMinor)}</span>
      </div>

      <Link href={`/${locale}/checkout`} className="btn btn-primary mt-6 w-full">
        {dict.cart.checkout}
      </Link>
    </div>
  );
}
