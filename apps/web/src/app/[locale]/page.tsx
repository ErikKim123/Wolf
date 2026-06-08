// Design Ref: 첫 페이지 = 행사 캘린더 (티켓 event_content 행사를 startAt 기준 월 캘린더로 표시)
import type { Locale } from '@wolf/shared';
import { getDictionary } from '@/i18n/dictionaries';
import { listEvents } from '@/lib/queries/events';
import { EventCalendar } from '@/components/product/EventCalendar';

// 행사 데이터가 자주 바뀌므로 매 요청 SSR
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const dict = await getDictionary(locale);
  const events = await listEvents();
  // '오늘' 키는 KST 기준(YYYY-MM-DD) — 서버 타임존 영향 제거
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

  return (
    <div className="container-wolf py-8">
      <h1 className="section-title mb-6">{dict.events.title}</h1>
      <EventCalendar events={events} locale={locale} dict={dict} initialKey={todayKey} />
    </div>
  );
}
