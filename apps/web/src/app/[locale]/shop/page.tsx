// Design Ref: §5 — 상품 탐색 (타입 탭: 전체/실물/티켓/구독)
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { listProducts } from '@/lib/queries/products';
import { ProductGrid } from '@/components/product/ProductGrid';

export const dynamic = 'force-dynamic';

const TYPES = ['physical', 'ticket', 'subscription'] as const;

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { type?: string };
}) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const type = TYPES.includes(searchParams.type as (typeof TYPES)[number])
    ? searchParams.type
    : 'physical';
  const products = await listProducts({ productType: type });
  const title =
    type === 'ticket'
      ? dict.nav.tickets
      : type === 'subscription'
        ? dict.nav.subscription
        : dict.shop.title;

  return (
    <div className="container-wolf py-8">
      <h1 className="section-title mb-6">{title}</h1>

      <ProductGrid products={products} locale={locale} dict={dict} />
    </div>
  );
}
