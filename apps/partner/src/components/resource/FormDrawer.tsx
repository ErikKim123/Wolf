// Design Ref: §5.1 — 폼 모달 (화면 가운데). 반응형: 모바일 전체폭, PC 중앙 카드.
'use client';
import { X } from 'lucide-react';

// 폭 프리셋: 기본(폼) vs 넓게(마법사/리치 에디터 편집)
const SIZE_CLASS: Record<'default' | 'wide', string> = {
  default: 'max-w-2xl',
  wide: 'max-w-5xl',
};

export function FormDrawer({
  open, title, onClose, children, size = 'default',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'default' | 'wide';
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`my-8 w-full ${SIZE_CLASS[size]} rounded-xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* sticky 헤더 — 길어진 마법사에서도 제목/닫기 항상 노출 */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-grey-100 bg-white/95 px-6 py-4 backdrop-blur">
          <h2 className="text-xl uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-grey-500 hover:text-black"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
