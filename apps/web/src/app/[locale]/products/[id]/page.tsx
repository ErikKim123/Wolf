// Design Ref: §5 Phase 3 — 상품 상세 라우트 (/[locale]/products/[id])
import { notFound } from 'next/navigation';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { getProduct } from '@/lib/queries/product';
import { ProductDetail } from '@/components/product/ProductDetail';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const locale = params.locale as Locale;
  const [dict, product] = await Promise.all([getDictionary(locale), getProduct(params.id)]);

  if (!product || product.status === 'draft' || product.status === 'pending') {
    notFound();
  }

  return <ProductDetail product={product} locale={locale} dict={dict} />;
}
