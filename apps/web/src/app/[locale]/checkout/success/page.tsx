// Design Ref: §5 Phase 4 — 결제 완료 페이지.
// Stripe 성공 리다이렉트 / PortOne 모바일 redirect 복귀 양쪽의 도착지.
// PortOne 모바일 복귀(oid+pid) 시 여기서 서버가 결제를 검증·확정한다(멱등, webhook 과 중복돼도 안전).
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { getPortonePayment } from '@/lib/payments/portone';
import { finalizeOrder } from '@/lib/payments/finalize';
import { ClearCart } from '@/components/cart/ClearCart';

export const dynamic = 'force-dynamic';

function str(v: string | string[] | undefined): string | null {
  return typeof v === 'string' ? v : null;
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const orderNo = str(searchParams.order);
  const oid = str(searchParams.oid);
  const pid = str(searchParams.pid);

  // PortOne 모바일 리다이렉트 복귀 — 서버에서 직접 검증·확정
  if (oid && pid) {
    try {
      const payment = await getPortonePayment(pid);
      if (payment && payment.status === 'PAID') {
        await finalizeOrder({
          orderId: oid,
          provider: 'portone',
          paymentRef: payment.id,
          paidAmount: payment.amountTotal,
          paidCurrency: payment.currency,
        });
      }
    } catch {
      /* 확정 실패해도 webhook 이 보강 */
    }
  }

  return (
    <div className="container-wolf flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <ClearCart />
      <CheckCircle2 size={56} className="text-success" />
      <h1 className="section-title">{dict.cart.orderComplete}</h1>
      {orderNo && (
        <p className="text-grey-500">
          {dict.cart.orderNo}: <span className="font-medium text-black">{orderNo}</span>
        </p>
      )}
      <Link href={`/${locale}`} className="btn btn-secondary btn-sm">
        {dict.cart.continue}
      </Link>
    </div>
  );
}
