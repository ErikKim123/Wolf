// Design Ref: §5 Phase 3 — 상품 상세 (기본정보 + 옵션 + sanitize 된 상세 HTML)
import { Package } from 'lucide-react';
import { pickI18n, formatPrice, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { sanitizeHtml } from '@/lib/sanitize';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import type { ProductDetail as Product } from '@/lib/queries/product';
import type { Dictionary } from '@/i18n/dictionaries';

export function ProductDetail({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  const name = pickI18n(product.name_i18n, locale);
  const price = formatPrice(product.prices, currencyForLocale(locale), intlLocale(locale));
  const typeLabel =
    (dict.product.types as Record<string, string>)[product.product_type] ?? product.product_type;
  const badge = product.is_partner_product ? dict.product.partner : dict.product.official;
  const detailHtml = sanitizeHtml(pickI18n(product.detail_html_i18n, locale));
  const attrs = Object.entries(product.attributes ?? {});

  return (
    <article className="container-wolf py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-2">
        {/* 비주얼 (이미지 placeholder) */}
        <div className="flex aspect-square items-center justify-center rounded-xl bg-grey-100">
          <Package size={72} className="text-grey-300" aria-hidden />
        </div>

        {/* 기본정보 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="label-caps text-grey-400">{badge}</span>
            <span className="rounded-pill bg-grey-100 px-3 py-1 text-xs font-medium text-grey-600">
              {typeLabel}
            </span>
            {product.status === 'soldout' && (
              <span className="rounded-pill bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                {dict.product.soldout}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl uppercase leading-tight tracking-tight md:text-4xl">
            {name || '—'}
          </h1>
          <p className="font-display text-2xl">{price || '—'}</p>

          {attrs.length > 0 && (
            <dl className="mt-2 divide-y divide-grey-100 border-y border-grey-100">
              {attrs.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="label-caps text-grey-500">{k}</dt>
                  <dd className="text-right text-grey-800">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <AddToCartButton
            item={{
              id: product.id,
              name_i18n: product.name_i18n,
              prices: product.prices,
              seller_id: product.seller_id,
              is_partner_product: product.is_partner_product,
              product_type: product.product_type,
            }}
            label={product.status === 'soldout' ? dict.product.soldout : dict.product.addToCart}
            addedLabel={dict.product.added}
            disabled={product.status === 'soldout'}
          />
        </div>
      </div>

      {/* 상세 HTML */}
      <section className="container-wolf mt-12 max-w-3xl px-0">
        {detailHtml ? (
          <div
            className="prose-wolf text-grey-800 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:uppercase [&_img]:my-4 [&_img]:rounded-lg [&_p]:my-3 [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: detailHtml }}
          />
        ) : (
          <p className="py-10 text-center text-grey-400">{dict.home.empty}</p>
        )}
      </section>
    </article>
  );
}
