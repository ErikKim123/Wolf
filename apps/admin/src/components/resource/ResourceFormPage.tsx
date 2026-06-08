// Design Ref: §5.3 — 제네릭 폼 (config.formFields → 입력 렌더). i18n/prices/json/select/toggle 지원.
'use client';
import { useEffect, useState } from 'react';
import { I18nField } from '@/components/form/I18nField';
import { PriceField } from '@/components/form/PriceField';
import { useResourceUpsert } from '@/lib/queries/resource';
import type { FieldDef, ResourceConfig } from '@/lib/resource/types';

interface Props<T> {
  config: ResourceConfig<T>;
  initial?: Partial<T> | null;
  onDone: () => void;
  /** 특정 필드 커스텀 렌더 (예: 카테고리 parent select, 상품 attributes, AI 생성). allValues 로 다른 필드 참조 가능. */
  renderCustom?: (
    field: FieldDef,
    value: unknown,
    set: (v: unknown) => void,
    allValues: Record<string, unknown>,
  ) => React.ReactNode;
}

export function ResourceFormPage<T extends { id?: string }>({
  config, initial, onDone, renderCustom,
}: Props<T>) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  // G1: json 필드별 파싱 에러 추적
  const [jsonErrors, setJsonErrors] = useState<Record<string, boolean>>({});
  const upsert = useResourceUpsert<T>(config);

  useEffect(() => {
    // 수정: 기존 행 그대로 / 신규(initial null): config.createDefaults 주입
    setValues(
      initial
        ? (initial as Record<string, unknown>)
        : { ...(config.createDefaults ?? {}) },
    );
    setJsonErrors({});
  }, [initial, config.createDefaults]);

  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }));
  const setJsonError = (name: string, bad: boolean) =>
    setJsonErrors((p) => ({ ...p, [name]: bad }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // 필수 검증
    for (const f of config.formFields) {
      if (f.required && !values[f.name]) {
        setError(`${f.label}은(는) 필수입니다.`);
        return;
      }
    }
    // G1: 잘못된 JSON 차단
    const badJson = Object.entries(jsonErrors).find(([, bad]) => bad);
    if (badJson) {
      setError('잘못된 JSON 형식입니다. 확인 후 다시 시도하세요.');
      return;
    }
    // G2: zod 스키마 검증 (Design §7)
    if (config.schema) {
      const result = config.schema.safeParse(values);
      if (!result.success) {
        const first = result.error.issues[0];
        const where = first?.path.join('.') || '입력';
        setError(`${where}: ${first?.message ?? '검증 실패'}`);
        return;
      }
    }
    try {
      await upsert.mutateAsync(values as Partial<T>);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {config.formFields.map((f) => (
        <Field
          key={f.name}
          field={f}
          value={values[f.name]}
          set={(v) => set(f.name, v)}
          onJsonError={(bad) => setJsonError(f.name, bad)}
          renderCustom={renderCustom}
          allValues={values}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={upsert.isPending} className="btn btn-primary btn-sm">
          {upsert.isPending ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={onDone} className="btn btn-secondary btn-sm">취소</button>
      </div>
    </form>
  );
}

function Field({
  field, value, set, onJsonError, renderCustom, allValues,
}: {
  field: FieldDef;
  value: unknown;
  set: (v: unknown) => void;
  onJsonError?: (bad: boolean) => void;
  renderCustom?: Props<unknown>['renderCustom'];
  allValues: Record<string, unknown>;
}) {
  if (field.readOnly) {
    return (
      <div className="space-y-1.5">
        <label className="label-caps">{field.label}</label>
        <p className="text-sm text-grey-600">{String(value ?? '—')}</p>
      </div>
    );
  }
  switch (field.kind) {
    case 'i18n':
    case 'i18n-multiline':
      return (
        <I18nField
          label={field.label}
          required={field.required}
          multiline={field.kind === 'i18n-multiline'}
          value={(value as Record<string, string>) ?? {}}
          onChange={set}
        />
      );
    case 'prices':
      return <PriceField label={field.label} value={(value as Record<string, number>) ?? {}} onChange={set} />;
    case 'select':
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}{field.required && ' *'}</label>
          <select className="input" value={(value as string) ?? ''} onChange={(e) => set(e.target.value)}>
            <option value="">선택</option>
            {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
    case 'toggle':
      return (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          <span className="label-caps">{field.label}</span>
        </label>
      );
    case 'number':
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}{field.required && ' *'}</label>
          <input type="number" className="input" value={(value as number) ?? ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} />
        </div>
      );
    case 'date':
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}{field.required && ' *'}</label>
          <input type="date" className="input" value={(value as string) ?? ''} onChange={(e) => set(e.target.value || null)} />
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}{field.required && ' *'}</label>
          <textarea className="input min-h-32" value={(value as string) ?? ''} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />
        </div>
      );
    case 'json':
      return <JsonField field={field} value={value} set={set} onJsonError={onJsonError} />;
    case 'custom':
      return <>{renderCustom?.(field, value, set, allValues)}</>;
    default: // text
      return (
        <div className="space-y-1.5">
          <label className="label-caps">{field.label}{field.required && ' *'}</label>
          <input className="input" value={(value as string) ?? ''} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} />
        </div>
      );
  }
}

// G1: JSON 입력 — 파싱 실패 시 에러 표시 + 상위 보고(제출 차단)
function JsonField({
  field, value, set, onJsonError,
}: {
  field: FieldDef;
  value: unknown;
  set: (v: unknown) => void;
  onJsonError?: (bad: boolean) => void;
}) {
  const [bad, setBad] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="label-caps">{field.label}</label>
      <textarea
        className={`input min-h-24 font-mono text-xs ${bad ? 'input-error' : ''}`}
        defaultValue={value ? JSON.stringify(value, null, 2) : ''}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') { setBad(false); onJsonError?.(false); set({}); return; }
          try {
            set(JSON.parse(raw));
            setBad(false); onJsonError?.(false);
          } catch {
            setBad(true); onJsonError?.(true);
          }
        }}
        placeholder={field.placeholder ?? '{ }'}
      />
      {bad && <p className="text-[11px] text-danger">JSON 형식이 올바르지 않습니다.</p>}
    </div>
  );
}
