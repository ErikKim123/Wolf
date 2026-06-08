// Design Ref: §5 Phase 4 — 결제 프로바이더 선택 (locale → PG) + 설정 여부 판정
// en/USD → Stripe, ko/KRW → PortOne. (ja/zh-TW 는 Phase 1 비활성 → en 기준 Stripe 폴백)
import type { Locale } from '@wolf/shared';

export type Provider = 'stripe' | 'portone';

/** locale 로 PG 결정. ko 만 PortOne, 그 외(en 포함)는 Stripe. */
export function providerForLocale(locale: Locale): Provider {
  return locale === 'ko' ? 'portone' : 'stripe';
}

/** 서버에서만 의미 있는 값(시크릿 존재 여부). 클라이언트에선 false 로 인라인됨. */
export function isProviderConfigured(provider: Provider): boolean {
  if (provider === 'stripe') {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }
  return Boolean(
    process.env.PORTONE_API_SECRET &&
      process.env.NEXT_PUBLIC_PORTONE_STORE_ID &&
      process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY,
  );
}

/** 브라우저 노출 가능한 PortOne 공개 식별자 (NEXT_PUBLIC_*). */
export const portonePublic = {
  storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? '',
  channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? '',
};

/** 결제 후 복귀 기준 URL. 배포 도메인 우선, 없으면 요청 origin 사용. */
export function siteOrigin(reqOrigin?: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL || reqOrigin || 'http://localhost:3000';
}
