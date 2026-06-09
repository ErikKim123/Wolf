// Design Ref: §4.2 — role=partner 서버 가드 (2차 방어, RLS가 3차) + 반응형 셸
// 세션 + profiles.role + partners 행을 조회해 클라이언트 셸(PartnerShell)에 주입한다.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PartnerShell } from '@/components/layout/PartnerShell';
import type { PartnerInfo } from '@/lib/partner/context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 비-partner 차단 — profiles.role 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'partner') {
    redirect('/login?error=forbidden');
  }

  // 입점정보(partners) — 본인 행 (RLS: partners_own). 아직 없으면 null.
  const { data: partner } = await supabase
    .from('partners')
    .select('id, company_name, commission_rate, status')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <PartnerShell
      session={{
        userId: user.id,
        email: profile.email ?? user.email ?? '',
        partner: (partner as PartnerInfo | null) ?? null,
      }}
    >
      {children}
    </PartnerShell>
  );
}
