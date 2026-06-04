// Design Ref: §5.4 카테고리관리 — 대/중 트리 + 생성/수정(parent select 커스텀)
'use client';
import { useState } from 'react';
import { Plus, FolderTree } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { StatusBadge } from '@/components/form/StatusBadge';
import { pickI18n, type I18n } from '@wolf/shared';
import type { FieldDef, ResourceConfig } from '@/lib/resource/types';

interface CatRow {
  id: string;
  code: string | null;
  parent_id: string | null;
  name_i18n: I18n;
  sort_order: number;
  is_visible: boolean;
}

const categoriesConfig: ResourceConfig<CatRow> = {
  key: 'categories',
  table: 'categories',
  title: '카테고리관리',
  listColumns: [],
  filters: [],
  formFields: [
    { name: 'code', label: '코드', kind: 'text' },
    { name: 'name_i18n', label: '이름', kind: 'i18n', required: true },
    { name: 'parent_id', label: '상위 분류 (없으면 대분류)', kind: 'custom' },
    { name: 'sort_order', label: '노출순서', kind: 'number' },
    { name: 'is_visible', label: '노출', kind: 'toggle' },
  ],
};

function useCategories() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('categories')
        .select('id, code, parent_id, name_i18n, sort_order, is_visible')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as CatRow[];
    },
  });
}

export default function CategoriesPage() {
  const { data: cats = [], isLoading } = useCategories();
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);

  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);
  const parentOptions = parents.map((p) => ({ value: p.id, label: pickI18n(p.name_i18n, 'ko') || pickI18n(p.name_i18n, 'en') }));

  function renderCustom(field: FieldDef, value: unknown, set: (v: unknown) => void) {
    if (field.name === 'parent_id') {
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}</label>
          <select className="input" value={(value as string) ?? ''} onChange={(e) => set(e.target.value || null)}>
            <option value="">— 대분류 —</option>
            {parentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    return null;
  }

  function Row({ c, depth }: { c: CatRow; depth: number }) {
    return (
      <button
        onClick={() => setEditing(c as unknown as Record<string, unknown>)}
        className="flex w-full items-center gap-2 border-b border-grey-100 px-3 py-2.5 text-left text-sm hover:bg-grey-50"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {depth === 0 && <FolderTree size={16} className="text-grey-400" />}
        <span className="font-medium">{pickI18n(c.name_i18n, 'ko') || pickI18n(c.name_i18n, 'en')}</span>
        <span className="text-xs text-grey-400">{c.code}</span>
        {!c.is_visible && <span className="ml-auto"><StatusBadge status="숨김" /></span>}
      </button>
    );
  }

  const open = editing !== undefined;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl uppercase tracking-tight">카테고리관리</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>
          <Plus size={16} /> 추가
        </button>
      </div>

      <div className="rounded-lg border border-grey-200">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-grey-500">불러오는 중…</p>
        ) : parents.length === 0 ? (
          <p className="px-4 py-10 text-center text-grey-500">카테고리 없음.</p>
        ) : (
          parents.map((p) => (
            <div key={p.id}>
              <Row c={p} depth={0} />
              {childrenOf(p.id).map((ch) => <Row key={ch.id} c={ch} depth={1} />)}
            </div>
          ))
        )}
      </div>

      <FormDrawer open={open} title={editing ? '카테고리 수정' : '카테고리 추가'} onClose={() => setEditing(undefined)}>
        <ResourceFormPage
          config={categoriesConfig as never}
          initial={editing ?? null}
          onDone={() => setEditing(undefined)}
          renderCustom={renderCustom as never}
        />
      </FormDrawer>
    </div>
  );
}
