// Design Ref: §5 Phase 4 — 내 주문내역 (로그인 가드, 본인 주문 + 항목 + 상품명)
import { redirect } from 'next/navigation';
import { Truck } from 'lucide-react';
import { pickI18n, toDisplayAmount, type Currency, type Locale } from '@wolf/shared';
import { intlLocale } from '@/lib/locale';
import { getDictionary } from '@/i18n/dictionaries';
import { createClient } from '@/lib/supabase/server';
import { getMyOrders } from '@/lib/queries/orders';

export const dynamic = 'force-dynamic';

export default async function MyOrdersPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=account/orders`);

  const orders = await getMyOrders();

  const fmt = (minor: number, currency: string) =>
    new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: currency as Currency,
      minimumFractionDigits: currency === 'KRW' ? 0 : 2,
    }).format(toDisplayAmount(minor, currency as Currency));

  const statusLabel = (s: string) =>
    (dict.orders.status as Record<string, string>)[s] ?? s;
  const shipStatus = (s: string) =>
    (dict.shipping.status as Record<string, string>)[s] ?? s;
  const regionLabel = (r: string) =>
    r === 'overseas' ? dict.shipping.overseas : dict.shipping.domestic;

  return (
    <div className="container-wolf max-w-3xl py-8">
      <h1 className="section-title mb-6">{dict.orders.title}</h1>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-grey-400">{dict.orders.empty}</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-grey-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grey-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{o.order_no}</span>
                  <span className="rounded-pill bg-grey-100 px-2.5 py-1 text-xs font-medium text-grey-600">
                    {statusLabel(o.status)}
                  </span>
                </div>
                <time className="text-xs text-grey-400">{String(o.created_at).slice(0, 10)}</time>
              </div>

              <ul className="py-3 text-sm">
                {o.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-4 py-1">
                    <span className="truncate text-grey-700">
                      {pickI18n(it.products?.name_i18n, locale) || '—'} × {it.qty}
                    </span>
                    <span>{fmt(it.line_amount, it.currency)}</span>
                  </li>
                ))}
              </ul>

              {/* 배송 정보 */}
              {o.shipments[0] ? (
                <div className="border-t border-grey-100 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Truck size={14} className="text-grey-400" />
                    <span className="label-caps">{dict.shipping.title}</span>
                    <span className="rounded-pill bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-600">
                      {shipStatus(o.shipments[0].status)}
                    </span>
                    <span className="text-xs text-grey-400">{regionLabel(o.shipments[0].region)}</span>
                  </div>
                  {o.shipments[0].tracking_no && (
                    <p className="mt-1 text-grey-600">
                      {dict.shipping.carrier}: {o.shipments[0].carrier || '—'} · {dict.shipping.tracking}:{' '}
                      {o.shipments[0].tracking_no}
                    </p>
                  )}
                  {o.shipments[0].eta && (
                    <p className="text-grey-500">
                      {dict.shipping.eta}: {String(o.shipments[0].eta).slice(0, 10)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-t border-grey-100 py-3 text-sm text-grey-400">
                  {dict.shipping.none}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-grey-100 pt-3">
                <span className="label-caps">{dict.cart.total}</span>
                <span className="font-display text-lg">{fmt(o.total_amount, o.currency)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
