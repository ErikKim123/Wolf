// 내 정보 (파트너) — 본인 입점정보(partners) 조회/수정. 수수료율·상태는 운영자 설정(읽기전용).
// RLS: partners_own (user_id = auth.uid()) 로 본인 행만 조회/upsert.
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePartner } from '@/lib/partner/context';
import { StatusBadge } from '@/components/form/StatusBadge';

interface PartnerForm {
  company_name: string;
  country: string;
  biz_no: string;
  settlement_info: string; // JSON 텍스트
}

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '활성',
  suspended: '정지',
};

export default function ProfilePage() {
  const { userId } = usePartner();
  const [form, setForm] = useState<PartnerForm>({ company_name: '', country: '', biz_no: '', settlement_info: '' });
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [jsonBad, setJsonBad] = useState(false);

  useEffect(() => {
    let alive = true;
    createClient()
      .from('partners')
      .select('company_name, country, biz_no, settlement_info, commission_rate, status')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        if (data) {
          setForm({
            company_name: data.company_name ?? '',
            country: data.country ?? '',
            biz_no: data.biz_no ?? '',
            settlement_info: data.settlement_info ? JSON.stringify(data.settlement_info, null, 2) : '',
          });
          setCommissionRate(Number(data.commission_rate ?? 0));
          setStatus(data.status ?? null);
        }
      })
      .then(undefined, () => {})
      .then(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  function set<K extends keyof PartnerForm>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
    setDone(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (!form.company_name.trim()) {
      setError('회사명을 입력하세요.');
      return;
    }
    let settlement: unknown = null;
    if (form.settlement_info.trim()) {
      try {
        settlement = JSON.parse(form.settlement_info);
      } catch {
        setJsonBad(true);
        setError('정산정보(JSON) 형식이 올바르지 않습니다.');
        return;
      }
    }
    setJsonBad(false);
    setSaving(true);
    // upsert: 본인 partners 행 (없으면 생성). 수수료율/상태는 건드리지 않음(운영자 권한).
    const { error: upErr } = await createClient()
      .from('partners')
      .upsert(
        {
          user_id: userId,
          company_name: form.company_name.trim(),
          country: form.country.trim() || null,
          biz_no: form.biz_no.trim() || null,
          settlement_info: settlement,
        },
        { onConflict: 'user_id' },
      );
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setDone(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl uppercase tracking-tight">내 정보</h1>
        <p className="text-grey-500">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl uppercase tracking-tight">내 정보</h1>

      {/* 운영자 설정 (읽기전용) */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-grey-200 p-4">
        <div>
          <p className="label-caps text-grey-400">입점 상태</p>
          <div className="mt-1.5">
            {status ? <StatusBadge status={status} /> : <span className="text-grey-500">미등록</span>}
            {status && <span className="ml-2 text-sm text-grey-500">{STATUS_LABEL[status] ?? status}</span>}
          </div>
        </div>
        <div>
          <p className="label-caps text-grey-400">수수료율</p>
          <p className="mt-1.5 font-display text-xl">
            {commissionRate != null ? `${(commissionRate * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <p className="text-xs text-grey-400">입점 상태·수수료율은 운영자가 설정합니다.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        {done && <p className="text-sm text-success">저장되었습니다.</p>}

        <div className="space-y-1.5">
          <label className="label-caps">회사명 *</label>
          <input className="input" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">국가</label>
          <input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="예: KR, US" />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">사업자번호</label>
          <input className="input" value={form.biz_no} onChange={(e) => set('biz_no', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">정산정보 (JSON)</label>
          <textarea
            className={`input min-h-32 font-mono text-xs ${jsonBad ? 'input-error' : ''}`}
            value={form.settlement_info}
            onChange={(e) => set('settlement_info', e.target.value)}
            placeholder={'{\n  "bank": "은행명",\n  "account": "계좌번호",\n  "holder": "예금주"\n}'}
          />
          <p className="text-[11px] text-grey-400">정산 계좌 등 지급에 필요한 정보를 JSON 으로 입력합니다.</p>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
          {saving ? '저장 중…' : '저장'}
        </button>
      </form>
    </div>
  );
}
