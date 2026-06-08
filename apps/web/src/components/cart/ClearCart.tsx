// Design Ref: §5 Phase 4 — 결제 완료 페이지 진입 시 장바구니 비우기 (localStorage).
'use client';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart/CartContext';

export function ClearCart() {
  const { clear } = useCart();
  // 마운트 시 1회만. clear 는 setItems([]) 멱등 — 의존성에 넣으면 루프라 의도적으로 비움.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => clear(), []);
  return null;
}
