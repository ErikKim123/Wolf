// Design Ref: §5 Phase 4 — 고객 계정 (프로필 + 주문내역 진입 + 로그아웃)
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=account`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle();

  const name = profile?.name || profile?.email || user.email;

  return (
    <div className="container-wolf max-w-2xl py-8">
      <h1 className="section-title mb-6">{dict.auth.account}</h1>

      <div className="rounded-lg border border-grey-200 p-6">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-grey-500">{user.email}</p>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          href={`/${locale}/account/orders`}
          className="flex items-center gap-3 rounded-lg border border-grey-200 p-4 hover:bg-grey-50"
        >
          <Package size={18} className="text-grey-500" />
          <span className="flex-1 font-medium">{dict.orders.title}</span>
          <ChevronRight size={18} className="text-grey-400" />
        </Link>

        <LogoutButton locale={locale} label={dict.auth.logout} />
      </div>
    </div>
  );
}
