// Design Ref: Design_System/assets/hero-stadium — 히어로 배너 (대형 1개, 이미지+제목+CTA)
import Link from 'next/link';
import { pickI18n, type Locale } from '@wolf/shared';
import type { Banner } from '@/lib/queries/home';

export function HeroSection({ banner, locale }: { banner: Banner; locale: Locale }) {
  const title = pickI18n(banner.title_i18n, locale);
  const href = banner.link_url ?? `/${locale}`;

  return (
    <section className="container-wolf pt-6">
      <Link
        href={href}
        className="relative flex aspect-[16/9] items-end overflow-hidden rounded-xl bg-grey-900 md:aspect-[21/9]"
      >
        {banner.image_url ? (
          // 외부 이미지: next/image 대신 background 로 단순 처리 (CDN URL 다양성)
          <span
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{ backgroundImage: `url(${banner.image_url})` }}
            aria-hidden
          />
        ) : null}
        <div className="relative z-10 p-6 md:p-10">
          <h1 className="font-display text-3xl uppercase leading-tight tracking-tight text-white md:text-5xl">
            {title}
          </h1>
        </div>
      </Link>
    </section>
  );
}
