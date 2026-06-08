// Design Ref: §5 Phase 4 — 소셜 로그인(카카오) OAuth 콜백.
// PKCE: 브라우저가 시작한 OAuth 의 code_verifier 가 쿠키에 저장되므로 서버에서 code→세션 교환 가능.
// 교환 후 프로필이 없으면 일반사용자(customer)로 생성하고 원래 목적지로 복귀.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const LOCALES = ['en', 'ko', 'ja', 'zh-TW'];

export async function GET(
  req: NextRequest,
  { params }: { params: { locale: string } },
) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '';
  const locale = params.locale;
  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const fail = `${base}/${locale}/login?error=oauth`;

  if (!code) return NextResponse.redirect(fail);

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  // 프로필 보장 — 소셜 가입자는 일반사용자(customer)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (!existing) {
      const meta = user.user_metadata ?? {};
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email ?? null,
        name: (meta.name as string | undefined) ?? (meta.full_name as string | undefined) ?? null,
        phone: user.phone ?? null,
        role: 'customer',
        locale: LOCALES.includes(locale) ? locale : 'en',
      });
    }
  }

  return NextResponse.redirect(`${base}/${locale}${next ? `/${next}` : ''}`);
}
