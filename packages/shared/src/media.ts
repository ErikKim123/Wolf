// Design Ref: 이벤트 미디어 — URL 하나로 유튜브/인스타/동영상/이미지를 자동 판별.
// 보안: 외부 URL 을 그대로 iframe src 에 넣지 않고, id 만 추출해 신뢰 도메인 임베드 주소를 생성한다.

export type MediaKind = 'youtube' | 'instagram' | 'video' | 'image';

export interface ResolvedMedia {
  kind: MediaKind;
  /** 렌더용 주소 (youtube/instagram=임베드 URL, video/image=원본 URL) */
  src: string;
  id?: string;
}

const YT = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|live\/))([A-Za-z0-9_-]{11})/;
const IG = /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i;

/**
 * 미디어 URL 을 종류별로 해석한다.
 * 판별 순서: youtube → instagram → 동영상 확장자 → 이미지 확장자 → (확장자 없으면) 이미지로 가정.
 */
export function resolveMedia(rawUrl: string): ResolvedMedia {
  const url = (rawUrl ?? '').trim();

  const yt = url.match(YT);
  if (yt) {
    return { kind: 'youtube', id: yt[1], src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  }

  const ig = url.match(IG);
  if (ig) {
    // 신뢰 도메인 + 추출한 코드만 사용 (임의 iframe src 주입 차단)
    return { kind: 'instagram', id: ig[2], src: `https://www.instagram.com/${ig[1]}/${ig[2]}/embed` };
  }

  if (VIDEO_EXT.test(url)) return { kind: 'video', src: url };
  if (IMAGE_EXT.test(url)) return { kind: 'image', src: url };

  // 확장자 없는 이미지 호스트(picsum 등) → 이미지로 가정
  return { kind: 'image', src: url };
}

/** admin 입력 뱃지용 라벨 (한국어) */
export const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  youtube: '유튜브',
  instagram: '인스타그램',
  video: '동영상',
  image: '이미지',
};
