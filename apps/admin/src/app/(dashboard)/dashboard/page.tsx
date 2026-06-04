// Design Ref: §5 — 관리자 대시보드 (요약 통계 카드 + 최근 주문)
import { ShoppingCart, DollarSign, Users, Store, Package } from 'lucide-react';
import { toDisplayAmount, type Currency } from '@wolf/shared';
import { StatusBadge } from '@/components/form/StatusBadge';
import { getDashboardStats } from '@/lib/queries/stats';

export const dynamic = 'force-dynamic';

function fmtMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency as Currency,
    minimumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(toDisplayAmount(minor, currency as Currency));
}

export default async function DashboardPage() {
  const s = await getDashboardStats();
  const revenueText =
    Object.entries(s.revenue)
      .map(([c, v]) => fmtMoney(v, c))
      .join(' · ') || '—';

  const cards = [
    { label: '주문', value: String(s.orderCount), icon: ShoppingCart },
    { label: '매출 (결제완료)', value: revenueText, icon: DollarSign },
    { label: '회원', value: String(s.memberCount), icon: Users },
    { label: '파트너', value: String(s.partnerCount), icon: Store },
    { label: '판매중 상품', value: String(s.productCount), icon: Package },
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
        <h2 className="mb-3 text-lg uppercase tracking-tight">최근 주문</h2>
        <div className="overflow-hidden rounded-lg border border-grey-200">
          {s.recentOrders.length === 0 ? (
            <p className="px-4 py-10 text-center text-grey-500">주문 없음.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-grey-200 bg-grey-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">주문번호</th>
                  <th className="px-4 py-2.5 font-medium">상태</th>
                  <th className="px-4 py-2.5 text-right font-medium">금액</th>
                  <th className="px-4 py-2.5 text-right font-medium">주문일</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-grey-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{o.order_no}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">{fmtMoney(o.total_amount, o.currency)}</td>
                    <td className="px-4 py-2.5 text-right text-grey-400">
                      {String(o.created_at).slice(0, 10)}
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
