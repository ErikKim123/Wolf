// 행사패스관리 — products 테이블 중 product_type='ticket' 만 분리 관리.
// 상품관리(products.ts)와 같은 테이블/전이를 공유하되 고정 필터로 티켓만 노출.
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import type { ResourceConfig } from '@/lib/resource/types';
import { StatusBadge } from '@/components/form/StatusBadge';
import { pickI18n, formatPrice, type I18n, type Prices } from '@wolf/shared';
import type { ProductRow } from './products';

const STATUS_OPTS = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '승인대기' },
  { value: 'active', label: '판매중' },
  { value: 'soldout', label: '품절' },
];

const columns: ColumnDef<ProductRow, unknown>[] = [
  { accessorKey: 'name_i18n', header: '행사패스명', cell: (c) => pickI18n(c.getValue() as I18n, 'ko') || pickI18n(c.getValue() as I18n, 'en') },
  { accessorKey: 'is_partner_product', header: '판매자', cell: (c) => (c.getValue() ? '파트너' : '자사') },
  { accessorKey: 'prices', header: '가격(USD)', cell: (c) => formatPrice(c.getValue() as Prices, 'USD') || '—' },
  { accessorKey: 'status', header: '상태', cell: (c) => StatusBadge({ status: String(c.getValue()) }) },
];

export const eventPassesConfig: ResourceConfig<ProductRow> = {
  key: 'event-passes',
  table: 'products',
  title: '행사패스관리',
  canCreate: true,
  // 티켓(행사패스)만 노출 + 신규 생성 시 product_type 고정
  // seller_id 는 화면에서 현재 파트너 id 로 주입 (RLS with check: seller_id = auth.uid()).
  baseFilter: { column: 'product_type', op: 'eq', value: 'ticket' },
  createDefaults: { product_type: 'ticket', status: 'draft', is_partner_product: true },
  // 수정 시 이벤트 콘텐츠 프리로드를 위해 event_content 포함 (detail_html_i18n 은 성능상 제외 — 마법사 콘텐츠 단계서 지연 로드)
  selectColumns: 'id, code, seller_id, is_partner_product, product_type, category_id, name_i18n, prices, image_url, status, event_content',
  defaultSort: { column: 'created_at', asc: false },
  listColumns: columns,
  filters: [
    { name: 'q', label: '코드 검색', kind: 'search', searchColumns: ['code'] },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS },
  ],
  // 입력은 EventPassWizard(단계형)가 담당 — 평면 formFields 미사용.
  formFields: [],
  // 가격 정수≥0, 상태 enum (product_type 은 고정값이라 검증 불필요)
  schema: z
    .object({
      status: z.enum(['draft', 'pending', 'active', 'soldout']).optional(),
      prices: z
        .record(z.enum(['USD', 'KRW']), z.number().int('정수').nonnegative('0 이상'))
        .optional(),
    })
    .passthrough(),
};
