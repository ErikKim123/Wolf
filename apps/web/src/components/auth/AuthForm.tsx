// Design Ref: §5 Phase 4 — 고객 로그인/회원가입 (Supabase Auth). 신규는 profiles role=customer.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import type { Dictionary } from '@/i18n/dictionaries';

// profiles row 가 없을 때만 customer 로 생성 (admin/partner 권한 보호)
async function ensureProfile(
  supabase: SupabaseClient,
  id: string,
  email: string,
  name: string | null,
  locale: Locale,
) {
  const { data } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle();
  if (!data) {
    await supabase.from('profiles').insert({ id, email, name, role: 'customer', locale });
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function gotoNext() {
    const next = params.get('next');
    router.refresh();
    router.replace(next ? `/${locale}/${next}` : `/${locale}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session && data.user) {
          await ensureProfile(supabase, data.user.id, email, name || null, locale);
          gotoNext();
        } else {
          // 이메일 확인 필요 설정인 경우
          setInfo(dict.auth.confirmSent);
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        await ensureProfile(supabase, data.user.id, email, name || null, locale);
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
          <div className="space-y-1.5">
            <label className="label-caps">{dict.auth.name}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
