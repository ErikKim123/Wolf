-- Design Ref: §5.4 상품관리 — 상품 대표 이미지(썸네일) 업로드
-- ⚠️ SQL Editor 에서 0001~0007 적용 후 실행.
-- products.image_url(공개 URL) + Storage 버킷 'product-images'(공개 읽기, 관리자 쓰기)

-- 1) 상품 대표 이미지 URL 컬럼 (Storage 공개 URL 저장)
alter table products add column if not exists image_url text;

-- 2) Storage 버킷 — 공개 읽기 (상품 카드/상세 노출)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 3) Storage RLS — 공개 읽기 + 관리자만 업로드/교체/삭제
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
