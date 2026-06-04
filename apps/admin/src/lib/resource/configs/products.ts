// Design Ref: §5.4 상품관리 — products, prices/i18n/attributes + 승인. detail_html 목록 제외.
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import type { ResourceConfig } from '@/lib/resource/types';
import { StatusBadge } from '@/components/form/StatusBadge';
import { pickI18n, formatPrice, type I18n, type Prices } from '@wolf/shared';

export interface ProductRow {
  id: string;
  code: string | null;
  seller_id: string;
  is_partner_product: boolean;
  product_type: string;
  category_id: string | null;
  name_i18n: I18n;
  prices: Prices;
  status: string;
}

const TYPE_OPTS = [
  { value: 'physical', label: '실물' },
  { value: 'ticket', label: '티켓' },
  { value: 'subscription', label: '구독' },
];
const STATUS_OPTS = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '승인대기' },
  { value: 'active', label: '판매중' },
  { value: 'soldout', label: '품절' },
];

// Design Ref: §3.2 상품 상태 전이
export const PRODUCT_TRANSITIONS: Record<string, { to: string; label: string }[]> = {
  draft: [{ to: 'pending', label: '승인요청' }],
  pending: [{ to: 'active', label: '승인' }, { to: 'draft', label: '반려' }],
  active: [{ to: 'soldout', label: '품절' }],
  soldout: [{ to: 'active', label: '재개' }],
};

const columns: ColumnDef<ProductRow, unknown>[] = [
  { accessorKey: 'name_i18n', header: '상품명', cell: (c) => pickI18n(c.getValue() as I18n, 'ko') || pickI18n(c.getValue() as I18n, 'en') },
  { accessorKey: 'product_type', header: '타입', cell: (c) => TYPE_OPTS.find((o) => o.value === c.getValue())?.label ?? String(c.getValue()) },
  { accessorKey: 'is_partner_product', header: '판매자', cell: (c) => (c.getValue() ? '파트너' : '자사') },
  { accessorKey: 'prices', header: '가격(USD)', cell: (c) => formatPrice(c.getValue() as Prices, 'USD') || '—' },
  { accessorKey: 'status', header: '상태', cell: (c) => StatusBadge({ status: String(c.getValue()) }) },
];

// category 옵션은 화면에서 useCategoryOptions 로 주입 (custom 슬롯)
export const productsConfig: ResourceConfig<ProductRow> = {
  key: 'products',
  table: 'products',
  title: '상품관리',
  canCreate: true,
  // Plan FR-10: 목록 select 에서 detail_html_i18n 제외 (성능)
  selectColumns: 'id, code, seller_id, is_partner_product, product_type, category_id, name_i18n, prices, status',
  defaultSort: { column: 'created_at', asc: false },
  listColumns: columns,
  filters: [
    { name: 'q', label: '코드 검색', kind: 'search', searchColumns: ['code'] },
    { name: 'product_type', label: '타입', kind: 'select', options: TYPE_OPTS },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS },
  ],
  formFields: [
    { name: 'code', label: '상품코드', kind: 'text' },
    { name: 'name_i18n', label: '상품명', kind: 'i18n', required: true },
    { name: 'product_type', label: '타입', kind: 'select', options: TYPE_OPTS, required: true },
    { name: 'category_id', label: '카테고리', kind: 'custom' }, // useCategoryOptions 주입
    { name: 'prices', label: '가격', kind: 'prices' },
    { name: 'attributes', label: '속성(JSON)', kind: 'json', placeholder: '{"size":["S","M"]}' },
    { name: 'detail_html_i18n', label: '상세 HTML (AI 생성)', kind: 'custom' }, // AiProductGenerator
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS, required: true },
  ],
  // G2: 보안 검증 (Design §7) — 가격 정수≥0, 상태/타입 enum
  schema: z
    .object({
      product_type: z.enum(['physical', 'ticket', 'subscription']).optional(),
      status: z.enum(['draft', 'pending', 'active', 'soldout']).optional(),
      prices: z
        .record(z.enum(['USD', 'KRW']), z.number().int('정수').nonnegative('0 이상'))
        .optional(),
    })
    .passthrough(),
};
