// Design Ref: §5 Phase 4 — 결제 시작 엔드포인트.
// 클라이언트(상품id+수량+쿠폰)를 받아 서버에서 금액 재계산 → 주문(pending) 생성 → PG별 응답.
//   en/USD → Stripe Checkout URL,  ko/KRW → PortOne requestPayment 파라미터.
import { NextResponse } from 'next/server';
import type { Currency, Locale } from '@wolf/shared';
import { createClient } from '@/lib/supabase/server';
import {
  isProviderConfigured,
  portonePublic,
  providerForLocale,
  siteOrigin,
} from '@/lib/payments/config';
import { quoteCart, type CartLine } from '@/lib/payments/pricing';
import { createPendingOrder, finalizeOrder } from '@/lib/payments/finalize';
import { createCheckoutSession } from '@/lib/payments/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeLocale(v: unknown): Locale {
  return v === 'ko' ? 'ko' : 'en';
}

export async function POST(req: Request) {
  // 1) 인증 (쿠키 세션)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 2) 입력 파싱
  let body: { items?: CartLine[]; couponCode?: string | null; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const locale = normalizeLocale(body.locale);
  const currency: Currency = locale === 'ko' ? 'KRW' : 'USD';
  const provider = providerForLocale(locale);

  // 3) PG 설정 여부
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: 'payment_not_configured', provider }, { status: 503 });
  }

  // 4) 서버 권위 견적 (금액/할인 재계산)
  const today = new Date().toISOString().slice(0, 10);
  const quoted = await quoteCart(
    supabase,
    body.items ?? [],
    currency,
    locale,
    body.couponCode ?? null,
    today,
  );
  if (!quoted.ok) {
    return NextResponse.json({ error: 'invalid_cart', reason: quoted.reason }, { status: 400 });
  }
  const quote = quoted.quote;

  const origin = siteOrigin(new URL(req.url).origin);
  const successBase = `${origin}/${locale}/checkout/success`;

  // 5) 주문 생성 (pending) — 로그인 사용자 세션으로 insert (RLS, service role 불필요)
  const order = await createPendingOrder(supabase, quote, user.id, provider);

  // 6) 전액 할인 등으로 0원이면 PG 거치지 않고 즉시 확정
  if (quote.total === 0) {
    await finalizeOrder({
      orderId: order.orderId,
      provider,
      paymentRef: 'free',
      paidAmount: 0,
      paidCurrency: currency,
    });
    return NextResponse.json({
      kind: 'free',
      orderNo: order.orderNo,
      redirectUrl: `${successBase}?order=${order.orderNo}`,
    });
  }

  // 7) PG별 분기
  if (provider === 'stripe') {
    const session = await createCheckoutSession({
      orderId: order.orderId,
      orderNo: order.orderNo,
      orderName: order.orderName,
      amount: order.total,
      currency,
      successUrl: `${successBase}?order=${order.orderNo}`,
      cancelUrl: `${origin}/${locale}/checkout?canceled=1`,
      customerEmail: user.email ?? undefined,
    });
    return NextResponse.json({ kind: 'stripe', orderNo: order.orderNo, url: session.url });
  }

  // PortOne: paymentId = orderNo (유일). 모바일 리다이렉트 복귀 시 success 가 complete 호출.
  return NextResponse.json({
    kind: 'portone',
    orderId: order.orderId,
    orderNo: order.orderNo,
    paymentId: order.orderNo,
    storeId: portonePublic.storeId,
    channelKey: portonePublic.channelKey,
    orderName: order.orderName,
    amount: order.total,
    currency,
    redirectUrl: `${successBase}?order=${order.orderNo}&oid=${order.orderId}&pid=${order.orderNo}`,
  });
}
