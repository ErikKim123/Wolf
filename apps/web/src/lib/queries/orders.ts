// Design Ref: §5 Phase 4 — 내 주문내역 (RLS: buyer 본인만). orders + order_items + 상품명 join.
import { createClient } from '@/lib/supabase/server';
import type { I18n } from '@wolf/shared';

export interface MyOrderItem {
  id: string;
  qty: number;
  line_amount: number;
  currency: string;
  products: { name_i18n: I18n } | null;
}

export interface MyShipment {
  status: string;
  region: string;
  carrier: string | null;
  tracking_no: string | null;
  eta: string | null;
}

export interface MyOrder {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  order_items: MyOrderItem[];
  shipments: MyShipment[];
}

/** 로그인 사용자의 주문 — RLS(orders_buyer_own) 로 본인 것만 반환 */
export async function getMyOrders(): Promise<MyOrder[]> {
  const { data, error } = await createClient()
    .from('orders')
    .select(
      'id, order_no, status, total_amount, currency, created_at, order_items(id, qty, line_amount, currency, products(name_i18n)), shipments(status, region, carrier, tracking_no, eta)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyOrder[];
}
