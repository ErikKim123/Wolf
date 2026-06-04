// Design Ref: §7 SEO — sitemap. locale별 주요 공개 라우트 + hreflang 대안.
import type { MetadataRoute } from 'next';
import { activeLocales } from '@/i18n/config';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// 공개 색인 대상 정적 경로 (상품/카테고리 상세는 동적이라 제외)
const PATHS = ['', '/shop', '/boards'];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of PATHS) {
    for (const locale of activeLocales) {
      entries.push({
        url: `${SITE}/${locale}${path}`,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            activeLocales.map((l) => [l, `${SITE}/${l}${path}`]),
          ),
        },
      });
    }
  }
  return entries;
}
