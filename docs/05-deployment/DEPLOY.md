# Wolf 배포 가이드 (Phase 9)

파트너 입점형 마켓플레이스를 **Vercel + Supabase**로 배포하는 절차.

## 1. 구조

pnpm 모노레포 → **Vercel 프로젝트 2개**로 분리 배포 (각각 Next.js 앱).

| 앱 | Root Directory | 용도 | 도메인 예 |
|---|---|---|---|
| `apps/web` | `apps/web` | 고객 쇼핑몰 (`/en` `/ko`) | `wolf.example.com` |
| `apps/admin` | `apps/admin` | 운영자 관리자 | `admin.wolf.example.com` |

> `@wolf/shared`는 node_modules 링크 없이 `tsconfig paths + transpilePackages(externalDir)`로 **소스 직접 참조**한다. Vercel은 repo 전체를 클론하므로 root directory(`apps/web`) 밖의 `packages/shared`도 빌드 시 접근된다.

## 2. 사전 준비 — Supabase (프로덕션 프로젝트)

1. **마이그레이션 적용**: SQL Editor에서 `packages/supabase/migrations/0001~0003` 순서대로 실행
2. **seed**: `packages/supabase/seed.sql` 실행 (관리자/샘플 계정 — 운영 시 실제 계정으로 교체)
3. **Auth → URL Configuration**:
   - Site URL: 고객몰 도메인 (`https://wolf.example.com`)
   - Redirect URLs: 두 도메인 모두 추가
4. **RLS 활성 확인**: 모든 테이블 RLS on (0003에서 처리됨)

## 3. Vercel 배포 (각 앱)

각 앱마다 New Project → 같은 Git repo 선택 → 아래 설정.

**Settings → General**
- Framework Preset: **Next.js**
- Root Directory: `apps/web` (또는 `apps/admin`) — "Include files outside root directory" 켜기
- Install Command: `pnpm install`
- Build Command: `pnpm build` (기본)

**Settings → Environment Variables**

| 변수 | web | admin |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ |
| `NEXT_PUBLIC_SITE_URL` | ✅ (실제 도메인) | — |
| `ANTHROPIC_API_KEY` | — | ✅ (AI 생성 시) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` / `STRIPE_SECRET_KEY` / `PORTONE_API_SECRET` 등 비밀 키는 **절대 `NEXT_PUBLIC_` 접두사 금지**, 클라이언트 코드에서 참조 금지.

## 4. 배포 후 확인

- [ ] `https://<web>/` → `/en` 또는 `/ko` 리다이렉트
- [ ] `https://<web>/sitemap.xml`, `/robots.txt` 정상 (도메인이 `NEXT_PUBLIC_SITE_URL` 기준인지)
- [ ] `https://<admin>/login` → 관리자 로그인 → 대시보드
- [ ] admin에서 상품/배너 추가 → web 반영
- [ ] 고객 회원가입 → 장바구니 → 주문 → 주문내역

## 5. 프로덕션 체크리스트

**보안**
- [ ] RLS 모든 테이블 활성, 정책 검증 (고객은 본인 주문만)
- [ ] service_role/결제/AI 키가 클라이언트 번들에 없는지 (`NEXT_PUBLIC_`만 노출)
- [ ] 보안 헤더 적용 확인 (X-Frame-Options 등 — `next.config.js`)
- [ ] seed 기본 계정(`Wolf!2026`)을 실제 운영 계정으로 교체/삭제

**기능 (키 필요 — 추후)**
- [ ] 결제 연동: `STRIPE_SECRET_KEY` / `PORTONE_API_SECRET`
- [ ] AI 상품생성 실호출: admin `ANTHROPIC_API_KEY`
- [ ] 구독(JNJ/DIV) / 티켓 발권 (결제 의존)

**SEO**
- [ ] `NEXT_PUBLIC_SITE_URL` = 실제 도메인
- [ ] sitemap/OG/canonical 도메인 확인
- [ ] (선택) Search Console 등록, OG 이미지 추가

## 6. 참고 — NAS 로컬 개발 주의

이 repo는 NAS(UNC) 드라이브에 있어 로컬 `pnpm install`이 불안정하다 (symlink/rename 미지원).
`.npmrc`의 `node-linker=hoisted`, `@wolf/shared` 의존성 제거(소스 참조), robocopy 우회를 사용한다.
**Vercel(리눅스)에서는 해당 제약이 없으므로 정상 빌드된다.**
