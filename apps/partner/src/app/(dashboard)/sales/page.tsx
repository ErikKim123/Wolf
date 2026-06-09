// 판매·정산 (파트너) — 내 상품이 포함된 판매 내역 + 통화별 수수료 차감 정산액
import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { toDisplayAmount, type Currency } from '@wolf/shared';
import { StatusBadge } from '@/components/form/StatusBadge';
import { createClient } from '@/lib/supabase/server';
import { getPartnerSettlement } from '@/lib/queries/partner-stats';

export const dynamic = 'force-dynamic';

function fmtMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency as Currency,
    minimumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(toDisplayAmount(minor, currency as Currency));
}

export default async function SalesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { rows, gross, payout, commissionRate } = await getPartnerSettlement(user.id);
  const currencies = Array.from(new Set([...Object.keys(gross), ...Object.keys(payout)]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl uppercase tracking-tight">판매·정산</h1>
        <span className="label-caps text-grey-500">수수료율 {(commissionRate * 100).toFixed(1)}%</span>
      </div>

      {/* 정산 요약 (통화별) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currencies.length === 0 ? (
          <div className="rounded-lg border border-grey-200 p-4 text-grey-500">정산할 판매가 없습니다.</div>
        ) : (
          currencies.map((c) => (
            <div key={c} className="rounded-lg border border-grey-200 p-4">
              <div className="flex items-center gap-2 text-grey-400">
                <Wallet size={16} />
                <span className="label-caps">{c} 정산 예정</span>
              </div>
              <p className="mt-2 font-display text-2xl">{fmtMoney(payout[c] ?? 0, c)}</p>
              <p className="mt-1 text-xs text-grey-500">
                총 판매 {fmtMoney(gross[c] ?? 0, c)} − 수수료 {fmtMoney((gross[c] ?? 0) - (payout[c] ?? 0), c)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 판매 내역 */}
      <div>
        <h2 className="mb-3 text-lg uppercase tracking-tight">판매 내역</h2>
        <div className="overflow-hidden rounded-lg border border-grey-200">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-grey-500">판매 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-grey-200 bg-grey-50 text-left">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">상품</th>
                    <th className="px-4 py-2.5 font-medium">주문번호</th>
                    <th className="px-4 py-2.5 font-medium">주문상태</th>
                    <th className="px-4 py-2.5 text-right font-medium">수량</th>
                    <th className="px-4 py-2.5 text-right font-medium">판매액</th>
                    <th className="px-4 py-2.5 text-right font-medium">정산액</th>
                    <th className="px-4 py-2.5 text-right font-medium">주문일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const settle = Math.round(r.lineAmount * (1 - commissionRate));
                    const excluded = r.orderStatus === 'cancelled' || r.orderStatus === 'refunded';
                    return (
                      <tr key={r.id} className="border-b border-grey-100 last:border-0">
                        <td className="px-4 py-2.5 font-medium">{r.productName}</td>
                        <td className="px-4 py-2.5 text-grey-600">{r.orderNo ?? '—'}</td>
                        <td className="px-4 py-2.5">{r.orderStatus ? <StatusBadge status={r.orderStatus} /> : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{r.qty}</td>
                        <td className="px-4 py-2.5 text-right">{fmtMoney(r.lineAmount, r.currency)}</td>
                        <td className="px-4 py-2.5 text-right">
                          {excluded ? <span className="text-grey-400">제외</span> : fmtMoney(settle, r.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-grey-400">
                          {r.createdAt ? String(r.createdAt).slice(0, 10) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-grey-400">
          정산액 = 판매액 × (1 − 수수료율). 취소·환불 주문은 정산에서 제외됩니다. 실제 지급은 운영자 정산 일정에 따릅니다.
        </p>
      </div>
    </div>
  );
}
