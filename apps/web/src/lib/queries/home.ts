// Design Ref: §5 Phase 2 — 메인페이지 데이터 (서버 컴포넌트 SSR 조회, anon+RLS)
import { createClient } from '@/lib/supabase/server';
import type { I18n, Prices } from '@wolf/shared';

export interface MainSection {
  id: string;
  section_type: 'hero' | 'slider' | 'featured' | 'category_strip' | string;
  config: Record<string, unknown>;
  sort_order: number;
}

export interface Banner {
  id: string;
  position: string | null;
  title_i18n: I18n;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
}

export interface HomeProduct {
  id: string;
  code: string | null;
  product_type: string;
  is_partner_product: boolean;
  category_id: string | null;
  name_i18n: I18n;
  prices: Prices;
  status: string;
}

export interface HomeCategory {
  id: string;
  code: string | null;
  name_i18n: I18n;
  sort_order: number;
}

/** 메인 섹션 — 활성만 sort 순서대로 */
export async function getMainSections(): Promise<MainSection[]> {
  const { data, error } = await createClient()
    .from('main_sections')
    .select('id, section_type, config, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MainSection[];
}

/** 노출 배너 — is_active + 노출 기간(오늘 포함) 만 */
export async function getActiveBanners(): Promise<Banner[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await createClient()
    .from('banners')
    .select('id, position, title_i18n, image_url, link_url, sort_order')
    .eq('is_active', true)
    .or(`start_at.is.null,start_at.lte.${today}`)
    .or(`end_at.is.null,end_at.gte.${today}`)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Banner[];
}

/** 추천(판매중) 상품 — 상세 HTML 제외하고 가볍게 */
export async function getFeaturedProducts(limit = 8): Promise<HomeProduct[]> {
  const { data, error } = await createClient()
    .from('products')
    .select('id, code, product_type, is_partner_product, category_id, name_i18n, prices, status')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HomeProduct[];
}

/** 노출 카테고리 (대분류 위주, sort 순) */
export async function getVisibleCategories(): Promise<HomeCategory[]> {
  const { data, error } = await createClient()
    .from('categories')
    .select('id, code, name_i18n, sort_order')
    .eq('is_visible', true)
    .is('parent_id', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomeCategory[];
}
