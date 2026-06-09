// Design Ref: §5.3 / Design_System — 반응형 사이드바 (PC: 고정, 모바일: 드로어). admin 패턴 동일.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, TicketCheck, Receipt, Building2, Menu, X, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// 파트너 본인 데이터에 한정된 메뉴 (RLS 가 본인 행만 노출).
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/products', label: '상품관리', icon: Package },
  { href: '/event-passes', label: '행사패스관리', icon: TicketCheck },
  { href: '/sales', label: '판매·정산', icon: Receipt },
  { href: '/profile', label: '내 정보', icon: Building2 },
];

export function PartnerSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false); // 모바일 드로어

  async function logout() {
    await createClient().auth.signOut();
    router.refresh();
    router.replace('/login');
  }

  const NavList = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-pill px-4 py-2.5 text-sm transition-colors duration-200',
              active ? 'bg-black text-white' : 'text-grey-700 hover:bg-grey-100',
            )}
          >
            <Icon size={18} /> {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* 모바일 상단바 */}
      <header className="flex items-center justify-between border-b border-grey-200 px-4 py-3 md:hidden">
        <span className="font-display text-lg uppercase tracking-tight">Wolf Partner</span>
        <button onClick={() => setOpen(true)} aria-label="메뉴 열기"><Menu size={22} /></button>
      </header>

      {/* 모바일 드로어 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바: 모바일=드로어, PC=고정 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-grey-200 bg-white transition-transform duration-200 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-grey-200 px-5 py-4">
          <span className="font-display text-lg uppercase tracking-tight">Wolf Partner</span>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="닫기"><X size={20} /></button>
        </div>
        {NavList}
        <div className="border-t border-grey-200 p-3">
          <p className="truncate px-2 pb-2 text-xs text-grey-500">{email}</p>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-pill px-4 py-2.5 text-sm text-grey-700 hover:bg-grey-100">
            <LogOut size={18} /> 로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
