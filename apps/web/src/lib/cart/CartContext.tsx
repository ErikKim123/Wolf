// Design Ref: §5 Phase 4 — 장바구니 상태 (localStorage 영속, 로그인 불필요). 결제 직전까지 클라이언트 보관.
'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { I18n, Prices } from '@wolf/shared';

export interface CartItem {
  id: string;
  name_i18n: I18n;
  prices: Prices;
  seller_id: string;
  is_partner_product: boolean;
  product_type: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
}

const STORAGE_KEY = 'wolf-cart';
const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 최초 마운트 시 localStorage 에서 복원 (SSR 불일치 방지)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* 손상된 값 무시 */
    }
    setHydrated(true);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function add(item: Omit<CartItem, 'qty'>, qty = 1) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { ...item, qty }];
    });
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function setQty(id: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
    );
  }
  function clear() {
    setItems([]);
  }

  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, add, remove, setQty, clear, count }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart 는 CartProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
