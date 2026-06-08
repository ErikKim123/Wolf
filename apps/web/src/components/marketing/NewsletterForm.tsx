// 뉴스레터 구독 폼 — 행사 페이지 하단. 이메일을 newsletter_subscribers 에 저장(중복 무시).
'use client';
import { useState } from 'react';
import type { Locale } from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import type { Dictionary } from '@/i18n/dictionaries';

export function NewsletterForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const supabase = createClient();
      // 이미 구독한 이메일이면 조용히 무시(ignoreDuplicates) → insert 권한만 필요
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email, locale }, { onConflict: 'email', ignoreDuplicates: true });
      if (error) throw error;
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="rounded-lg border border-grey-200 p-6 md:p-8">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2 className="text-lg uppercase tracking-tight">{dict.newsletter.title}</h2>
        <p className="text-sm text-grey-500">{dict.newsletter.desc}</p>
        {status === 'done' ? (
          <p className="text-sm text-success">{dict.newsletter.success}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              className="input flex-1"
              placeholder={dict.newsletter.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={status === 'loading'} className="btn btn-primary whitespace-nowrap">
              {status === 'loading' ? '…' : dict.newsletter.button}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-sm text-danger">{dict.newsletter.error}</p>}
      </div>
    </section>
  );
}
