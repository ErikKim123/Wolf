// Design Ref: §4 — 브라우저 Supabase 클라이언트 (anon 키, RLS 적용)
'use client';
import { createBrowserClient } from '@supabase/ssr';
import { PARTNER_AUTH_COOKIE } from './cookie';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // admin/web 과 세션이 섞이지 않도록 전용 쿠키명 사용 (cookieOptions.name → storageKey)
    { cookieOptions: { name: PARTNER_AUTH_COOKIE } },
  );
}
