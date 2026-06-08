// Design Ref: §5 Phase 4 — Stripe webhook. 결제 완료를 권위 있게 확정(pending→paid).
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { Currency } from '@wolf/shared';
import { constructWebhookEvent } from '@/lib/payments/stripe';
import { finalizeOrder } from '@/lib/payments/finalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'no_signature' }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(raw, sig);
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid_signature', detail: e instanceof Error ? e.message : 'err' },
      { status: 400 },
    );
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    const paid = session.payment_status === 'paid';
    if (orderId && paid && session.amount_total != null && session.currency) {
      const ref =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? session.id);
      await finalizeOrder({
        orderId,
        provider: 'stripe',
        paymentRef: ref,
        paidAmount: session.amount_total,
        paidCurrency: session.currency.toUpperCase() as Currency,
      });
    }
  }

  // Stripe 는 2xx 를 성공으로 본다. 처리 못한 이벤트도 200 으로 ack.
  return NextResponse.json({ received: true });
}
