// 상품관리 (파트너) — 내 상품만(seller_id 범위) + 생성/수정(카테고리 select + AI 상세) + 승인요청 전이
'use client';
import { useMemo, useState } from 'react';
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
import {
  productsConfig,
  PARTNER_PRODUCT_TRANSITIONS,
  type ProductRow,
} from '@/lib/resource/configs/products';
import type { FieldDef } from '@/lib/resource/types';
import { AiProductGenerator } from '@/components/product/AiProductGenerator';
import { ProductImageField } from '@/components/product/ProductImageField';
import { usePartner } from '@/lib/partner/context';
import { pickI18n, type I18n } from '@wolf/shared';

function ProductActions({ row }: { row: ProductRow }) {
  const transition = useStatusTransition('products', 'products');
  const del = useResourceDelete('products', 'products');
  const dup = useResourceDuplicate('products', 'products');
  const allowed = PARTNER_PRODUCT_TRANSITIONS[row.status] ?? [];
  const busy = transition.isPending || del.isPending || dup.isPending;
  const name = pickI18n(row.name_i18n, 'ko') || pickI18n(row.name_i18n, 'en') || row.code || '상품';

  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {allowed.map((t) => (
        <button key={t.to} className="btn btn-secondary btn-sm" disabled={busy}
          onClick={() => transition.mutate({ id: row.id, status: t.to })}>
          {t.label}
        </button>
      ))}
      <button className="btn btn-secondary btn-sm" disabled={busy}
        title="이 상품을 초안으로 복제" onClick={() => dup.mutate(row.id)}>
        복사
      </button>
      <button className="btn btn-secondary btn-sm text-danger" disabled={busy}
        onClick={() => {
          if (window.confirm(`'${name}' 상품을 삭제하시겠어요? 되돌릴 수 없습니다.`)) del.mutate(row.id);
        }}>
        삭제
      </button>
    </div>
  );
}

export default function ProductsPage() {
  const { userId } = usePartner();
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);
  const { data: categoryOptions = [] } = useCategoryOptions();

  const actionCol: ColumnDef<ProductRow, unknown> = {
    id: 'actions',
    header: '상태',
    cell: (c) => <ProductActions row={c.row.original} />,
  };

  // 신규 생성 시 seller_id 를 현재 파트너로 주입 (RLS with check 통과 + 정산 귀속).
  const config = useMemo(
    () => ({
      ...productsConfig,
      createDefaults: { ...productsConfig.createDefaults, seller_id: userId },
    }),
    [userId],
  );
  const listConfig = useMemo(
    () => ({ ...config, listColumns: [...config.listColumns, actionCol] }),
    [config], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // custom 필드 렌더: 카테고리 select + 대표 이미지 + AI 상세 생성
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
    return null;
  }

  const open = editing !== undefined;
  return (
    <>
      <ResourceListPage
        config={listConfig as never}
        scope={{ seller_id: userId }}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setEditing(null)}
      />
      <FormDrawer open={open} title={editing ? '상품 수정' : '상품 등록'} onClose={() => setEditing(undefined)}>
        <ResourceFormPage
          config={config as never}
          initial={editing ?? null}
          onDone={() => setEditing(undefined)}
          renderCustom={renderCustom as never}
        />
      </FormDrawer>
    </>
  );
}
