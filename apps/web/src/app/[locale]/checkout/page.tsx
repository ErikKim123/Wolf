// Design Ref: §5 Phase 4 — 체크아웃 라우트 (서버 가드: 미로그인 → 로그인으로)
import { redirect } from 'next/navigation';
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { createClient } from '@/lib/supabase/server';
import { isProviderConfigured, providerForLocale } from '@/lib/payments/config';
import { CheckoutView } from '@/components/cart/CheckoutView';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=checkout`);

  const paymentEnabled = isProviderConfigured(providerForLocale(locale));

  return (
    <CheckoutView locale={locale} dict={dict} userId={user.id} paymentEnabled={paymentEnabled} />
  );
}
