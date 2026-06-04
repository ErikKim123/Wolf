# @wolf/supabase — 스키마 단일 소스

Supabase(Postgres) 스키마/마이그레이션/RLS/seed 의 단일 소스. (Design §3.3, §4.2, §11.1)

## 마이그레이션 적용 순서

| 파일 | 내용 | 상태 |
|------|------|:----:|
| `migrations/0001_init_tables.sql` | 13개 테이블 + check 제약 | ✅ (module-2) |
| `migrations/0002_indexes_triggers.sql` | 인덱스 + updated_at 트리거 | ✅ (module-2) |
| `migrations/0003_rls_policies.sql` | RLS 정책 + `is_admin()` | ✅ (module-3) |
| `seed.sql` | 시드 데이터 (admin/partner/customer + 카테고리 3 + 상품 3종 + 정산용 주문) | ✅ (module-4) |
| `tests/db/rls.test.sql` | L1 DB/RLS 10 시나리오 (파트너 격리·정산 집계) | ✅ (module-4) |
| `schema.sql` | 확정 스냅샷(마이그레이션 순차 적용 진입점) | ✅ (module-4) |

## 적용 방법 (실제 Supabase)

### 방법 A — Node 러너 (psql 불필요, 권장)
1. Supabase 프로젝트 생성 → 루트 `.env` 에 키 + `DATABASE_URL` 기입 (`.env.example` 참고)
   - `DATABASE_URL` = Settings > Database > Connection string > URI (postgres 직접 연결)
2. `pnpm --filter @wolf/supabase install` (pg 드라이버 설치)
3. `pnpm --filter @wolf/supabase db:verify`
   → migrate(0001~0003) → seed → RLS 11 assert 자동 실행, `PASS/FAIL` 요약 출력
   - 건너뛰기: `SKIP_MIGRATE=1` / `SKIP_SEED=1`

### 방법 B — psql
1. `.env` 에 `DATABASE_URL` 기입
2. `pnpm --filter @wolf/supabase migrate` → `seed` → `test:rls`
   - 핵심 검증: **#4/#5 파트너 격리**, **#7 고객 주문 격리**, **#10 정산 집계(3980 → 수수료 0.15 차감 3383)**

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용. 프런트/깃 노출 금지 (`.gitignore` 처리됨).
> ⚠️ `seed.sql` / `test:rls` 는 RLS 우회가 필요해 **service_role 또는 postgres** 연결로 실행.
