// 서버 전용 postgres 직접 연결 (파트너 계정 생성처럼 auth.users 까지 만져야 하는
// 권한 상승 작업에만 사용). 라우트에서 반드시 admin 세션을 먼저 검증할 것.
// DATABASE_URL 은 apps/admin/.env.local 에 (서버 전용, NEXT_PUBLIC_ 금지).
import pg, { type Client } from 'pg';

export async function withPg<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL 이 설정되지 않았습니다 (apps/admin/.env.local).');
  }
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
