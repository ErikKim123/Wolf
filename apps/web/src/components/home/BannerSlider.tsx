// Design Ref: §5 Phase 2 — 슬라이드 배너 (가로 스크롤-스냅, 라이브러리 無)
import Link from 'next/link';
import { pickI18n, type Locale } from '@wolf/shared';
import type { Banner } from '@/lib/queries/home';

export function BannerSlider({ banners, locale }: { banners: Banner[]; locale: Locale }) {
  if (banners.length === 0) return null;
  return (
    <section className="container-wolf py-6">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {banners.map((b) => (
          <Link
            key={b.id}
            href={b.link_url ?? `/${locale}`}
            className="relative flex aspect-[16/9] w-[85%] flex-none snap-start items-end overflow-hidden rounded-lg bg-grey-800 sm:w-[48%] lg:w-[32%]"
          >
            {b.image_url ? (
              <span
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url(${b.image_url})` }}
                aria-hidden
              />
            ) : null}
            <span className="relative z-10 p-4 font-display text-lg uppercase tracking-tight text-white">
              {pickI18n(b.title_i18n, locale)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
