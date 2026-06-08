// Design Ref: §5.3 / Design_System — 반응형 사이드바 (PC: 고정, 모바일: 드로어)
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, Package, TicketCheck, FolderTree, ShoppingCart, Truck,
  MessageSquare, Image, LayoutGrid, Ticket, Menu, X, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Design Ref: §1.1 가이드 9개 관리 메뉴 (Phase 1 전체 활성화). disabled 는 후속 메뉴용 옵션.
const NAV: { href: string; label: string; icon: LucideIcon; disabled?: boolean }[] = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/members', label: '회원관리', icon: Users },
  { href: '/partners', label: '파트너관리', icon: Store },
  { href: '/products', label: '상품관리', icon: Package },
  { href: '/event-passes', label: '행사패스관리', icon: TicketCheck },
  { href: '/categories', label: '카테고리관리', icon: FolderTree },
  { href: '/orders', label: '주문관리', icon: ShoppingCart },
  { href: '/shipments', label: '배송관리', icon: Truck },
  { href: '/boards', label: '게시판관리', icon: MessageSquare },
  { href: '/banners', label: '배너관리', icon: Image },
  { href: '/main-sections', label: '메인화면관리', icon: LayoutGrid },
  { href: '/coupons', label: '쿠폰관리', icon: Ticket },
];

export function AdminSidebar({ email }: { email: string }) {
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
      {NAV.map(({ href, label, icon: Icon, disabled }) => {
        const active = pathname.startsWith(href);
        if (disabled)
          return (
            <span key={href} className="flex cursor-not-allowed items-center gap-3 rounded-pill px-4 py-2.5 text-sm text-grey-400">
              <Icon size={18} /> {label}
              <span className="ml-auto text-[10px] uppercase">soon</span>
            </span>
          );
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
        <span className="font-display text-lg uppercase tracking-tight">Wolf Admin</span>
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
          <span className="font-display text-lg uppercase tracking-tight">Wolf Admin</span>
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
