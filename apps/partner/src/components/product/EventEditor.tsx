// Design Ref: 티켓 이벤트 페이지 템플릿 — 입력형 콘텐츠 에디터(EventContent). en/ko.
// 편집 시 목록 쿼리에 event_content 가 없으므로 id 로 직접 fetch 해 기존 값을 채운다.
'use client';
import { useEffect, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  EVENT_SECTION_KEYS,
  resolveMedia,
  MEDIA_KIND_LABEL,
  type EventContent,
  type EventSectionKey,
  type I18n,
} from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import { I18nField } from '@/components/form/I18nField';

const SECTION_LABEL: Record<EventSectionKey, string> = {
  about: '행사 소개',
  venue: '행사 장소',
  notice: '공지/안내',
  contact: '문의 하기',
  channel: '채널 정보',
  recommend: '추천',
  refund: '취소/환불',
};

export function EventEditor({
  value,
  set,
  allValues,
}: {
  value: EventContent | undefined;
  set: (v: EventContent) => void;
  allValues: Record<string, unknown>;
}) {
  const ev: EventContent = value ?? {};
  const productType = allValues.product_type as string | undefined;
  const id = allValues.id as string | undefined;
  const fetchedRef = useRef(false);
  const [loading, setLoading] = useState(false);

  // 편집 진입 시 기존 event_content 로드 (목록 쿼리에 미포함)
  useEffect(() => {
    if (fetchedRef.current || value !== undefined || !id) return;
    fetchedRef.current = true;
    setLoading(true);
    createClient()
      .from('products')
      .select('event_content')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.event_content) set(data.event_content as EventContent);
      })
      .then(undefined, () => {})
      .then(() => setLoading(false));
  }, [id, value, set]);

  const patch = (p: Partial<EventContent>) => set({ ...ev, ...p });
  const setSection = (key: EventSectionKey, v: I18n) =>
    set({ ...ev, sections: { ...ev.sections, [key]: v } });

  // 미디어(언어공통 URL 배열)
  const media = ev.media ?? [];
  const setMedia = (m: string[]) => patch({ media: m });
  const moveMedia = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const n = [...media];
    const a = n[i];
    const b = n[j];
    if (a === undefined || b === undefined) return;
    n[i] = b;
    n[j] = a;
    setMedia(n);
  };

  if (productType && productType !== 'ticket') {
    return (
      <p className="rounded-lg bg-grey-50 p-3 text-xs text-grey-500">
        이벤트 페이지 콘텐츠는 <strong>티켓</strong> 타입 상품에만 적용됩니다. 타입을 ‘티켓’으로 변경하세요.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-grey-200 p-4">
      <div className="flex items-center gap-2">
        <CalendarClock size={16} />
        <span className="label-caps">이벤트 페이지 콘텐츠 (티켓)</span>
        {loading && <span className="text-xs text-grey-400">불러오는 중…</span>}
      </div>

      <I18nField label="배너 이미지 URL" value={ev.banner ?? {}} onChange={(v) => patch({ banner: v })} />
      <I18nField label="상단 배지" value={ev.badge ?? {}} onChange={(v) => patch({ badge: v })} />
      <I18nField label="부제" value={ev.subtitle ?? {}} onChange={(v) => patch({ subtitle: v })} />
      <I18nField label="장소" value={ev.location ?? {}} onChange={(v) => patch({ location: v })} />
      <I18nField
        label="비용 표기 (비우면 상품가/무료 자동)"
        value={ev.priceText ?? {}}
        onChange={(v) => patch({ priceText: v })}
      />

      {/* 일시 / 신청 기간 */}
      <div className="grid grid-cols-2 gap-3">
        <DateTime label="일시 시작" value={ev.startAt} onChange={(v) => patch({ startAt: v })} />
        <DateTime label="일시 종료" value={ev.endAt} onChange={(v) => patch({ endAt: v })} />
        <DateTime label="신청 시작" value={ev.applyStart} onChange={(v) => patch({ applyStart: v })} />
        <DateTime label="신청 종료" value={ev.applyEnd} onChange={(v) => patch({ applyEnd: v })} />
      </div>

      {/* 미디어 (언어공통) — 본문 상단 갤러리 */}
      <div className="space-y-2 border-t border-grey-100 pt-4">
        <span className="label-caps">미디어 (유튜브·인스타·이미지·동영상 URL)</span>
        <p className="text-xs text-grey-500">
          URL 을 붙여넣으면 종류를 자동 인식해 본문 상단에 순서대로 표시합니다. 여러 개 추가할 수 있습니다.
          인스타그램은 공개 게시물만 표시됩니다.
        </p>
        {media.map((url, i) => {
          const kind = url.trim() ? resolveMedia(url).kind : null;
          return (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input flex-1"
                value={url}
                placeholder="https://youtu.be/… , https://instagram.com/p/… , https://…/image.jpg"
                onChange={(e) => {
                  const n = [...media];
                  n[i] = e.target.value;
                  setMedia(n);
                }}
              />
              {kind && (
                <span className="shrink-0 rounded-pill bg-grey-100 px-2 py-1 text-xs text-grey-600">
                  {MEDIA_KIND_LABEL[kind]}
                </span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === 0}
                onClick={() => moveMedia(i, -1)}>
                ↑
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === media.length - 1}
                onClick={() => moveMedia(i, 1)}>
                ↓
              </button>
              <button type="button" className="btn btn-secondary btn-sm text-danger"
                onClick={() => setMedia(media.filter((_, j) => j !== i))}>
                삭제
              </button>
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMedia([...media, ''])}>
          + URL 추가
        </button>
      </div>

      {/* 섹션별 i18n HTML */}
      <div className="space-y-4 border-t border-grey-100 pt-4">
        <p className="text-xs text-grey-500">
          각 섹션은 HTML 로 입력합니다(이미지·목록·서식 가능). 내용이 있는 섹션만 고객 페이지 메뉴/본문에 노출됩니다.
        </p>
        {EVENT_SECTION_KEYS.map((key) => (
          <I18nField
            key={key}
            label={`섹션 — ${SECTION_LABEL[key]} (HTML)`}
            value={ev.sections?.[key] ?? {}}
            onChange={(v) => setSection(key, v)}
            multiline
          />
        ))}
      </div>
    </div>
  );
}

function DateTime({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label-caps">{label}</label>
      <input
        type="datetime-local"
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
