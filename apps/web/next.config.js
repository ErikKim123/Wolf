// Design Ref: §11.1 — NAS 심볼릭링크 미지원 → @wolf/shared 를 transpilePackages + tsconfig path로 직접 참조
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @wolf/shared(src TS) 를 트랜스파일 (node_modules 링크 없이 소스 참조)
  transpilePackages: ['@wolf/shared'],
  experimental: {
    externalDir: true, // 모노레포 루트 밖(packages/) 파일 import 허용
  },
  images: {
    // 배너/상품 이미지: 외부 URL 허용 (Supabase Storage·CDN 등)
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Design Ref: §7 보안 — 기본 보안 헤더 (CSP 는 인라인 스타일/외부이미지 영향으로 추후 별도 도입)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
