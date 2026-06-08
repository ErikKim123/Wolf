// Design Ref: §5 Phase 4 — 주문 생성(pending) + 결제확정(pending→paid) 멱등 처리
// 확정은 webhook 과 클라이언트 complete 양쪽에서 호출될 수 있으므로 반드시 멱등이어야 한다.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, type Currency } from '@wolf/shared';
import type { Provider } from './config';
import type { Quote } from './pricing';

function makeOrderNo(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const ymd = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const hms = `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ORD-${ymd}-${hms}${rand}`;
}

export interface PendingOrder {
  orderId: string;
  orderNo: string;
  total: number;
  currency: Currency;
  orderName: string;
}

/**
 * 견적을 바탕으로 주문(pending) + 주문항목을 생성. PG 결제 직전에 호출.
 * db: 로그인 사용자 세션 클라이언트. RLS(orders_buyer_own / order_items_buyer_insert)로
 * 본인 주문만 insert 가능 → service role 불필요(금액은 서버 견적값이라 위조 불가).
 */
export async function createPendingOrder(
  db: SupabaseClient,
  quote: Quote,
  buyerId: string,
  provider: Provider,
): Promise<PendingOrder> {
  const orderNo = makeOrderNo(new Date());

  const { data: order, error: oerr } = await db
    .from('orders')
    .insert({
      order_no: orderNo,
      buyer_id: buyerId,
      status: 'pending',
      total_amount: quote.total,
      currency: quote.currency,
      payment_method: provider,
      coupon_code: quote.couponCode,
      discount_amount: quote.discount,
    })
    .select('id')
    .single();
  if (oerr || !order) throw new Error(`order insert failed: ${oerr?.message ?? 'no row'}`);

  const rows = quote.items.map((i) => ({
    order_id: order.id as string,
    product_id: i.productId,
    seller_id: i.sellerId,
    qty: i.qty,
    unit_price: i.unitPrice,
    line_amount: i.lineAmount,
    currency: quote.currency,
  }));
  const { error: ierr } = await db.from('order_items').insert(rows);
  if (ierr) throw new Error(`order_items insert failed: ${ierr.message}`);

  return {
    orderId: order.id as string,
    orderNo,
    total: quote.total,
    currency: quote.currency,
    orderName: quote.orderName,
  };
}

export type FinalizeResult =
  | { ok: true; orderNo: string; already: boolean }
  | { ok: false; reason: 'not_found' | 'bad_status' | 'amount_mismatch' };

interface OrderRow {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  currency: string;
  coupon_code: string | null;
}

/**
 * 결제건을 검증하고 주문을 확정(pending→paid)한다. 멱등:
 * - 이미 paid 면 그대로 성공(already=true)
 * - 금액/통화 불일치면 paid 로 올리지 않고 mismatch 반환(수동 점검 대상)
 * - pending→paid 전환에 실제로 성공한 호출만 쿠폰을 차감(중복 차감 방지)
 */
export async function finalizeOrder(params: {
  orderId: string;
  provider: Provider;
  paymentRef: string;
  paidAmount: number;
  paidCurrency: Currency;
}): Promise<FinalizeResult> {
  const { orderId, provider, paymentRef, paidAmount, paidCurrency } = params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from('orders')
    .select('id, order_no, status, total_amount, currency, coupon_code')
    .eq('id', orderId)
    .maybeSingle();
  const order = row as OrderRow | null;
  if (!order) return { ok: false, reason: 'not_found' };
  if (order.status === 'paid' || order.status === 'shipped' || order.status === 'done') {
    return { ok: true, orderNo: order.order_no, already: true };
  }
  if (order.status !== 'pending') return { ok: false, reason: 'bad_status' };
  if (order.total_amount !== paidAmount || order.currency !== paidCurrency) {
    return { ok: false, reason: 'amount_mismatch' };
  }

  // 멱등 전환: status='pending' 조건이 걸린 UPDATE 라 동시 호출 중 하나만 성공한다.
  const { data: flipped } = await admin
    .from('orders')
    .update({
      status: 'paid',
      payment_method: provider,
      payment_ref: paymentRef,
      paid_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, coupon_code')
    .maybeSingle();

  // 이번 호출이 실제로 확정한 경우에만 쿠폰 차감 (best-effort)
  if (flipped && order.coupon_code) {
    try {
      await admin.rpc('redeem_coupon', { p_code: order.coupon_code });
    } catch {
      /* 쿠폰 차감 실패해도 결제/주문은 유지 */
    }
  }

  return { ok: true, orderNo: order.order_no, already: !flipped };
}
