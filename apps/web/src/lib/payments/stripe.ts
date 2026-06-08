// Design Ref: §5 Phase 4 — Stripe(en/USD) Hosted Checkout. 서버 전용.
import 'server-only';
import Stripe from 'stripe';
import type { Currency } from '@wolf/shared';

let _stripe: Stripe | null = null;

/** 지연 초기화 Stripe 클라이언트. 키 없으면 throw (호출 전 isProviderConfigured 로 가드). */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY 미설정');
    // apiVersion 미지정 → 계정 기본/SDK 핀 버전 사용 (타입 리터럴 충돌 회피)
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Stripe 통화 코드(소문자). minor unit 은 우리 스키마와 동일(USD=cent). */
function stripeCurrency(currency: Currency): string {
  return currency.toLowerCase();
}

/**
 * 단일 합계 라인으로 Checkout Session 생성. 주문/할인 내역은 우리 DB 가 권위 →
 * Stripe 에는 최종 청구금액만 넘긴다(쿠폰 객체 동기화 불필요, 금액 위조 불가).
 */
export async function createCheckoutSession(args: {
  orderId: string;
  orderNo: string;
  orderName: string;
  amount: number; // 최소단위
  currency: Currency;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: stripeCurrency(args.currency),
          unit_amount: args.amount,
          product_data: { name: args.orderName },
        },
      },
    ],
    client_reference_id: args.orderNo,
    metadata: { order_id: args.orderId, order_no: args.orderNo },
    customer_email: args.customerEmail,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
  });
  if (!session.url) throw new Error('Stripe session url 없음');
  return { url: session.url, sessionId: session.id };
}

/** 원문 바디 + 서명으로 webhook 이벤트 검증. 실패 시 throw. */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET 미설정');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
