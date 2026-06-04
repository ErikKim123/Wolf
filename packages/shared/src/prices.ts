// Design Ref: §10.4 — 금액은 통화별 최소단위 정수, prices jsonb
import {
  DEFAULT_CURRENCY,
  type Currency,
  type Prices,
} from './types/index';

/** 통화별 소수 자릿수 (USD=2 → 센트, KRW=0 → 원) */
const FRACTION_DIGITS: Record<Currency, number> = {
  USD: 2,
  KRW: 0,
};

/**
 * prices jsonb 에서 해당 통화 금액(최소단위 정수)을 고른다.
 * 요청 통화가 없으면 기본 통화 → 값이 있는 첫 통화 순으로 폴백. 없으면 null.
 */
export function pickPrice(
  prices: Prices | null | undefined,
  currency: Currency,
  fallback: Currency = DEFAULT_CURRENCY,
): number | null {
  if (!prices) return null;
  if (prices[currency] != null) return prices[currency]!;
  if (prices[fallback] != null) return prices[fallback]!;
  for (const v of Object.values(prices)) {
    if (v != null) return v;
  }
  return null;
}

/** 최소단위 정수 → 표시 단위 숫자 (예: USD 1990 → 19.9) */
export function toDisplayAmount(minorUnits: number, currency: Currency): number {
  return minorUnits / 10 ** FRACTION_DIGITS[currency];
}

/** Intl 기반 통화 포맷 (예: USD 1990 → "$19.90", KRW 2900000 → "₩2,900,000") */
export function formatPrice(
  prices: Prices | null | undefined,
  currency: Currency,
  locale = 'en-US',
): string {
  const minor = pickPrice(prices, currency);
  if (minor == null) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: FRACTION_DIGITS[currency],
  }).format(toDisplayAmount(minor, currency));
}
