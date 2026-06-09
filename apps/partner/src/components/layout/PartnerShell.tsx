// 대시보드 셸 — 사이드바 + 본문 + 입점 승인상태 배너. 서버 layout 이 세션을 주입한다.
'use client';
import { AlertTriangle, Clock } from 'lucide-react';
import { PartnerProvider, type PartnerSession } from '@/lib/partner/context';
import { PartnerSidebar } from './PartnerSidebar';

export function PartnerShell({
  session,
  children,
}: {
  session: PartnerSession;
  children: React.ReactNode;
}) {
  const { partner, email } = session;

  // 입점 상태 안내 (active 가 아니면 일부 기능이 노출되지 않을 수 있음)
  let banner: { tone: 'warn' | 'info'; text: string } | null = null;
  if (!partner) {
    banner = { tone: 'warn', text: '입점 정보가 아직 없습니다. ‘내 정보’에서 회사 정보를 등록하면 운영자 승인 후 판매를 시작할 수 있습니다.' };
  } else if (partner.status === 'pending') {
    banner = { tone: 'info', text: '입점 신청이 검토 중입니다. 승인되면 등록한 상품을 판매할 수 있습니다.' };
  } else if (partner.status === 'suspended') {
    banner = { tone: 'warn', text: '계정이 정지 상태입니다. 자세한 내용은 운영자에게 문의하세요.' };
  }

  return (
    <PartnerProvider value={session}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <PartnerSidebar email={email} />
        <main className="flex-1 overflow-x-auto p-4 md:p-8">
          {banner && (
            <div
              className={
                'mb-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ' +
                (banner.tone === 'warn'
                  ? 'border-danger/30 bg-danger/5 text-danger'
                  : 'border-live/30 bg-live/5 text-live')
              }
            >
              {banner.tone === 'warn' ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              ) : (
                <Clock size={18} className="mt-0.5 shrink-0" />
              )}
              <span>{banner.text}</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </PartnerProvider>
  );
}
