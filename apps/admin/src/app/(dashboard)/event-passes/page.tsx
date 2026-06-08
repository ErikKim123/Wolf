// 행사패스관리 — 목록 + 생성/수정(카테고리 select + 이벤트 콘텐츠) + 승인 전이
// products 와 같은 테이블/전이를 공유하되 queryKey 'event-passes' 로 캐시 분리.
'use client';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import {
  useStatusTransition,
  useResourceDelete,
  useResourceDuplicate,
} from '@/lib/queries/resource';
import { useCategoryOptions } from '@/lib/queries/options';
import { PRODUCT_TRANSITIONS, type ProductRow } from '@/lib/resource/configs/products';
import { eventPassesConfig } from '@/lib/resource/configs/event-passes';
import type { FieldDef } from '@/lib/resource/types';
import { AiProductGenerator } from '@/components/product/AiProductGenerator';
import { EventEditor } from '@/components/product/EventEditor';
import { ProductImageField } from '@/components/product/ProductImageField';
import { pickI18n, type EventContent, type I18n } from '@wolf/shared';

const QKEY = 'event-passes';

function EventPassActions({ row }: { row: ProductRow }) {
  const transition = useStatusTransition('products', QKEY);
  const del = useResourceDelete('products', QKEY);
  const dup = useResourceDuplicate('products', QKEY);
  const allowed = PRODUCT_TRANSITIONS[row.status] ?? [];
  const busy = transition.isPending || del.isPending || dup.isPending;
  const name = pickI18n(row.name_i18n, 'ko') || pickI18n(row.name_i18n, 'en') || row.code || '행사패스';

  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {allowed.map((t) => (
        <button key={t.to} className="btn btn-secondary btn-sm" disabled={busy}
          onClick={() => transition.mutate({ id: row.id, status: t.to })}>
          {t.label}
        </button>
      ))}
      <button className="btn btn-secondary btn-sm" disabled={busy}
        title="이 행사패스를 초안으로 복제" onClick={() => dup.mutate(row.id)}>
        복사
      </button>
      <button className="btn btn-secondary btn-sm text-danger" disabled={busy}
        onClick={() => {
          if (window.confirm(`'${name}' 행사패스를 삭제하시겠어요? 되돌릴 수 없습니다.`)) del.mutate(row.id);
        }}>
        삭제
      </button>
    </div>
  );
}

export default function EventPassesPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);
  const { data: categoryOptions = [] } = useCategoryOptions();

  const actionCol: ColumnDef<ProductRow, unknown> = {
    id: 'actions',
    header: '승인/상태',
    cell: (c) => <EventPassActions row={c.row.original} />,
  };
  const config = { ...eventPassesConfig, listColumns: [...eventPassesConfig.listColumns, actionCol] };

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
    if (field.name === 'image_url') {
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}</label>
          <ProductImageField
            value={value as string | undefined}
            set={set as (v: string | null) => void}
            allValues={allValues}
          />
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
      <FormDrawer open={open} title={editing ? '행사패스 수정' : '행사패스 등록'} onClose={() => setEditing(undefined)}>
        <ResourceFormPage
          config={eventPassesConfig as never}
          initial={editing ?? null}
          onDone={() => setEditing(undefined)}
          renderCustom={renderCustom as never}
        />
      </FormDrawer>
    </>
  );
}
