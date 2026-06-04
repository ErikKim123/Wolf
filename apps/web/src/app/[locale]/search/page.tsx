// Design Ref: §5 — 상품 검색 결과 (이름/코드 부분일치)
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { listProducts } from '@/lib/queries/products';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SearchBar } from '@/components/product/SearchBar';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { q?: string };
}) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const q = (searchParams.q ?? '').trim();
  const products = q ? await listProducts({ search: q }) : [];

  return (
    <div className="container-wolf py-8">
      <h1 className="section-title mb-4">{dict.search.title}</h1>

      <div className="mb-6 max-w-md">
        <SearchBar locale={locale} placeholder={dict.search.placeholder} initial={q} />
      </div>

      {q && (
        <p className="mb-5 text-sm text-grey-500">
          {dict.search.resultsFor} &ldquo;{q}&rdquo; · {products.length}
        </p>
      )}

      {q ? (
        products.length > 0 ? (
          <ProductGrid products={products} locale={locale} dict={dict} />
        ) : (
          <p className="py-16 text-center text-grey-400">{dict.search.empty}</p>
        )
      ) : null}
    </div>
  );
}
