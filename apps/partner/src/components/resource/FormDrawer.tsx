// Design Ref: §5.1 — 폼 모달 (화면 가운데). 반응형: 모바일 전체폭, PC 중앙 카드.
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
