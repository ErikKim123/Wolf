// 무설치 리치 에디터(WYSIWYG) — contentEditable + 툴바. 값은 HTML 문자열(I18n)로 저장.
// 보이는 그대로가 고객 페이지에 렌더됨. 기존 sanitize/prose 스타일과 그대로 호환.
// 의존성 추가 없음(NAS 설치 이슈 회피). document.execCommand 기반(레거시지만 전 브라우저 지원).
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold, Italic, Heading2, Heading3, Pilcrow, List, ListOrdered,
  Link2, Image as ImageIcon, Eraser, Loader2,
} from 'lucide-react';
import type { I18n, Locale } from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024;

// ── 단일 로케일 리치 에디터 ───────────────────────────────────
export function RichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastEmitted = useRef<string>(value);
  const [busy, setBusy] = useState(false);

  // 최초 1회 주입
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value || '';
      lastEmitted.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 외부 값 변경(로케일 전환/AI 생성) 시에만 DOM 동기화 → 입력 중 커서 점프 방지
  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastEmitted.current) {
      ref.current.innerHTML = value || '';
      lastEmitted.current = value;
    }
  }, [value]);

  const isEmpty = useMemo(() => {
    const v = value || '';
    if (/<img/i.test(v)) return false;
    return v.replace(/<[^>]*>/g, '').replace(/ /g, ' ').trim().length === 0;
  }, [value]);

  function emit() {
    const html = ref.current?.innerHTML ?? '';
    lastEmitted.current = html;
    onChange(html);
  }
  function saveSel() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }
  function restoreSel() {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }
  // 툴바 버튼: onMouseDown preventDefault 로 에디터 선택영역 유지
  function run(cmd: string, val?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  }
  function addLink() {
    const url = window.prompt('링크 URL 을 입력하세요', 'https://');
    if (!url) return;
    run('createLink', url);
  }
  function insertImageUrl() {
    const url = window.prompt('이미지 URL 을 입력하세요', 'https://');
    if (!url) return;
    run('insertImage', url);
  }
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
      window.alert('이미지 파일(5MB 이하)만 업로드할 수 있습니다.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `event-content/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: true, contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      ref.current?.focus();
      restoreSel();
      document.execCommand('insertImage', false, data.publicUrl);
      emit();
    } catch (ex) {
      window.alert(ex instanceof Error ? ex.message : '업로드 실패');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="rounded-lg border border-grey-200">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-grey-100 bg-grey-50 px-1.5 py-1">
        <Tb onClick={() => run('bold')} title="굵게"><Bold size={15} /></Tb>
        <Tb onClick={() => run('italic')} title="기울임"><Italic size={15} /></Tb>
        <Sep />
        <Tb onClick={() => run('formatBlock', '<h2>')} title="제목"><Heading2 size={15} /></Tb>
        <Tb onClick={() => run('formatBlock', '<h3>')} title="소제목"><Heading3 size={15} /></Tb>
        <Tb onClick={() => run('formatBlock', '<p>')} title="본문"><Pilcrow size={15} /></Tb>
        <Sep />
        <Tb onClick={() => run('insertUnorderedList')} title="목록"><List size={15} /></Tb>
        <Tb onClick={() => run('insertOrderedList')} title="번호 목록"><ListOrdered size={15} /></Tb>
        <Sep />
        <Tb onClick={addLink} title="링크"><Link2 size={15} /></Tb>
        <Tb onMouseDownExtra={saveSel} onClick={() => fileRef.current?.click()} title="이미지 업로드">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
        </Tb>
        <Tb onClick={insertImageUrl} title="이미지 URL">URL</Tb>
        <Sep />
        <Tb onClick={() => run('removeFormat')} title="서식 지우기"><Eraser size={15} /></Tb>
      </div>

      {/* 편집 영역 */}
      <div className="relative">
        {isEmpty && (
          <p className="pointer-events-none absolute left-3 top-3 text-sm text-grey-400">
            {placeholder ?? '여기에 내용을 작성하세요. 보이는 그대로 고객 페이지에 표시됩니다.'}
          </p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={() => { saveSel(); emit(); }}
          onKeyUp={saveSel}
          onMouseUp={saveSel}
          className="min-h-32 max-h-[28rem] overflow-y-auto p-3 text-sm leading-relaxed text-grey-800 focus:outline-none [&_a]:text-info [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-grey-300 [&_blockquote]:pl-3 [&_blockquote]:text-grey-600 [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
    </div>
  );
}

function Tb({
  children, onClick, title, onMouseDownExtra,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  onMouseDownExtra?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      // 에디터 선택영역 유지: 클릭 시 포커스 이동 방지
      onMouseDown={(e) => { e.preventDefault(); onMouseDownExtra?.(); }}
      onClick={onClick}
      className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold text-grey-600 transition-colors hover:bg-grey-200 hover:text-black"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-grey-200" />;
}

// ── 다국어(I18n) 탭 래퍼 ──────────────────────────────────────
const ALL_TABS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'ko', label: 'KO' },
  { locale: 'ja', label: 'JA' },
  { locale: 'zh-TW', label: 'TW' },
];

export function RichEditorI18n({
  label,
  value,
  onChange,
  locales = ['en', 'ko'],
}: {
  label: string;
  value: I18n;
  onChange: (next: I18n) => void;
  locales?: Locale[];
}) {
  const tabs = ALL_TABS.filter((t) => locales.includes(t.locale));
  const [active, setActive] = useState<Locale>(locales[0] ?? 'en');

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="label-caps">{label}</label>
        <div className="flex gap-1">
          {tabs.map(({ locale, label }) => (
            <button key={locale} type="button" onClick={() => setActive(locale)}
              className={cn('rounded-pill px-2.5 py-0.5 text-[11px] font-medium uppercase transition-colors',
                active === locale ? 'bg-black text-white' : 'bg-grey-100 text-grey-500')}>
              {label}{value[locale]?.trim() ? ' ●' : ''}
            </button>
          ))}
        </div>
      </div>
      <RichEditor
        key={active}
        value={value[active] ?? ''}
        onChange={(html) => onChange({ ...value, [active]: html })}
      />
      {active !== 'en' && !value.en?.trim() && (
        <p className="text-[11px] text-grey-400">EN 값이 비어 있으면 폴백이 동작하지 않습니다.</p>
      )}
    </div>
  );
}
