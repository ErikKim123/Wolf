// Design Ref: §5 Phase 3 — 상품 상세 조회 (detail_html_i18n 포함, 상세 진입 시에만)
import { createClient } from '@/lib/supabase/server';
import type { I18n, Prices } from '@wolf/shared';

export interface ProductDetail {
  id: string;
  code: string | null;
  seller_id: string;
  product_type: string;
  is_partner_product: boolean;
  category_id: string | null;
  name_i18n: I18n;
  prices: Prices;
  attributes: Record<string, unknown> | null;
  detail_html_i18n: I18n;
  status: string;
}

/** 상품 단건 — 목록과 달리 detail_html_i18n 까지 포함 */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  const { data, error } = await createClient()
    .from('products')
    .select(
      'id, code, seller_id, product_type, is_partner_product, category_id, name_i18n, prices, attributes, detail_html_i18n, status',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProductDetail | null) ?? null;
}
