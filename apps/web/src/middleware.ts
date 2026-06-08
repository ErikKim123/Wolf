// Design Ref: §6 — locale 라우팅. /경로 에 활성 locale 없으면 기본 locale(en)로 리다이렉트.
// 기본 언어는 항상 defaultLocale(en). 브라우저 언어 자동감지는 하지 않음(사용자가 KO 로 전환).
import { NextResponse, type NextRequest } from 'next/server';
import { activeLocales, defaultLocale } from '@/i18n/config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = activeLocales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, 정적 파일(.확장자), api 제외 전 경로
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
