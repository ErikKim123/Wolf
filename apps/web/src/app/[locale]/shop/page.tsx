// Design Ref: §5 — 상품 탐색 (타입 탭: 전체/실물/티켓/구독)
import Link from 'next/link';
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
    : undefined;
  const products = await listProducts({ productType: type });
  const typeLabel = (t: string) => (dict.product.types as Record<string, string>)[t] ?? t;

  function Tab({ href, text, active }: { href: string; text: string; active: boolean }) {
    return (
      <Link
        href={href}
        className={`rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
          active ? 'bg-black text-white' : 'border border-grey-300 text-grey-600 hover:border-black'
        }`}
      >
        {text}
      </Link>
    );
  }

  return (
    <div className="container-wolf py-8">
      <h1 className="section-title mb-6">{dict.shop.title}</h1>

      <div className="mb-8 flex flex-wrap gap-2">
        <Tab href={`/${locale}/shop`} text={dict.shop.all} active={!type} />
        {TYPES.map((t) => (
          <Tab key={t} href={`/${locale}/shop?type=${t}`} text={typeLabel(t)} active={type === t} />
        ))}
      </div>

      <ProductGrid products={products} locale={locale} dict={dict} />
    </div>
  );
}
