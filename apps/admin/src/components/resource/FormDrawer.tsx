// Design Ref: §5.1 — 폼 드로어 (목록 위에 슬라이드). 반응형: 모바일 전체폭, PC 우측 패널.
'use client';
import { X } from 'lucide-react';

export function FormDrawer({
  open, title, onClose, children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>
        {children}
      </aside>
    </>
  );
}
