// Design Ref: §5.4 상품관리 — 대표 이미지(썸네일) 업로드 (Supabase Storage 'product-images')
// 파일 선택 → Storage 업로드 → 공개 URL 을 products.image_url 로 저장
'use client';
import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function ProductImageField({
  value,
  set,
  allValues,
}: {
  value: string | undefined;
  set: (v: string | null) => void;
  allValues: Record<string, unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const id = (allValues.id as string | undefined) ?? 'new';

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith('image/')) {
      setErr('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr('파일 크기는 5MB 이하여야 합니다.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      set(data.publicUrl);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-grey-200 bg-grey-50">
          {value ? (
            // 미리보기 — 관리자 내부 도구라 next/image 대신 img 사용
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="썸네일 미리보기" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={28} className="text-grey-300" aria-hidden />
          )}
        </div>
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? '업로드 중…' : value ? '이미지 변경' : '이미지 업로드'}
            </button>
            {value && (
              <button
                type="button"
                className="btn btn-secondary btn-sm text-danger"
                disabled={busy}
                onClick={() => set(null)}
              >
                제거
              </button>
            )}
          </div>
          <p className="text-xs text-grey-500">JPG·PNG·WebP, 5MB 이하. 정사각형 권장.</p>
        </div>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
