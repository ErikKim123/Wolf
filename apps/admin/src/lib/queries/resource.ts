// Design Ref: §4.1 — react-query 데이터 훅 (anon 클라이언트 + RLS). 컴포넌트서 직접 supabase 호출 금지.
'use client';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ResourceConfig } from '@/lib/resource/types';

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  searchColumns?: string[];
  filters?: Record<string, string>; // 컬럼 eq 필터
}

export function useResourceList<T>(config: ResourceConfig<T>, params: ListParams) {
  return useQuery({
    queryKey: [config.key, 'list', params],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from(config.table)
        .select(config.selectColumns ?? '*', { count: 'exact' });

      // eq 필터
      for (const [col, val] of Object.entries(params.filters ?? {})) {
        if (val) q = q.eq(col, val);
      }
      // ilike 검색 (or 결합)
      if (params.search && params.searchColumns?.length) {
        const or = params.searchColumns
          .map((c) => `${c}.ilike.%${params.search}%`)
          .join(',');
        q = q.or(or);
      }
      if (config.defaultSort) {
        q = q.order(config.defaultSort.column, { ascending: config.defaultSort.asc });
      }
      const from = (params.page - 1) * params.pageSize;
      q = q.range(from, from + params.pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as T[], total: count ?? 0 };
    },
  });
}

export function useResourceDetail<T>(config: ResourceConfig<T>, id: string | null) {
  return useQuery({
    queryKey: [config.key, 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as T;
    },
  });
}

export function useResourceUpsert<T extends { id?: string }>(config: ResourceConfig<T>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<T>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(config.table)
        .upsert(values as never)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.key] });
    },
  });
}

/** 상태 전이 전용 (partners/products). 허용 전이는 UI에서 가드. */
export function useStatusTransition(table: string, queryKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });
}
