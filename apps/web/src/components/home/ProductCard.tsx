// Design Ref: Design_System/components-product-cards — 상품 카드 (이미지 placeholder + 명/가/배지)
import Link from 'next/link';
import { Package } from 'lucide-react';
import { pickI18n, formatPrice, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import type { HomeProduct } from '@/lib/queries/home';
import type { Dictionary } from '@/i18n/dictionaries';

export function ProductCard({
  product,
  locale,
  dict,
}: {
  product: HomeProduct;
  locale: Locale;
  dict: Dictionary;
}) {
  const name = pickI18n(product.name_i18n, locale);
  const price = formatPrice(product.prices, currencyForLocale(locale), intlLocale(locale));
  const badge = product.is_partner_product ? dict.product.partner : dict.product.official;

  return (
    <Link href={`/${locale}/products/${product.id}`} className="product-card">
      <div className="flex aspect-square items-center justify-center bg-grey-100">
        <Package size={40} className="text-grey-300" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="label-caps text-grey-400">{badge}</span>
        <p className="line-clamp-2 text-sm font-medium text-black">{name || '—'}</p>
        <p className="mt-auto pt-1 font-display text-lg">{price || '—'}</p>
      </div>
    </Link>
  );
}
