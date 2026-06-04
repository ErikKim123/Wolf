-- Design Ref: §4.4 / §11.2 — Phase 0 스키마 확정 스냅샷 (버전 관리용 단일 진입점)
-- Plan SC: "확정 스키마를 schema.sql 로 저장해 버전 관리"
--
-- 이 파일은 마이그레이션을 순서대로 적용하는 캐노니컬 진입점이다.
-- psql 사용 시:
--   psql "$DATABASE_URL" -f packages/supabase/schema.sql
--
-- (선택) 실제 DB 적용 후 정규 스냅샷으로 교체하려면:
--   pg_dump --schema-only --no-owner "$DATABASE_URL" > packages/supabase/schema.sql

\i migrations/0001_init_tables.sql
\i migrations/0002_indexes_triggers.sql
\i migrations/0003_rls_policies.sql

-- 이후 시드/검증:
--   \i seed.sql
--   \i tests/db/rls.test.sql
