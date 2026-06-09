// 파트너 대시보드 — 내 상품/판매/정산 요약 카드 + 최근 판매
import { redirect } from 'next/navigation';
import { Package, CheckCircle2, Receipt, Wallet } from 'lucide-react';
import { toDisplayAmount, type Currency } from '@wolf/shared';
import { StatusBadge } from '@/components/form/StatusBadge';
import { createClient } from '@/lib/supabase/server';
import { getPartnerStats } from '@/lib/queries/partner-stats';

export const dynamic = 'force-dynamic';

function fmtMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency as Currency,
    minimumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(toDisplayAmount(minor, currency as Currency));
}

function moneyText(map: Record<string, number>): string {
  return (
    Object.entries(map)
      .map(([c, v]) => fmtMoney(v, c))
      .join(' · ') || '—'
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const s = await getPartnerStats(user.id);

  const cards = [
    { label: '내 상품', value: String(s.productCount), icon: Package },
    { label: '판매중', value: String(s.activeProductCount), icon: CheckCircle2 },
    { label: '판매 건수', value: String(s.saleItemCount), icon: Receipt },
    { label: '총 판매액', value: moneyText(s.gross), icon: Receipt },
    { label: `정산 예정 (수수료 ${(s.commissionRate * 100).toFixed(1)}% 차감)`, value: moneyText(s.payout), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl uppercase tracking-tight">대시보드</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-grey-200 p-4">
            <div className="flex items-center gap-2 text-grey-400">
              <Icon size={16} />
              <span className="label-caps">{label}</span>
            </div>
            <p className="mt-2 truncate font-display text-2xl">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg uppercase tracking-tight">최근 판매</h2>
        <div className="overflow-hidden rounded-lg border border-grey-200">
          {s.recentSales.length === 0 ? (
            <p className="px-4 py-10 text-center text-grey-500">판매 내역이 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-grey-200 bg-grey-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">상품</th>
                  <th className="px-4 py-2.5 font-medium">주문번호</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5 text-right font-medium">수량</th>
                  <th className="px-4 py-2.5 text-right font-medium">금액</th>
                  <th className="px-4 py-2.5 text-right font-medium">주문일</th>
                </tr>
              </thead>
              <tbody>
                {s.recentSales.map((r) => (
                  <tr key={r.id} className="border-b border-grey-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.productName}</td>
                    <td className="px-4 py-2.5 text-grey-600">{r.orderNo ?? '—'}</td>
                    <td className="px-4 py-2.5">{r.orderStatus ? <StatusBadge status={r.orderStatus} /> : '—'}</td>
                    <td className="px-4 py-2.5 text-right">{r.qty}</td>
                    <td className="px-4 py-2.5 text-right">{fmtMoney(r.lineAmount, r.currency)}</td>
                    <td className="px-4 py-2.5 text-right text-grey-400">
                      {r.createdAt ? String(r.createdAt).slice(0, 10) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
