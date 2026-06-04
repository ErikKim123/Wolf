// Design Ref: §5 Phase 2 — 메인페이지. main_sections 순서대로 렌더(없으면 기본 구성).
import { pickI18n, type I18n, type Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import {
  getMainSections,
  getActiveBanners,
  getFeaturedProducts,
  getVisibleCategories,
  type MainSection,
} from '@/lib/queries/home';
import { HeroSection } from '@/components/home/HeroSection';
import { BannerSlider } from '@/components/home/BannerSlider';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategoryStrip } from '@/components/home/CategoryStrip';

// 메인은 콘텐츠가 자주 바뀌므로 매 요청 SSR (관리자 변경 즉시 반영)
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);

  const [sections, banners, products, categories] = await Promise.all([
    getMainSections(),
    getActiveBanners(),
    getFeaturedProducts(),
    getVisibleCategories(),
  ]);

  const heroBanner = banners.find((b) => b.position === 'hero') ?? banners[0] ?? null;
  const sliderBanners = banners.filter((b) => b.id !== heroBanner?.id);

  function sectionTitle(s: MainSection): string | undefined {
    const t = s.config?.title_i18n as I18n | undefined;
    return t ? pickI18n(t, locale) : (s.config?.title as string | undefined);
  }

  function renderSection(s: MainSection) {
    switch (s.section_type) {
      case 'hero':
        return heroBanner ? <HeroSection key={s.id} banner={heroBanner} locale={locale} /> : null;
      case 'slider':
        return <BannerSlider key={s.id} banners={sliderBanners} locale={locale} />;
      case 'featured':
        return (
          <FeaturedProducts
            key={s.id}
            title={sectionTitle(s)}
            products={products}
            locale={locale}
            dict={dict}
          />
        );
      case 'category_strip':
        return (
          <CategoryStrip
            key={s.id}
            title={sectionTitle(s)}
            categories={categories}
            locale={locale}
            dict={dict}
          />
        );
      default:
        return null;
    }
  }

  // main_sections 가 정의돼 있으면 그 순서대로, 없으면 기본 구성으로 폴백
  if (sections.length > 0) {
    return <>{sections.map(renderSection)}</>;
  }

  return (
    <>
      {heroBanner && <HeroSection banner={heroBanner} locale={locale} />}
      <BannerSlider banners={sliderBanners} locale={locale} />
      <CategoryStrip categories={categories} locale={locale} dict={dict} />
      <FeaturedProducts products={products} locale={locale} dict={dict} />
    </>
  );
}
