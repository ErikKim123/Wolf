// Design Ref: §5 Phase 3 — 상품 상세 HTML 에디터 (직접 작성 우선) + AI 초안 생성(보조) + 번역
'use client';
import { useState } from 'react';
import { Sparkles, Languages, Loader2, ChevronDown, ChevronUp, Code } from 'lucide-react';
import { pickI18n, type I18n, type Locale } from '@wolf/shared';
import { sanitizeHtml } from '@/lib/sanitize';

const LOCALES: Locale[] = ['en', 'ko', 'ja', 'zh-TW'];
const LABEL: Record<string, string> = { en: 'EN', ko: 'KO', ja: 'JA', 'zh-TW': 'TW' };

// 에디터 빠른 삽입 스니펫 (끝에 append)
const SNIPPETS: { label: string; html: string }[] = [
  { label: '제목', html: '\n<h2>제목</h2>' },
  { label: '단락', html: '\n<p>내용을 입력하세요.</p>' },
  { label: '목록', html: '\n<ul>\n  <li>항목 1</li>\n  <li>항목 2</li>\n</ul>' },
  { label: '이미지', html: '\n<img src="https://" alt="" />' },
];

export function AiProductGenerator({
  value,
  set,
  allValues,
}: {
  value: I18n | undefined;
  set: (v: I18n) => void;
  allValues: Record<string, unknown>;
}) {
  const html: I18n = value ?? {};
  const [tab, setTab] = useState<Locale>('en');
  const [showAi, setShowAi] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [features, setFeatures] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameI18n = allValues.name_i18n as I18n | undefined;
  const productName = pickI18n(nameI18n, 'en') || pickI18n(nameI18n, 'ko');

  function setLang(locale: Locale, h: string) {
    set({ ...html, [locale]: h });
  }
  function append(snippet: string) {
    setLang(tab, (html[tab] ?? '') + snippet);
  }

  async function generate() {
    setError(null);
    if (!productName) {
      setError('먼저 위에서 상품명을 입력하세요.');
      return;
    }
    setLoading('generate');
    try {
      const res = await fetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          keywords,
          features: features.split('\n').map((s) => s.trim()).filter(Boolean),
          imageUrls: imageUrls.split('\n').map((s) => s.trim()).filter(Boolean),
          productId: (allValues.id as string) ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '생성 실패');
      setLang('en', data.html);
      setTab('en');
      setShowAi(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '생성 실패');
    } finally {
      setLoading(null);
    }
  }

  async function translate(target: Locale) {
    setError(null);
    if (!html.en) {
      setError('먼저 영어(EN) 상세를 작성하거나 생성하세요.');
      return;
    }
    setLoading(target);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ html: html.en, targetLocale: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '번역 실패');
      setLang(target, data.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-grey-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code size={16} />
          <span className="label-caps">상세 페이지 (HTML 에디터)</span>
        </div>
        {/* AI 초안 생성: 접이식 보조 도구 */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowAi((v) => !v)}
        >
          <Sparkles size={14} /> AI 초안 {showAi ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* AI 생성 패널 (접이식) */}
      {showAi && (
        <div className="space-y-2 rounded-lg bg-grey-50 p-3">
          <p className="text-xs text-grey-500">
            상품명·키워드·특징을 입력하면 AI가 영어 초안 HTML 을 만들어 에디터에 채웁니다.
          </p>
          <input
            className="input"
            placeholder="핵심 키워드 (쉼표로 구분)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <textarea
            className="input min-h-16"
            placeholder="특징 (한 줄에 하나)"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />
          <textarea
            className="input min-h-12"
            placeholder="이미지 URL (한 줄에 하나, 선택)"
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={generate}
            disabled={loading !== null}
          >
            {loading === 'generate' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            영어(EN) 초안 생성
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* 언어 탭 */}
      <div className="flex items-center justify-between border-b border-grey-200">
        <div className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setTab(l)}
              className={`px-3 py-1.5 text-sm ${
                tab === l ? 'border-b-2 border-black font-medium' : 'text-grey-500'
              }`}
            >
              {LABEL[l]} {html[l] ? '●' : ''}
            </button>
          ))}
        </div>
        {tab !== 'en' && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-grey-500 hover:text-black"
            onClick={() => translate(tab)}
            disabled={loading !== null}
          >
            {loading === tab ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Languages size={14} />
            )}
            EN→{LABEL[tab]} 번역
          </button>
        )}
      </div>

      {/* 빠른 삽입 도구 */}
      <div className="flex flex-wrap gap-1.5">
        {SNIPPETS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => append(s.html)}
            className="rounded-pill border border-grey-300 px-3 py-1 text-xs text-grey-600 hover:border-black hover:text-black"
          >
            + {s.label}
          </button>
        ))}
      </div>

      {/* HTML 에디터 (직접 작성) */}
      <textarea
        className="input min-h-48 font-mono text-xs"
        value={html[tab] ?? ''}
        onChange={(e) => setLang(tab, e.target.value)}
        placeholder={`<h2>제목</h2>\n<p>상품 설명을 HTML 로 직접 작성하거나 위 'AI 초안'으로 생성하세요.</p>\n\n저장하면 고객 상품 상세 페이지에 그대로 표시됩니다.`}
      />

      {/* 라이브 미리보기 (항상) */}
      <div className="rounded-lg border border-grey-200 p-3">
        <p className="label-caps mb-2 text-grey-400">미리보기 ({LABEL[tab]})</p>
        {html[tab] ? (
          <div
            className="text-sm text-grey-800 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:uppercase [&_img]:my-2 [&_img]:rounded [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html[tab]) }}
          />
        ) : (
          <p className="text-xs text-grey-400">에디터에 입력하면 여기에 미리보기가 표시됩니다.</p>
        )}
      </div>
    </div>
  );
}
