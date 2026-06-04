// Design Ref: §10.4 — en/ko 탭 입력. 저장 시 빈 값 제외(상위 폼에서 처리)
'use client';
import { useState } from 'react';
import type { I18n, Locale } from '@wolf/shared';
import { cn } from '@/lib/utils';

// 1차: en/ko (구조는 4개 언어 대비)
const TABS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'ko', label: 'KO' },
];

interface Props {
  label: string;
  value: I18n;
  onChange: (next: I18n) => void;
  multiline?: boolean;
  required?: boolean;
}

export function I18nField({ label, value, onChange, multiline, required }: Props) {
  const [active, setActive] = useState<Locale>('en');

  function set(locale: Locale, text: string) {
    onChange({ ...value, [locale]: text });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="label-caps">{label}{required && ' *'}</label>
        <div className="flex gap-1">
          {TABS.map(({ locale, label }) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActive(locale)}
              className={cn(
                'rounded-pill px-2.5 py-0.5 text-[11px] font-medium uppercase transition-colors',
                active === locale ? 'bg-black text-white' : 'bg-grey-100 text-grey-500',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          className="input min-h-24"
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
        />
      ) : (
        <input
          className="input"
          value={value[active] ?? ''}
          onChange={(e) => set(active, e.target.value)}
        />
      )}
      {active !== 'en' && !value.en && (
        <p className="text-[11px] text-grey-400">EN 값이 비어 있으면 폴백이 동작하지 않습니다.</p>
      )}
    </div>
  );
}
