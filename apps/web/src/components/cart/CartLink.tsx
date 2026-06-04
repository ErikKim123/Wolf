// Design Ref: §5 Phase 4 — 헤더 장바구니 링크 (담긴 수량 배지)
'use client';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart/CartContext';

export function CartLink({ locale }: { locale: string }) {
  const { count } = useCart();
  return (
    <Link href={`/${locale}/cart`} className="relative p-1" aria-label="Cart">
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-black px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
