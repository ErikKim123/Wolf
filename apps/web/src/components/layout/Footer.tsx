// Design Ref: Design_System — 푸터 (로고 + 태그라인 + 카피)
import type { Locale } from '@wolf/shared';
import type { Dictionary } from '@/i18n/dictionaries';

export function Footer({ dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-10 border-t border-grey-200 bg-grey-50">
      <div className="container-wolf flex flex-col gap-3 py-10">
        <span className="font-display text-xl uppercase tracking-tight">WOLF</span>
        <p className="max-w-md text-sm text-grey-500">{dict.footer.tagline}</p>
        <p className="text-xs text-grey-400">© 2026 Wolf. {dict.footer.rights}</p>
      </div>
    </footer>
  );
}
