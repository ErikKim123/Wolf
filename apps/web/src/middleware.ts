// Design Ref: §6 — locale 라우팅. /경로 에 활성 locale 없으면 감지/기본값으로 리다이렉트.
import { NextResponse, type NextRequest } from 'next/server';
import { activeLocales, defaultLocale } from '@/i18n/config';

function detectLocale(request: NextRequest): string {
  const header = request.headers.get('accept-language') ?? '';
  // "ko-KR,ko;q=0.9,en;q=0.8" → 활성 locale 중 첫 매칭
  const preferred = header.split(',').map((p) => {
    const lang = p.split(';')[0] ?? '';
    return lang.trim().split('-')[0] ?? '';
  });
  for (const lang of preferred) {
    const match = activeLocales.find((l) => l === lang);
    if (match) return match;
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = activeLocales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, 정적 파일(.확장자), api 제외 전 경로
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
