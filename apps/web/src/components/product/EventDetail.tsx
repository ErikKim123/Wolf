// Design Ref: 티켓 = 이벤트 페이지 템플릿 (히어로 + 스티키 앵커 메뉴 + 일시/신청/비용/장소 + 섹션). i18n.
'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, MapPin } from 'lucide-react';
import {
  EVENT_SECTION_KEYS,
  pickI18n,
  formatPrice,
  formatEventAddress,
  type EventSectionKey,
  type Locale,
} from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import { sanitizeHtml } from '@/lib/sanitize';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { MediaGallery } from '@/components/product/MediaGallery';
import type { ProductDetail as Product } from '@/lib/queries/product';
import type { Dictionary } from '@/i18n/dictionaries';

export function EventDetail({
  product,
  locale,
  dict,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
}) {
  const ev = product.event_content ?? {};
  const name = pickI18n(product.name_i18n, locale) || '—';
  const banner = pickI18n(ev.banner, locale);
  const badge = pickI18n(ev.badge, locale);
  const subtitle = pickI18n(ev.subtitle, locale);
  // 장소: 자유 텍스트(location) 우선, 없으면 구조화 주소(address) 한 줄 표기 — 마법사 신규 행사패스 호환
  const location = pickI18n(ev.location, locale) || formatEventAddress(ev.address);
  const intl = intlLocale(locale);
  const soldout = product.status === 'soldout';

  // 콘텐츠가 있는 섹션만 (메뉴 = 섹션 순서)
  const sections = useMemo(
    () =>
      EVENT_SECTION_KEYS.map((key) => ({
        key,
        label: (dict.event.menu as Record<string, string>)[key] ?? key,
        html: sanitizeHtml(pickI18n(ev.sections?.[key as EventSectionKey], locale)),
      })).filter((s) => s.html.trim().length > 0),
    [ev.sections, locale, dict],
  );

  // datetime-local(TZ 없음)은 KST 절대시각으로 고정 → 서버=클라 일치 (hydration 안전)
  const toKstDate = (iso: string) => new Date(/[+Z]/.test(iso) ? iso : `${iso}+09:00`);

  // 일시/신청 텍스트 (24시간제 + KST 고정으로 PM/오후 불일치 제거)
  const fmtDateTime = (iso?: string) => {
    if (!iso) return '';
    const d = toKstDate(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(intl, {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul',
    }).format(d);
  };
  const dateText = ev.startAt
    ? `${fmtDateTime(ev.startAt)}${ev.endAt ? ` ~ ${fmtDateTime(ev.endAt)}` : ''}`
    : '';
  const periodText =
    ev.applyStart || ev.applyEnd
      ? `${fmtDateTime(ev.applyStart)} ~ ${fmtDateTime(ev.applyEnd)}`
      : '';

  // 신청 기간 열림/마감
  const now = new Date();
  const applyOpen =
    !soldout &&
    (!ev.applyStart || toKstDate(ev.applyStart) <= now) &&
    (!ev.applyEnd || toKstDate(ev.applyEnd) >= now);

  // 비용: priceText 우선, 없으면 상품가(0이면 무료)
  const priceText = pickI18n(ev.priceText, locale);
  const currency = currencyForLocale(locale);
  const priceMinor = product.prices?.[currency] ?? 0;
  const costText = priceText || (priceMinor > 0 ? formatPrice(product.prices, currency, intl) : dict.event.free);

  // 구글 캘린더 링크
  const calUrl = useMemo(() => {
    if (!ev.startAt) return null;
    const toCal = (iso?: string) => {
      const d = iso ? toKstDate(iso) : null;
      if (!d || Number.isNaN(d.getTime())) return '';
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    const start = toCal(ev.startAt);
    const end = toCal(ev.endAt) || start;
    if (!start) return null;
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: name,
      dates: `${start}/${end}`,
      details: subtitle || '',
      location: location || '',
    });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }, [ev.startAt, ev.endAt, name, subtitle, location]);

  // 스크롤스파이 (현재 보이는 섹션 강조)
  const [active, setActive] = useState<string>(sections[0]?.key ?? '');
  useEffect(() => {
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.key);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  const cartItem = {
    id: product.id,
    name_i18n: product.name_i18n,
    prices: product.prices,
    seller_id: product.seller_id,
    is_partner_product: product.is_partner_product,
    product_type: product.product_type,
  };

  return (
    <article className="scroll-smooth pb-24 md:pb-0">
      {/* 히어로 배너 */}
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-grey-900 via-black to-grey-900 text-white">
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 -z-10 bg-black/40" />
        <div className="container-wolf flex flex-col items-center gap-4 py-16 text-center md:py-24">
          {badge && (
            <span className="rounded-pill bg-primary/90 px-4 py-1.5 text-sm font-semibold text-white">
              {badge}
            </span>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">{name}</h1>
          {subtitle && <p className="max-w-2xl text-base text-white/80 md:text-lg">{subtitle}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/90">
            {dateText && <span>🗓 {dateText}</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {location}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 스티키 앵커 메뉴 (중간 메뉴) */}
      {sections.length > 0 && (
        <nav className="sticky top-0 z-30 border-b border-grey-200 bg-white/95 backdrop-blur">
          <div className="container-wolf flex gap-1 overflow-x-auto py-2">
            {sections.map((s) => (
              <a
                key={s.key}
                href={`#${s.key}`}
                className={`whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                  active === s.key
                    ? 'bg-black text-white'
                    : 'text-grey-600 hover:bg-grey-100'
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* 본문(좌) + 우측 sticky 신청 사이드바 */}
      <div className="container-wolf py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          {/* 섹션 본문 (좌) */}
          <div className="order-2 space-y-12 pb-12 lg:order-1">
            {/* 미디어 갤러리 (유튜브·인스타·이미지·동영상) */}
            <MediaGallery items={ev.media} />
            {sections.map((s) => (
              <section key={s.key} id={s.key} className="scroll-mt-24">
                <h2 className="mb-4 border-l-4 border-primary pl-3 font-display text-2xl font-bold">
                  {s.label}
                </h2>
                <div
                  className="prose-wolf text-grey-800 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_img]:my-4 [&_img]:rounded-lg [&_li]:my-1 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </section>
            ))}
          </div>

          {/* 메타 정보 + 신청 (우, 스크롤 시 함께 이동하는 sticky) */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-20">
            <div className="space-y-4 rounded-xl border border-grey-200 p-4">
              <dl className="divide-y divide-grey-100">
                {dateText && (
                  <Row label={dict.event.date}>
                    <span>{dateText}</span>
                    {calUrl && (
                      <a
                        href={calUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <CalendarPlus size={14} /> {dict.event.addCalendar}
                      </a>
                    )}
                  </Row>
                )}
                {periodText && (
                  <Row label={dict.event.period}>
                    <span>{periodText}</span>
                    <span
                      className={`ml-2 rounded-pill px-2.5 py-0.5 text-xs font-medium ${
                        applyOpen ? 'bg-success/10 text-success' : 'bg-grey-100 text-grey-500'
                      }`}
                    >
                      {applyOpen ? dict.event.open : dict.event.closed}
                    </span>
                  </Row>
                )}
                <Row label={dict.event.cost}>{costText || '—'}</Row>
                {location && <Row label={dict.event.location}>{location}</Row>}
              </dl>

              {/* 데스크톱 신청 버튼 */}
              <div className="hidden md:block">
                <AddToCartButton
                  item={cartItem}
                  label={soldout ? dict.event.soldout : dict.event.apply}
                  addedLabel={dict.product.added}
                  disabled={soldout || !applyOpen}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 모바일 고정 신청 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-grey-200 bg-white p-3 md:hidden">
        <AddToCartButton
          item={cartItem}
          label={soldout ? dict.event.soldout : dict.event.apply}
          addedLabel={dict.product.added}
          disabled={soldout || !applyOpen}
        />
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
      <dt className="w-16 shrink-0 label-caps text-grey-500">{label}</dt>
      <dd className="flex flex-1 flex-wrap items-center text-grey-800">{children}</dd>
    </div>
  );
}
