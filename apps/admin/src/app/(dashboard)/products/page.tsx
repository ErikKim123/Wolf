// Design Ref: §5.4 상품관리 — 목록 + 생성/수정(커스텀 카테고리 select) + 승인 전이
'use client';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { useStatusTransition } from '@/lib/queries/resource';
import { useCategoryOptions } from '@/lib/queries/options';
import {
  productsConfig,
  PRODUCT_TRANSITIONS,
  type ProductRow,
} from '@/lib/resource/configs/products';
import type { FieldDef } from '@/lib/resource/types';
import { AiProductGenerator } from '@/components/product/AiProductGenerator';
import { EventEditor } from '@/components/product/EventEditor';
import type { EventContent, I18n } from '@wolf/shared';

function ProductActions({ row }: { row: ProductRow }) {
  const transition = useStatusTransition('products', 'products');
  const allowed = PRODUCT_TRANSITIONS[row.status] ?? [];
  if (allowed.length === 0) return <span className="text-grey-400">—</span>;
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {allowed.map((t) => (
        <button key={t.to} className="btn btn-secondary btn-sm" disabled={transition.isPending}
          onClick={() => transition.mutate({ id: row.id, status: t.to })}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);
  const { data: categoryOptions = [] } = useCategoryOptions();

  const actionCol: ColumnDef<ProductRow, unknown> = {
    id: 'actions',
    header: '승인/상태',
    cell: (c) => <ProductActions row={c.row.original} />,
  };
  const config = { ...productsConfig, listColumns: [...productsConfig.listColumns, actionCol] };

  // custom 필드 렌더 (Design §3.1 custom 슬롯): 카테고리 select + AI 상세 생성
  function renderCustom(
    field: FieldDef,
    value: unknown,
    set: (v: unknown) => void,
    allValues: Record<string, unknown>,
  ) {
    if (field.name === 'category_id') {
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}</label>
          <select className="input" value={(value as string) ?? ''} onChange={(e) => set(e.target.value || null)}>
            <option value="">선택</option>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    }
    if (field.name === 'detail_html_i18n') {
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}</label>
          <AiProductGenerator
            value={value as I18n | undefined}
            set={set as (v: I18n) => void}
            allValues={allValues}
          />
        </div>
      );
    }
    if (field.name === 'event_content') {
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}</label>
          <EventEditor
            value={value as EventContent | undefined}
            set={set as (v: EventContent) => void}
            allValues={allValues}
          />
        </div>
      );
    }
    return null;
  }

  const open = editing !== undefined;
  return (
    <>
      <ResourceListPage
        config={config as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setEditing(null)}
      />
      <FormDrawer open={open} title={editing ? '상품 수정' : '상품 등록'} onClose={() => setEditing(undefined)}>
        <ResourceFormPage
          config={productsConfig as never}
          initial={editing ?? null}
          onDone={() => setEditing(undefined)}
          renderCustom={renderCustom as never}
        />
      </FormDrawer>
    </>
  );
}
