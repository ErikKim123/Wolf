// Design Ref: Design_System/components-nav — 고객몰 헤더 (로고 + 네비 + 언어전환), 반응형
import Link from 'next/link';
import { User, Search } from 'lucide-react';
import type { Locale } from '@wolf/shared';
import { LocaleSwitcher } from './LocaleSwitcher';
import { CartLink } from '@/components/cart/CartLink';
import type { Dictionary } from '@/i18n/dictionaries';

export function Header({
  locale,
  dict,
  isAuthed,
}: {
  locale: Locale;
  dict: Dictionary;
  isAuthed: boolean;
}) {
  const nav = [
    { href: `/${locale}/shop`, label: dict.nav.shop },
    { href: `/${locale}/shop?type=ticket`, label: dict.nav.tickets },
    { href: `/${locale}/shop?type=subscription`, label: dict.nav.subscription },
    { href: `/${locale}/boards`, label: dict.nav.boards },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-grey-200 bg-white/90 backdrop-blur">
      <div className="container-wolf flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="font-display text-2xl uppercase tracking-tight">
          WOLF
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-grey-600 transition-colors hover:text-black"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href={`/${locale}/search`} className="p-1" aria-label={dict.search.title}>
            <Search size={20} />
          </Link>
          <Link
            href={isAuthed ? `/${locale}/account` : `/${locale}/login`}
            className="p-1"
            aria-label={isAuthed ? dict.auth.account : dict.auth.login}
          >
            <User size={20} />
          </Link>
          <CartLink locale={locale} />
          <LocaleSwitcher current={locale} />
        </div>
      </div>

      {/* 모바일 네비 — 가로 스크롤 */}
      <nav className="flex gap-5 overflow-x-auto border-t border-grey-100 px-4 py-2.5 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap text-sm font-medium text-grey-600"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
