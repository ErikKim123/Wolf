// Design Ref: 행사 캘린더 — 월 그리드(일~토) + 날짜별 행사 수 + 선택 날짜의 행사 카드 목록.
// 날짜 기준 = event_content.startAt (타임존 영향 없도록 ISO 앞 10자리로 키 생성).
'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { pickI18n, formatPrice, type Locale } from '@wolf/shared';
import { currencyForLocale, intlLocale } from '@/lib/locale';
import type { EventListItem } from '@/lib/queries/events';
import type { Dictionary } from '@/i18n/dictionaries';

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
/** ISO(예: 2026-06-03T18:00) → YYYY-MM-DD (로컬 파싱 없이 안전) */
const isoDateKey = (iso?: string) => (iso ? iso.slice(0, 10) : '');

export function EventCalendar({
  events,
  locale,
  dict,
  initialKey,
}: {
  events: EventListItem[];
  locale: Locale;
  dict: Dictionary;
  initialKey: string; // 서버에서 계산한 '오늘' (YYYY-MM-DD)
}) {
  const [iyS, imS] = initialKey.split('-');
  const iy = Number(iyS);
  const im = Number(imS);
  const [view, setView] = useState({ y: iy, m: im - 1 }); // m: 0-11
  const [selected, setSelected] = useState(initialKey);

  const intl = intlLocale(locale);
  const currency = currencyForLocale(locale);

  // 날짜키 → 행사 목록
  const byDate = useMemo(() => {
    const map = new Map<string, EventListItem[]>();
    for (const e of events) {
      const k = isoDateKey(e.event_content.startAt);
      if (!k) continue;
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return map;
  }, [events]);

  // 6주(42칸) 그리드 — 해당 월 1일이 포함된 주의 일요일부터
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const gridStart = new Date(view.y, view.m, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [view]);

  // 요일/월 라벨은 timeZone 고정(UTC)으로 서버=클라이언트 일치 (hydration 안전)
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intl, { weekday: 'short', timeZone: 'UTC' });
    // 2024-01-07(UTC) = 일요일
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 7 + i))));
  }, [intl]);

  const monthLabel = new Intl.DateTimeFormat(intl, {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(view.y, view.m, 1)));
  const countLabel = (n: number) => dict.events.count.replace('{n}', String(n));

  const selectedEvents = byDate.get(selected) ?? [];
  const move = (delta: number) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const goToday = () => {
    setView({ y: iy, m: im - 1 });
    setSelected(initialKey);
  };

  return (
    <div className="space-y-8">
      {/* 헤더: 월 + 네비 */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold md:text-3xl">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => move(-1)} className="rounded-lg border border-grey-200 p-2 hover:bg-grey-50" aria-label="prev">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="rounded-lg border border-grey-200 px-3 py-2 text-sm font-medium hover:bg-grey-50">
            {dict.events.today}
          </button>
          <button onClick={() => move(1)} className="rounded-lg border border-grey-200 p-2 hover:bg-grey-50" aria-label="next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="overflow-hidden rounded-xl border border-grey-200">
        <div className="grid grid-cols-7 border-b border-grey-200 bg-grey-50">
          {weekdays.map((w, i) => (
            <div key={w} className={`px-3 py-2.5 text-xs font-medium ${i === 0 ? 'text-danger' : 'text-grey-500'}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === view.m;
            const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
            const n = inMonth ? (byDate.get(k)?.length ?? 0) : 0;
            const isToday = k === initialKey;
            const isSel = k === selected;
            return (
              <button
                key={k + i}
                disabled={!inMonth}
                onClick={() => inMonth && setSelected(k)}
                className={`min-h-[84px] border-b border-r border-grey-100 p-2 text-left align-top transition-colors md:min-h-[110px] ${
                  !inMonth ? 'bg-grey-50/50 text-grey-300' : isSel ? 'bg-primary/5 ring-1 ring-inset ring-primary' : 'hover:bg-grey-50'
                }`}
              >
                <span className={`text-sm ${isToday ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary font-semibold text-white' : d.getDay() === 0 && inMonth ? 'text-danger' : ''}`}>
                  {d.getDate()}
                </span>
                {n > 0 && (
                  <span className="mt-1 block text-xs font-medium text-primary">{countLabel(n)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택 날짜의 행사 목록 */}
      <section className="space-y-4">
        <h3 className="font-display text-xl font-bold">
          {countLabel(selectedEvents.length)}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="py-12 text-center text-grey-400">{dict.events.none}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedEvents.map((e) => (
              <EventCard key={e.id} ev={e} locale={locale} dict={dict} intl={intl} currency={currency} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EventCard({
  ev,
  locale,
  dict,
  intl,
  currency,
}: {
  ev: EventListItem;
  locale: Locale;
  dict: Dictionary;
  intl: string;
  currency: ReturnType<typeof currencyForLocale>;
}) {
  const c = ev.event_content;
  const name = pickI18n(ev.name_i18n, locale) || '—';
  const banner = pickI18n(c.banner, locale);
  const location = pickI18n(c.location, locale);
  const priceText = pickI18n(c.priceText, locale);
  const minor = ev.prices?.[currency] ?? 0;
  const cost = priceText || (minor > 0 ? formatPrice(ev.prices, currency, intl) : dict.event.free);
  // startAt(datetime-local, TZ 없음)을 KST 절대시각으로 고정 → 서버=클라 일치
  const time = c.startAt
    ? new Intl.DateTimeFormat(intl, {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul',
        hour12: false,
      }).format(new Date(/[+Z]/.test(c.startAt) ? c.startAt : c.startAt + '+09:00'))
    : '';

  return (
    <Link
      href={`/${locale}/products/${ev.id}`}
      className="group overflow-hidden rounded-xl border border-grey-200 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-grey-100">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-grey-800 to-black" />
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-xs text-grey-500">{time}</p>
        <h4 className="line-clamp-2 font-medium leading-snug text-grey-900">{name}</h4>
        {location && (
          <p className="inline-flex items-center gap-1 text-xs text-grey-500">
            <MapPin size={12} /> {location}
          </p>
        )}
        <p className="pt-1 text-sm font-semibold text-grey-900">{cost}</p>
      </div>
    </Link>
  );
}
