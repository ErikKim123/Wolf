// Design Ref: §5.4 주문관리 — 목록 + 상태 전이(결제/발송/완료/취소/환불) + 상세 드로어(읽기)
'use client';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { useStatusTransition } from '@/lib/queries/resource';
import { ordersConfig, ORDER_TRANSITIONS, type OrderRow } from '@/lib/resource/configs/orders';

function OrderActions({ row }: { row: OrderRow }) {
  const transition = useStatusTransition('orders', 'orders');
  const allowed = ORDER_TRANSITIONS[row.status] ?? [];
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

export default function OrdersPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const actionCol: ColumnDef<OrderRow, unknown> = {
    id: 'actions',
    header: '처리',
    cell: (c) => <OrderActions row={c.row.original} />,
  };
  const config = { ...ordersConfig, listColumns: [...ordersConfig.listColumns, actionCol] };

  return (
    <>
      <ResourceListPage
        config={config as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
      />
      <FormDrawer open={!!editing} title="주문 상세" onClose={() => setEditing(null)}>
        <ResourceFormPage
          config={ordersConfig as never}
          initial={editing}
          onDone={() => setEditing(null)}
        />
      </FormDrawer>
    </>
  );
}
