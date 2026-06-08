// 일회성: Shop(실물) 데모용 샘플 상품 8건 시드 (code WOLF-PD-001~008). 멱등(delete 후 insert).
// 썸네일(image_url)은 안정적 placeholder(picsum seed) 사용 → 별도 업로드 없이 카드/상세에 표시.
// 가격: USD=센트(2자리), KRW=원(0자리). seller=partner(정산검증)/admin(자사) 혼합.
// 실행:  node packages/supabase/seed_products_sample.mjs   (DATABASE_URL 은 .env 에서 로드)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import pg from 'pg';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
function loadEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let [, k, v] = m;
    v = v.replace(/^["']|["']$/g, '');
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const ADMIN = '00000000-0000-0000-0000-000000000001'; // 자사
const PARTNER = '00000000-0000-0000-0000-000000000002'; // 파트너
const CAT_APPAREL = '00000000-0000-0000-0000-0000000000c1';
const CAT_TOPS = '00000000-0000-0000-0000-0000000000c2';

// 썸네일: 안정적 placeholder (picsum seed, 정사각형)
const img = (seed) => `https://picsum.photos/seed/${seed}/800/800`;

const PRODUCTS = [
  {
    code: 'WOLF-PD-001',
    name: { en: 'Wolf Heavy Hoodie', ko: '울프 헤비 후디' },
    prices: { USD: 5900, KRW: 79000 },
    seller: PARTNER, partner: true, category: CAT_TOPS,
    attributes: { size: ['S', 'M', 'L', 'XL'], color: ['Black', 'Grey'] },
  },
  {
    code: 'WOLF-PD-002',
    name: { en: 'Wolf Logo Cap', ko: '울프 로고 캡' },
    prices: { USD: 2500, KRW: 33000 },
    seller: PARTNER, partner: true, category: CAT_APPAREL,
    attributes: { size: ['Free'], color: ['Black', 'Beige'] },
  },
  {
    code: 'WOLF-PD-003',
    name: { en: 'Wolf Canvas Tote Bag', ko: '울프 캔버스 토트백' },
    prices: { USD: 1800, KRW: 24000 },
    seller: ADMIN, partner: false, category: CAT_APPAREL,
    attributes: { material: 'Cotton canvas' },
  },
  {
    code: 'WOLF-PD-004',
    name: { en: 'Wolf Knit Beanie', ko: '울프 니트 비니' },
    prices: { USD: 2200, KRW: 29000 },
    seller: PARTNER, partner: true, category: CAT_APPAREL,
    attributes: { size: ['Free'], color: ['Charcoal', 'Ivory'] },
  },
  {
    code: 'WOLF-PD-005',
    name: { en: 'Wolf Crew Socks (3-pack)', ko: '울프 크루삭스 (3팩)' },
    prices: { USD: 1500, KRW: 19000 },
    seller: ADMIN, partner: false, category: CAT_APPAREL,
    attributes: { size: ['M', 'L'] },
  },
  {
    code: 'WOLF-PD-006',
    name: { en: 'Wolf Ceramic Mug', ko: '울프 세라믹 머그' },
    prices: { USD: 1400, KRW: 18000 },
    seller: ADMIN, partner: false, category: null,
    attributes: { capacity: '350ml' },
  },
  {
    code: 'WOLF-PD-007',
    name: { en: 'Wolf Crewneck Sweatshirt', ko: '울프 크루넥 스웨트셔츠' },
    prices: { USD: 4900, KRW: 65000 },
    seller: PARTNER, partner: true, category: CAT_TOPS,
    attributes: { size: ['S', 'M', 'L', 'XL'], color: ['Oatmeal', 'Navy'] },
  },
  {
    code: 'WOLF-PD-008',
    name: { en: 'Wolf Sticker Pack', ko: '울프 스티커 팩' },
    prices: { USD: 800, KRW: 9000 },
    seller: ADMIN, partner: false, category: null,
    attributes: { count: 8 },
  },
];

// 기존 seed.sql 샘플 상품(코드 기준)에도 썸네일 채움
const EXISTING_IMAGES = ['WOLF-TS-001', 'WOLF-TK-001', 'WOLF-SUB-JNJ'];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 미설정 (.env 확인)');
  await client.connect();

  // image_url 컬럼 보장 (0008 마이그레이션 미적용 환경 대비, 멱등)
  await client.query(`alter table products add column if not exists image_url text`);

  // 멱등: 데모 상품 재시드
  await client.query(`delete from products where code like 'WOLF-PD-%'`);
  let n = 0;
  for (const p of PRODUCTS) {
    await client.query(
      `insert into products
         (code, seller_id, is_partner_product, product_type, category_id,
          name_i18n, prices, attributes, image_url, status)
       values ($1,$2,$3,'physical',$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,'active')`,
      [
        p.code, p.seller, p.partner, p.category,
        JSON.stringify(p.name), JSON.stringify(p.prices),
        JSON.stringify(p.attributes ?? {}), img(p.code.toLowerCase()),
      ],
    );
    n++;
  }

  // 기존 샘플 상품 썸네일 채우기 (있을 때만)
  let u = 0;
  for (const code of EXISTING_IMAGES) {
    const r = await client.query(
      `update products set image_url = $2 where code = $1 and (image_url is null or image_url = '')`,
      [code, img(code.toLowerCase())],
    );
    u += r.rowCount ?? 0;
  }

  console.log(`✅ 샘플 실물 상품 ${n}건 시드 완료 (WOLF-PD-001~${String(n).padStart(3, '0')}), 기존 상품 썸네일 ${u}건 보강`);
}
main()
  .catch((e) => {
    console.error('💥', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
