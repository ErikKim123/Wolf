// Design Ref: §5 — 카테고리별 상품 목록 (CategoryStrip 링크 대상)
import { notFound } from 'next/navigation';
import { pickI18n, type Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { listProducts, getCategory } from '@/lib/queries/products';
import { ProductGrid } from '@/components/product/ProductGrid';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const locale = params.locale as Locale;
  const [dict, category] = await Promise.all([getDictionary(locale), getCategory(params.id)]);
  if (!category) notFound();

  const products = await listProducts({ categoryId: category.id });

  return (
    <div className="container-wolf py-8">
      <h1 className="section-title mb-6">
        {pickI18n(category.name_i18n, locale) || category.code || dict.home.categories}
      </h1>
      <ProductGrid products={products} locale={locale} dict={dict} />
    </div>
  );
}
