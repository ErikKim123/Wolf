// Design Ref: §5 Phase 4 — 고객 로그인/회원가입 (Supabase Auth).
// 가입 시 계정 유형(일반사용자/파트너)을 선택 → auth user_metadata 에 저장(이메일 확인 흐름 보존),
// ensureProfile 이 메타데이터를 읽어 profiles.role 과 (파트너면) partners 레코드를 생성.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Locale } from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import type { Dictionary } from '@/i18n/dictionaries';

type AccountType = 'customer' | 'partner';

// profiles row 가 없을 때만 생성. role 은 가입 시 선택값(메타데이터)만 신뢰하되
// 'partner' 외에는 모두 'customer' 로 클램프 — admin 자가승격 방지.
// 파트너면 partners 레코드(status=pending)도 보장 → 어드민 승인 대상.
async function ensureProfile(supabase: SupabaseClient, user: User, locale: Locale) {
  const meta = user.user_metadata ?? {};
  const role: AccountType = meta.account_type === 'partner' ? 'partner' : 'customer';
  const name = (meta.name as string | undefined) ?? null;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? null,
      name,
      phone: user.phone ?? null,
      role,
      locale,
    });
  }

  if (role === 'partner') {
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!partner) {
      await supabase.from('partners').insert({
        user_id: user.id,
        company_name: (meta.company_name as string | undefined) || null,
        biz_no: (meta.biz_no as string | undefined) || null,
        status: 'pending',
      });
    }
  }
}

export function AuthForm({
  locale,
  dict,
  mode,
}: {
  locale: Locale;
  dict: Dictionary;
  mode: 'login' | 'signup';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('customer');
  const [companyName, setCompanyName] = useState('');
  const [bizNo, setBizNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // WhatsApp 전화번호 OTP
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  function gotoNext() {
    const next = params.get('next');
    router.refresh();
    router.replace(next ? `/${locale}/${next}` : `/${locale}`);
  }

  // 소셜 OAuth(카카오/구글) — Supabase 가 제공자 키를 보유. 콜백에서 code→세션 교환.
  async function signInOAuth(provider: 'kakao' | 'google') {
    setError(null);
    setLoading(true);
    try {
      const next = params.get('next');
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectTo = `${base}/${locale}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
      const { error: err } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (err) throw err;
      // 성공 시 제공자로 리다이렉트됨 (이후 콜백 라우트가 처리)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  // WhatsApp OTP 1단계: 인증번호 전송
  async function sendOtp() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error: err } = await createClient().auth.signInWithOtp({
        phone,
        options: { channel: 'whatsapp' },
      });
      if (err) throw err;
      setOtpStep('code');
      setInfo(dict.auth.codeSent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  // WhatsApp OTP 2단계: 인증번호 검증 → 로그인
  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (err) throw err;
      if (data.user) await ensureProfile(supabase, data.user, locale);
      gotoNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          // 선택값을 메타데이터로 보존 → 이메일 확인 후 최초 로그인 시 ensureProfile 이 사용
          options: {
            data: {
              name: name || null,
              account_type: accountType,
              company_name: accountType === 'partner' ? companyName || null : null,
              biz_no: accountType === 'partner' ? bizNo || null : null,
            },
          },
        });
        if (err) throw err;
        if (data.session && data.user) {
          await ensureProfile(supabase, data.user, locale);
          if (accountType === 'partner') { setInfo(dict.auth.partnerPending); return; }
          gotoNext();
        } else {
          // 이메일 확인 필요 설정인 경우
          setInfo(accountType === 'partner' ? dict.auth.partnerPending : dict.auth.confirmSent);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await ensureProfile(supabase, data.user, locale);
        gotoNext();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-wolf flex min-h-[60vh] items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-lg border border-grey-200 p-8">
        <h1 className="section-title">{mode === 'signup' ? dict.auth.signup : dict.auth.login}</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-success">{info}</p>}

        {mode === 'signup' && (
          <>
            <div className="space-y-1.5">
              <label className="label-caps">{dict.auth.accountType}</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'customer', label: dict.auth.regularUser, hint: dict.auth.regularUserHint },
                  { value: 'partner', label: dict.auth.partner, hint: dict.auth.partnerHint },
                ] as const).map((opt) => {
                  const active = accountType === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setAccountType(opt.value)}
                      aria-pressed={active}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        active ? 'border-black bg-black text-white' : 'border-grey-200 hover:border-grey-400'
                      }`}
                    >
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className={`block text-xs ${active ? 'text-white/70' : 'text-grey-500'}`}>{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label-caps">{dict.auth.name}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            {accountType === 'partner' && (
              <>
                <div className="space-y-1.5">
                  <label className="label-caps">{dict.auth.companyName}</label>
                  <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="label-caps">{dict.auth.bizNo}</label>
                  <input className="input" value={bizNo} onChange={(e) => setBizNo(e.target.value)} />
                </div>
              </>
            )}
          </>
        )}
        <div className="space-y-1.5">
          <label className="label-caps">{dict.auth.email}</label>
          <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">{dict.auth.password}</label>
          <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? '…' : dict.auth.submit}
        </button>

        {/* 소셜 / 전화번호 OTP 로그인 (로그인·가입 공통) */}
        <div className="flex items-center gap-3 pt-1">
          <span className="h-px flex-1 bg-grey-200" />
          <span className="text-xs uppercase tracking-wide text-grey-400">{dict.auth.orContinue}</span>
          <span className="h-px flex-1 bg-grey-200" />
        </div>

        <button
          type="button"
          onClick={() => signInOAuth('google')}
          disabled={loading}
          className="btn w-full border border-grey-300 bg-white text-grey-800 hover:bg-grey-50"
        >
          {dict.auth.googleLogin}
        </button>

        <button
          type="button"
          onClick={() => signInOAuth('kakao')}
          disabled={loading}
          className="btn w-full"
          style={{ backgroundColor: '#FEE500', color: '#191600' }}
        >
          {dict.auth.kakaoLogin}
        </button>

        <button
          type="button"
          onClick={() => { setOtpOpen((v) => !v); setOtpStep('phone'); }}
          disabled={loading}
          className="btn w-full"
          style={{ backgroundColor: '#25D366', color: '#ffffff' }}
        >
          {dict.auth.whatsappLogin}
        </button>

        {otpOpen && (
          <div className="space-y-2 rounded-lg border border-grey-200 p-3">
            {otpStep === 'phone' ? (
              <>
                <label className="label-caps">{dict.auth.phone}</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+821012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-[11px] text-grey-500">{dict.auth.phoneHint}</p>
                <button type="button" onClick={sendOtp} disabled={loading || !phone} className="btn btn-secondary w-full">
                  {dict.auth.sendCode}
                </button>
              </>
            ) : (
              <>
                <label className="label-caps">{dict.auth.otpCode}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button type="button" onClick={verifyOtp} disabled={loading || !otp} className="btn btn-primary w-full">
                  {dict.auth.verifyCode}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-sm text-grey-500">
          {mode === 'signup' ? (
            <Link href={`/${locale}/login`} className="hover:text-black">{dict.auth.toLogin}</Link>
          ) : (
            <Link href={`/${locale}/signup`} className="hover:text-black">{dict.auth.toSignup}</Link>
          )}
        </p>
      </form>
    </div>
  );
}
