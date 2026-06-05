// Design Ref: 이벤트 본문 상단 미디어 갤러리 — 유튜브/인스타/동영상/이미지 자동 렌더.
// 보안: resolveMedia 가 신뢰 도메인 임베드 주소만 생성(임의 iframe src 차단).
import { resolveMedia } from '@wolf/shared';

export function MediaGallery({ items }: { items?: string[] }) {
  const list = (items ?? []).filter((u) => u && u.trim());
  if (list.length === 0) return null;

  return (
    <div className="space-y-4">
      {list.map((url, i) => {
        const m = resolveMedia(url);
        if (m.kind === 'youtube') {
          return (
            <div key={i} className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                src={m.src}
                className="h-full w-full"
                title={`media-${i}`}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          );
        }
        if (m.kind === 'instagram') {
          return (
            <div
              key={i}
              className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-grey-200"
            >
              <iframe
                src={m.src}
                className="h-[680px] w-full"
                title={`media-${i}`}
                loading="lazy"
                scrolling="no"
              />
            </div>
          );
        }
        if (m.kind === 'video') {
          return (
            <video key={i} src={m.src} controls className="w-full rounded-xl bg-black" preload="metadata" />
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={m.src} alt="" className="w-full rounded-xl" loading="lazy" />
        );
      })}
    </div>
  );
}
