// Design Ref: §5.4 — 상품/카테고리 폼의 select 옵션 (카테고리 목록)
// 주: Supabase 는 snake_case 컬럼 반환 → raw row 는 snake_case 로 다룬다.
'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { pickI18n, type I18n } from '@wolf/shared';

interface CategoryRow {
  id: string;
  name_i18n: I18n;
  parent_id: string | null;
}

/** 카테고리 select 옵션 (parent select / 상품 category 공용) */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ['categories', 'options'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('id, name_i18n, parent_id')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as CategoryRow[]).map((c) => ({
        value: c.id,
        label: (c.parent_id ? '— ' : '') + (pickI18n(c.name_i18n, 'ko') || pickI18n(c.name_i18n, 'en')),
      }));
    },
  });
}
