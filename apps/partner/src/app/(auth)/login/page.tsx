// Design Ref: §5.4 로그인 — Supabase Auth 이메일/비밀번호
'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// useSearchParams 는 Suspense 경계 필요 (Next.js CSR bailout)
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.get('error') === 'forbidden' ? '파트너 권한이 없는 계정입니다.' : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('로그인 실패: 이메일/비밀번호를 확인하세요.');
      return;
    }
    router.refresh();
    router.replace('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-grey-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-lg border border-grey-200 bg-white p-8"
      >
        <h1 className="font-display text-2xl uppercase tracking-tight">Wolf Partner</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-1.5">
          <label className="label-caps">이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">비밀번호</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </main>
  );
}
