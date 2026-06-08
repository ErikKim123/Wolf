// Design Ref: §5 Phase 4 — PortOne(ko/KRW) V2 결제 검증. 서버 전용.
// 브라우저 SDK 가 requestPayment 로 결제 → 서버가 PortOne REST API 로 실제 결제건을 조회해 금액/상태 재확인.
import 'server-only';
import type { Currency } from '@wolf/shared';

const API_BASE = 'https://api.portone.io';

export interface PortonePayment {
  id: string;
  status: string; // 'PAID' | 'READY' | 'FAILED' | 'CANCELLED' | ...
  amountTotal: number; // 결제 총액 (KRW=원, USD=cent)
  currency: Currency;
  raw: unknown;
}

/** PortOne V2 결제 단건 조회 (API secret 으로 서버 인증). */
export async function getPortonePayment(paymentId: string): Promise<PortonePayment | null> {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) throw new Error('PORTONE_API_SECRET 미설정');

  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${secret}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`PortOne 조회 실패 (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as {
    id: string;
    status: string;
    amount?: { total?: number };
    currency?: string;
  };
  const cur = body.currency === 'USD' ? 'USD' : 'KRW';
  return {
    id: body.id,
    status: body.status,
    amountTotal: body.amount?.total ?? 0,
    currency: cur as Currency,
    raw: body,
  };
}

/** V2 webhook 바디에서 paymentId 추출. 서명검증은 선택(없으면 API 재조회로 권위 확보). */
export function extractWebhookPaymentId(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { data?: { paymentId?: string } };
    return parsed.data?.paymentId ?? null;
  } catch {
    return null;
  }
}
