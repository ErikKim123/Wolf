// Design Ref: §5 — 상품 탐색 (목록/카테고리/타입 필터). 상세 HTML 제외하고 가볍게.
import { createClient } from '@/lib/supabase/server';
import type { HomeProduct } from '@/lib/queries/home';
import type { I18n } from '@wolf/shared';

export interface ListOptions {
  categoryId?: string;
  productType?: string;
  search?: string;
  limit?: number;
}

/** 판매중(active) 상품 목록 — 카테고리/타입/검색어 필터 */
export async function listProducts(opts: ListOptions = {}): Promise<HomeProduct[]> {
  let q = createClient()
    .from('products')
    .select('id, code, product_type, is_partner_product, category_id, name_i18n, prices, status')
    .eq('status', 'active');
  if (opts.categoryId) q = q.eq('category_id', opts.categoryId);
  if (opts.productType) q = q.eq('product_type', opts.productType);
  if (opts.search) {
    // 코드 + 상품명(en/ko) 부분일치. ilike 특수문자(%,) 는 안전하게 제거.
    const term = opts.search.replace(/[%,()]/g, '').trim();
    if (term) {
      q = q.or(
        `code.ilike.%${term}%,name_i18n->>en.ilike.%${term}%,name_i18n->>ko.ilike.%${term}%`,
      );
    }
  }
  q = q.order('created_at', { ascending: false }).limit(opts.limit ?? 40);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HomeProduct[];
}

export interface CategoryInfo {
  id: string;
  code: string | null;
  name_i18n: I18n;
}

export async function getCategory(id: string): Promise<CategoryInfo | null> {
  const { data, error } = await createClient()
    .from('categories')
    .select('id, code, name_i18n')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as CategoryInfo | null) ?? null;
}
