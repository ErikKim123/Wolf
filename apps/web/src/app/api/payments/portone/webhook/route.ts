// Design Ref: §5 Phase 4 — PortOne webhook(서버 권위 확정 보강).
// 페이로드를 신뢰하지 않고 paymentId 만 꺼낸 뒤 PortOne API 로 재조회해 확정한다(클라 complete 누락 대비).
import { NextResponse } from 'next/server';
import { createAdminClient } from '@wolf/shared';
import { extractWebhookPaymentId, getPortonePayment } from '@/lib/payments/portone';
import { finalizeOrder } from '@/lib/payments/finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = await req.text();
  const paymentId = extractWebhookPaymentId(raw);
  if (!paymentId) return NextResponse.json({ received: true });

  const payment = await getPortonePayment(paymentId);
  if (!payment || payment.status !== 'PAID') return NextResponse.json({ received: true });

  // paymentId = order_no → 주문 id 조회
  const admin = createAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id')
    .eq('order_no', paymentId)
    .maybeSingle();
  if (order?.id) {
    await finalizeOrder({
      orderId: order.id as string,
      provider: 'portone',
      paymentRef: payment.id,
      paidAmount: payment.amountTotal,
      paidCurrency: payment.currency,
    });
  }
  return NextResponse.json({ received: true });
}
