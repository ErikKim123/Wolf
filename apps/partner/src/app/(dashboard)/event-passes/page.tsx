// 행사패스관리 (파트너) — 내 티켓 상품만(seller_id 범위) + 단계형(마법사) 등록/수정.
// products 와 같은 테이블/전이를 공유하되 queryKey 'event-passes' 로 캐시 분리.
'use client';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import {
  useStatusTransition,
  useResourceDelete,
  useResourceDuplicate,
} from '@/lib/queries/resource';
import { PARTNER_PRODUCT_TRANSITIONS, type ProductRow } from '@/lib/resource/configs/products';
import { eventPassesConfig } from '@/lib/resource/configs/event-passes';
import { EventPassWizard } from '@/components/event-pass/EventPassWizard';
import { usePartner } from '@/lib/partner/context';
import { pickI18n } from '@wolf/shared';

const QKEY = 'event-passes';

function EventPassActions({ row }: { row: ProductRow }) {
  const transition = useStatusTransition('products', QKEY);
  const del = useResourceDelete('products', QKEY);
  const dup = useResourceDuplicate('products', QKEY);
  const allowed = PARTNER_PRODUCT_TRANSITIONS[row.status] ?? [];
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
  const { userId } = usePartner();
  // undefined = 닫힘, null = 신규, object = 수정
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);

  const actionCol: ColumnDef<ProductRow, unknown> = {
    id: 'actions',
    header: '상태',
    cell: (c) => <EventPassActions row={c.row.original} />,
  };

  const listConfig = useMemo(
    () => ({ ...eventPassesConfig, listColumns: [...eventPassesConfig.listColumns, actionCol] }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const open = editing !== undefined;
  return (
    <>
      <ResourceListPage
        config={listConfig as never}
        scope={{ seller_id: userId }}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setEditing(null)}
      />
      <FormDrawer open={open} size="wide" title={editing ? '행사패스 수정' : '행사패스 등록'} onClose={() => setEditing(undefined)}>
        {open && (
          <EventPassWizard
            initial={editing ?? null}
            sellerId={userId}
            onDone={() => setEditing(undefined)}
            onCancel={() => setEditing(undefined)}
          />
        )}
      </FormDrawer>
    </>
  );
}
