// Design Ref: §5 Phase 3 — 상품 상세 라우트 (/[locale]/products/[id])
import { notFound } from 'next/navigation';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { getProduct } from '@/lib/queries/product';
import { ProductDetail } from '@/components/product/ProductDetail';
import { EventDetail } from '@/components/product/EventDetail';

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

  // 티켓 + 이벤트 콘텐츠가 있으면 이벤트 페이지 템플릿으로 렌더
  if (product.product_type === 'ticket' && product.event_content) {
    return <EventDetail product={product} locale={locale} dict={dict} />;
  }

  return <ProductDetail product={product} locale={locale} dict={dict} />;
}
