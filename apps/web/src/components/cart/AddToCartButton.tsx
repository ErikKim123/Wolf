// Design Ref: §5 Phase 4 — 장바구니 담기 버튼 (클라이언트, 피드백 표시)
'use client';
import { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart, type CartItem } from '@/lib/cart/CartContext';

export function AddToCartButton({
  item,
  label,
  addedLabel,
  disabled,
}: {
  item: Omit<CartItem, 'qty'>;
  label: string;
  addedLabel: string;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function onClick() {
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button type="button" className="btn btn-primary mt-2 w-full" onClick={onClick} disabled={disabled}>
      {added ? (
        <>
          <Check size={16} /> {addedLabel}
        </>
      ) : (
        <>
          <ShoppingBag size={16} /> {label}
        </>
      )}
    </button>
  );
}
