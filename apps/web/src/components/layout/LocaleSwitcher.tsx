// Design Ref: §6 — 언어 전환 (현재 경로에서 locale 세그먼트만 교체)
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeLocales } from '@/i18n/config';
import type { Locale } from '@wolf/shared';

const LABEL: Record<string, string> = { en: 'EN', ko: 'KO', ja: 'JA', 'zh-TW': 'TW' };

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();

  function swap(to: Locale): string {
    const parts = pathname.split('/');
    parts[1] = to; // /[locale]/... 의 첫 세그먼트 교체
    return parts.join('/') || `/${to}`;
  }

  return (
    <div className="flex items-center gap-1">
      {activeLocales.map((l) => (
        <Link
          key={l}
          href={swap(l)}
          className={`rounded-pill px-2.5 py-1 text-xs font-medium uppercase tracking-tight transition-colors ${
            l === current ? 'bg-black text-white' : 'text-grey-500 hover:text-black'
          }`}
        >
          {LABEL[l] ?? l}
        </Link>
      ))}
    </div>
  );
}
