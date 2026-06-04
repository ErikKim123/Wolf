// Design Ref: §5 Phase 4 — 로그아웃 (세션 종료 후 홈으로)
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton({ locale, label }: { locale: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await createClient().auth.signOut();
    router.refresh();
    router.replace(`/${locale}`);
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="btn btn-secondary btn-sm w-fit">
      <LogOut size={16} /> {label}
    </button>
  );
}
