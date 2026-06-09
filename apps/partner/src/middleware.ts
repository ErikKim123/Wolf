// Design Ref: §4.2 — 세션 라우트 가드 (1차 방어). role 체크는 (dashboard)/layout 에서.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PARTNER_AUTH_COOKIE } from '@/lib/supabase/cookie';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경변수 누락 시 가드 스킵 (500/MIDDLEWARE_INVOCATION_FAILED 방지).
  // 로그인 페이지는 떠야 사용자가 설정 누락을 인지할 수 있다.
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      // admin/web 과 세션이 섞이지 않도록 전용 쿠키명 사용
      cookieOptions: { name: PARTNER_AUTH_COOKIE },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;
    const isLogin = pathname.startsWith('/login');

    // 미인증 + 보호 경로 → 로그인
    if (!user && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // 인증됨 + 로그인 페이지 → 대시보드
    // 단, ?error 가 붙은 경우(예: layout 의 role 가드가 forbidden 으로 되돌림)는
    // 그대로 /login 을 렌더해 안내 메시지를 보여준다. 안 그러면 layout↔middleware
    // 가 무한 리다이렉트(ERR_TOO_MANY_REDIRECTS)에 빠진다.
    if (user && isLogin && !request.nextUrl.searchParams.has('error')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return response;
  } catch {
    // 세션 조회 실패해도 페이지는 렌더 (가드는 (dashboard)/layout 에서 2차 방어)
    return NextResponse.next();
  }
}

export const config = {
  // 정적 파일/이미지 + API(route 자체 가드) 제외
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
