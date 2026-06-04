// Design Ref: §7 SEO — robots. 개인/주문 경로는 색인 제외.
import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 로그인·결제·계정 등 개인/비공개 경로는 색인 금지
      disallow: ['/*/login', '/*/signup', '/*/checkout', '/*/account', '/api/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
