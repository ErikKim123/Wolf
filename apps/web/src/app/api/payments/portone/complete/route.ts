// Design Ref: §5 Phase 4 — PortOne 결제 완료 검증(클라이언트 콜백 경로).
// 브라우저 SDK 성공 후 호출 → 서버가 PortOne API 로 결제건을 재조회해 금액/상태 확인 후 확정.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPortonePayment } from '@/lib/payments/portone';
import { finalizeOrder } from '@/lib/payments/finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { orderId?: string; paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!body.orderId || !body.paymentId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const payment = await getPortonePayment(body.paymentId);
  if (!payment) return NextResponse.json({ error: 'payment_not_found' }, { status: 404 });

  if (payment.status === 'VIRTUAL_ACCOUNT_ISSUED' || payment.status === 'READY') {
    // 가상계좌 발급 등 결제대기 — 주문은 pending 유지, webhook 으로 추후 확정.
    return NextResponse.json({ ok: false, status: payment.status, pending: true });
  }
  if (payment.status !== 'PAID') {
    return NextResponse.json({ ok: false, status: payment.status });
  }

  const result = await finalizeOrder({
    orderId: body.orderId,
    provider: 'portone',
    paymentRef: payment.id,
    paidAmount: payment.amountTotal,
    paidCurrency: payment.currency,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, orderNo: result.orderNo });
}
