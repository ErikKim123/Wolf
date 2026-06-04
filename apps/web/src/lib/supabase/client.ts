// Design Ref: §4 — 브라우저 Supabase 클라이언트 (anon 키, RLS). 고객 로그인/주문용.
'use client';
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
