// Design Ref: §5.4 주문관리 — orders 조회 + 상태 전이(결제/발송/완료/취소/환불). 생성은 고객 결제 경유.
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import type { ResourceConfig } from '@/lib/resource/types';
import { StatusBadge } from '@/components/form/StatusBadge';

export interface OrderRow {
  id: string;
  order_no: string;
  buyer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  created_at: string;
}

const STATUS_OPTS = [
  { value: 'pending', label: '결제대기' },
  { value: 'paid', label: '결제완료' },
  { value: 'shipped', label: '발송' },
  { value: 'done', label: '완료' },
  { value: 'cancelled', label: '취소' },
  { value: 'refunded', label: '환불' },
];
const PAY_OPTS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'portone', label: 'PortOne' },
];

// Design Ref: §3.2 주문 상태 전이 (orders.status)
export const ORDER_TRANSITIONS: Record<string, { to: string; label: string }[]> = {
  pending: [{ to: 'paid', label: '결제확인' }, { to: 'cancelled', label: '취소' }],
  paid: [{ to: 'shipped', label: '발송' }, { to: 'refunded', label: '환불' }],
  shipped: [{ to: 'done', label: '완료' }],
  done: [],
  cancelled: [],
  refunded: [],
};

export function formatAmount(amount: number, currency: string): string {
  return `${currency} ${Number(amount ?? 0).toLocaleString()}`;
}

const columns: ColumnDef<OrderRow, unknown>[] = [
  { accessorKey: 'order_no', header: '주문번호' },
  { accessorKey: 'status', header: '상태', cell: (c) => StatusBadge({ status: STATUS_OPTS.find((o) => o.value === c.getValue())?.label ?? String(c.getValue()) }) },
  { accessorKey: 'total_amount', header: '금액', cell: (c) => formatAmount(c.getValue() as number, c.row.original.currency) },
  { accessorKey: 'payment_method', header: '결제수단', cell: (c) => PAY_OPTS.find((o) => o.value === c.getValue())?.label ?? '—' },
  { accessorKey: 'created_at', header: '주문일', cell: (c) => String(c.getValue() ?? '').slice(0, 10) },
];

export const ordersConfig: ResourceConfig<OrderRow> = {
  key: 'orders',
  table: 'orders',
  title: '주문관리',
  canCreate: false, // 주문 생성은 고객 결제 플로우(Phase 4) — 어드민은 조회/상태 전이
  selectColumns: 'id, order_no, buyer_id, status, total_amount, currency, payment_method, created_at',
  defaultSort: { column: 'created_at', asc: false },
  listColumns: columns,
  filters: [
    { name: 'q', label: '주문번호 검색', kind: 'search', searchColumns: ['order_no'] },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS },
    { name: 'payment_method', label: '결제수단', kind: 'select', options: PAY_OPTS },
  ],
  formFields: [
    { name: 'order_no', label: '주문번호', kind: 'text', readOnly: true },
    { name: 'total_amount', label: '금액', kind: 'number', readOnly: true },
    { name: 'currency', label: '통화', kind: 'text', readOnly: true },
    { name: 'payment_method', label: '결제수단', kind: 'select', options: PAY_OPTS, readOnly: true },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS, required: true },
  ],
  schema: z
    .object({
      status: z.enum(['pending', 'paid', 'shipped', 'done', 'cancelled', 'refunded']).optional(),
    })
    .passthrough(),
};
