// Design Ref: §10.4 — 다국어 폴백 규약 (누락 시 'en' 폴백)
import { DEFAULT_LOCALE, type I18n, type Locale } from './types/index';

/**
 * I18n 값에서 현재 locale 텍스트를 고른다.
 * 1) 요청 locale → 2) fallback locale → 3) 값이 있는 첫 언어 → 4) ''
 */
export function pickI18n(
  value: I18n | null | undefined,
  locale: Locale,
  fallback: Locale = DEFAULT_LOCALE,
): string {
  if (!value) return '';
  const direct = value[locale];
  if (direct != null && direct !== '') return direct;

  const fb = value[fallback];
  if (fb != null && fb !== '') return fb;

  for (const v of Object.values(value)) {
    if (v != null && v !== '') return v;
  }
  return '';
}

/** locale 문자열을 지원 목록으로 정규화 (미지원 시 기본 locale) */
export function normalizeLocale(input: string | null | undefined): Locale {
  const candidates: Locale[] = ['en', 'ko', 'ja', 'zh-TW'];
  return candidates.find((l) => l === input) ?? DEFAULT_LOCALE;
}
