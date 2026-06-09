// 회원(일반회원/관리자) 계정 직접 생성 폼 (운영자) — /api/members/create 호출.
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_OPTS = [
  { value: 'customer', label: '일반회원' },
  { value: 'admin', label: '관리자' },
];
const LOCALE_OPTS = [
  { value: 'en', label: 'EN' },
  { value: 'ko', label: 'KO' },
  { value: 'ja', label: 'JA' },
  { value: 'zh-TW', label: 'ZH-TW' },
];

export function CreateMemberForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'customer',
    locale: 'ko',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/members/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '생성 실패');
      qc.invalidateQueries({ queryKey: ['members'] });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      <p className="rounded-lg bg-grey-50 p-3 text-xs text-grey-500">
        로그인 계정을 생성합니다. 일반회원은 고객 사이트(:3000)에 이 이메일/비밀번호로 로그인합니다.
      </p>

      <div className="space-y-1.5">
        <label className="label-caps">로그인 이메일 *</label>
        <input type="email" required className="input" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="member@example.com" />
      </div>
      <div className="space-y-1.5">
        <label className="label-caps">초기 비밀번호 * (8자 이상)</label>
        <input type="text" required className="input" value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="회원에게 전달할 임시 비밀번호" />
      </div>
      <div className="space-y-1.5">
        <label className="label-caps">이름</label>
        <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="label-caps">전화</label>
        <input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-caps">권한</label>
          <select className="input" value={f.role} onChange={(e) => set('role', e.target.value)}>
            {ROLE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">언어</label>
          <select className="input" value={f.locale} onChange={(e) => set('locale', e.target.value)}>
            {LOCALE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
          {loading ? '생성 중…' : '회원 생성'}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">취소</button>
      </div>
    </form>
  );
}
