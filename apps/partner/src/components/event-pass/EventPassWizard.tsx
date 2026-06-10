// 행사패스 등록/수정 — goandance "Create Event" 레퍼런스 기반 단계형(마법사) UI.
// 기존 평면 ResourceFormPage 를 대체. products(ticket) + event_content(jsonb) 한 번에 저장.
// 7단계: 기본정보 · 주최자 · 일정 · 장소 · 티켓 · 대상 · 상세콘텐츠
'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  MapPin,
  Users,
  Ticket,
  Building2,
  Tag,
  Image as ImageIcon,
} from 'lucide-react';
import {
  EVENT_SECTION_KEYS,
  EVENT_TYPE_KEYS,
  ATTENDEE_LEVEL_KEYS,
  ATTENDEES_LOCATION_KEYS,
  TICKET_TIER_TYPE_KEYS,
  DANCE_STYLES,
  resolveMedia,
  MEDIA_KIND_LABEL,
  type EventContent,
  type EventSectionKey,
  type EventType,
  type EventAddress,
  type EventOrganizer,
  type EventTicketTier,
  type EventAudience,
  type AttendeeLevel,
  type AttendeesLocation,
  type TicketTierType,
  type TicketFeeMode,
  type I18n,
  type Prices,
} from '@wolf/shared';
import { createClient } from '@/lib/supabase/client';
import { useResourceUpsert } from '@/lib/queries/resource';
import { useCategoryOptions } from '@/lib/queries/options';
import { eventPassesConfig } from '@/lib/resource/configs/event-passes';
import { I18nField } from '@/components/form/I18nField';
import { PriceField } from '@/components/form/PriceField';
import { ProductImageField } from '@/components/product/ProductImageField';
import { AiProductGenerator } from '@/components/product/AiProductGenerator';
import { RichEditorI18n } from '@/components/editor/RichEditor';
import { cn } from '@/lib/utils';

// ── 라벨 맵 ───────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '승인대기' },
  { value: 'active', label: '판매중' },
  { value: 'soldout', label: '품절' },
];
const EVENT_TYPE_LABEL: Record<EventType, string> = {
  festival: '페스티벌', congress: '콩그레스', workshop: '워크샵', bootcamp: '부트캠프',
  party: '파티', social: '소셜', competition: '대회/경연', other: '기타',
};
const LEVEL_LABEL: Record<AttendeeLevel, string> = {
  beginner: '초급', intermediate: '중급', advanced: '고급',
};
const ATTENDEES_LOCATION_LABEL: Record<AttendeesLocation, string> = {
  local: '지역(로컬)', national: '국내', international: '국제',
};
const TICKET_TYPE_LABEL: Record<TicketTierType, string> = {
  full_pass: '풀패스', day_pass: '데이패스', party_pass: '파티패스',
  hotel: '호텔', shuttle: '셔틀', other: '기타',
};
const FEE_MODE_LABEL: Record<TicketFeeMode, string> = {
  client: '구매자 부담', absorb: '판매자 부담',
};
const SECTION_LABEL: Record<EventSectionKey, string> = {
  about: '행사 소개', venue: '행사 장소', notice: '공지/안내', contact: '문의 하기',
  channel: '채널 정보', recommend: '추천', refund: '취소/환불',
};

const STEPS = [
  { title: '기본 정보', desc: '행사패스 이름·유형·분류를 입력합니다.' },
  { title: '주최자', desc: '행사를 주최하는 단체/개인 정보입니다.' },
  { title: '일정', desc: '행사 일시와 신청 기간을 설정합니다.' },
  { title: '장소', desc: '행사가 열리는 장소 주소입니다.' },
  { title: '티켓', desc: '판매할 패스(티켓)를 구성합니다. 첫 티켓 가격이 대표가로 표시됩니다.' },
  { title: '대상', desc: '예상 참가자·추천 레벨·댄스 스타일입니다.' },
  { title: '상세 콘텐츠', desc: '포스터/배너·미디어·상세 페이지를 작성합니다.' },
];

function newTierKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'tk_' + Math.random().toString(36).slice(2, 10);
}

// ── 메인 마법사 ───────────────────────────────────────────────
export function EventPassWizard({
  initial,
  sellerId,
  onDone,
  onCancel,
}: {
  initial: Record<string, unknown> | null; // null = 신규
  sellerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initial
      ? { ...initial }
      : { ...(eventPassesConfig.createDefaults ?? {}), seller_id: sellerId },
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const upsert = useResourceUpsert(eventPassesConfig as never);
  const { data: categoryOptions = [] } = useCategoryOptions();

  // 수정 시 상세 HTML(detail_html_i18n)은 목록 select 에서 제외 → 콘텐츠 단계 진입 시 1회 로드
  const fetchedDetail = useRef(false);
  useEffect(() => {
    const id = values.id as string | undefined;
    if (step !== 6 || fetchedDetail.current || !id || values.detail_html_i18n) return;
    fetchedDetail.current = true;
    createClient()
      .from('products')
      .select('detail_html_i18n')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.detail_html_i18n) setValues((v) => ({ ...v, detail_html_i18n: data.detail_html_i18n }));
      })
      .then(undefined, () => {});
  }, [step, values.id, values.detail_html_i18n]);

  const ec = (values.event_content as EventContent) ?? {};
  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }));
  const setEc = (p: Partial<EventContent>) =>
    setValues((v) => ({ ...v, event_content: { ...((v.event_content as EventContent) ?? {}), ...p } }));

  const nameOk = !!values.name_i18n && Object.values(values.name_i18n as I18n).some(Boolean);

  async function save() {
    setError(null);
    if (!nameOk) {
      setStep(0);
      setError('행사패스명은 필수입니다.');
      return;
    }
    // 대표가 = 첫 번째 가격 있는 티켓 (목록/카드 표시용 products.prices)
    const tickets = (ec.tickets ?? []) as EventTicketTier[];
    const firstPriced = tickets.find((t) => t.price && Object.keys(t.price).length > 0);
    const payload: Record<string, unknown> = { ...values };
    if (firstPriced?.price) payload.prices = firstPriced.price;

    if (eventPassesConfig.schema) {
      const r = eventPassesConfig.schema.safeParse(payload);
      if (!r.success) {
        const first = r.error.issues[0];
        setError(`${first?.path.join('.') || '입력'}: ${first?.message ?? '검증 실패'}`);
        return;
      }
    }
    try {
      await upsert.mutateAsync(payload as never);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  }

  const isLast = step === STEPS.length - 1;
  const cur = STEPS[step]!;

  return (
    <div className="space-y-5">
      {/* 스텝퍼 */}
      <ol className="flex items-center">
        {STEPS.map((s, i) => (
          <li key={i} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <button
              type="button"
              onClick={() => setStep(i)}
              title={s.title}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                i === step
                  ? 'bg-black text-white'
                  : i < step
                    ? 'bg-grey-600 text-white'
                    : 'bg-grey-200 text-grey-500',
              )}
            >
              {i + 1}
            </button>
            {i < STEPS.length - 1 && (
              <span className={cn('mx-1 h-0.5 flex-1', i < step ? 'bg-grey-600' : 'bg-grey-200')} />
            )}
          </li>
        ))}
      </ol>

      {/* 단계 헤더 */}
      <div>
        <h3 className="font-display text-lg font-bold">{cur.title}</h3>
        <p className="text-sm text-grey-500">{cur.desc}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* 단계 본문 */}
      <div className="min-h-[18rem]">
        {step === 0 && (
          <StepBasic
            values={values}
            set={set}
            ec={ec}
            setEc={setEc}
            categoryOptions={categoryOptions}
          />
        )}
        {step === 1 && <OrganizerStep value={ec.organizer ?? {}} onChange={(v) => setEc({ organizer: v })} />}
        {step === 2 && <ScheduleStep ec={ec} setEc={setEc} />}
        {step === 3 && <AddressStep value={ec.address ?? {}} onChange={(v) => setEc({ address: v })} />}
        {step === 4 && <TicketsStep value={ec.tickets ?? []} onChange={(v) => setEc({ tickets: v })} />}
        {step === 5 && <AudienceStep value={ec.audience ?? {}} onChange={(v) => setEc({ audience: v })} />}
        {step === 6 && (
          <ContentStep values={values} set={set} ec={ec} setEc={setEc} />
        )}
      </div>

      {/* 풋터 네비게이션 */}
      <div className="flex items-center justify-between border-t border-grey-100 pt-4">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}
        >
          {step === 0 ? '취소' : '이전'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-grey-400">{step + 1} / {STEPS.length}</span>
          {isLast ? (
            <button type="button" className="btn btn-primary btn-sm" disabled={upsert.isPending} onClick={save}>
              {upsert.isPending ? '저장 중…' : initial ? '수정 저장' : '등록'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)}>
              다음
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: 기본 정보 ─────────────────────────────────────────
function StepBasic({
  values, set, ec, setEc, categoryOptions,
}: {
  values: Record<string, unknown>;
  set: (n: string, v: unknown) => void;
  ec: EventContent;
  setEc: (p: Partial<EventContent>) => void;
  categoryOptions: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <I18nField
        label="행사패스명"
        required
        value={(values.name_i18n as I18n) ?? {}}
        onChange={(v) => set('name_i18n', v)}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-caps">행사패스 코드</label>
          <input className="input" value={(values.code as string) ?? ''} onChange={(e) => set('code', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps flex items-center gap-1.5"><Tag size={13} /> 행사 유형</label>
          <select
            className="input"
            value={ec.eventType ?? ''}
            onChange={(e) => setEc({ eventType: (e.target.value || undefined) as EventType | undefined })}
          >
            <option value="">선택</option>
            {EVENT_TYPE_KEYS.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">카테고리</label>
          <select
            className="input"
            value={(values.category_id as string) ?? ''}
            onChange={(e) => set('category_id', e.target.value || null)}
          >
            <option value="">선택</option>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">상태 *</label>
          <select className="input" value={(values.status as string) ?? 'draft'} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: 주최자 ────────────────────────────────────────────
function OrganizerStep({ value, onChange }: { value: EventOrganizer; onChange: (v: EventOrganizer) => void }) {
  const set = (p: Partial<EventOrganizer>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-grey-500">
        <Building2 size={15} /> <span className="label-caps">주최자 정보</span>
      </div>
      <I18nField label="주최자명" value={value.name ?? {}} onChange={(v) => set({ name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-caps">로고 이미지 URL</label>
          <input className="input" placeholder="https://…" value={value.logo ?? ''} onChange={(e) => set({ logo: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">연락처</label>
          <input className="input" placeholder="이메일 / 전화 / URL" value={value.contact ?? ''} onChange={(e) => set({ contact: e.target.value })} />
        </div>
      </div>
      <I18nField label="주최자 소개" value={value.description ?? {}} onChange={(v) => set({ description: v })} multiline />
    </div>
  );
}

// ── Step 3: 일정 ──────────────────────────────────────────────
function ScheduleStep({ ec, setEc }: { ec: EventContent; setEc: (p: Partial<EventContent>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-grey-500">
        <CalendarClock size={15} /> <span className="label-caps">행사 일시 / 신청 기간</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DateTime label="일시 시작" value={ec.startAt} onChange={(v) => setEc({ startAt: v })} />
        <DateTime label="일시 종료" value={ec.endAt} onChange={(v) => setEc({ endAt: v })} />
        <DateTime label="신청 시작" value={ec.applyStart} onChange={(v) => setEc({ applyStart: v })} />
        <DateTime label="신청 종료" value={ec.applyEnd} onChange={(v) => setEc({ applyEnd: v })} />
      </div>
      <p className="text-xs text-grey-400">시간은 한국 시간(KST) 기준으로 고객 페이지에 표시됩니다.</p>
    </div>
  );
}

// ── Step 4: 장소(구조화 주소) ─────────────────────────────────
function AddressStep({ value, onChange }: { value: EventAddress; onChange: (v: EventAddress) => void }) {
  const set = (p: Partial<EventAddress>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-grey-500">
        <MapPin size={15} /> <span className="label-caps">행사 장소</span>
      </div>
      <input className="input" placeholder="주소 (도로명/상세)" value={value.line1 ?? ''} onChange={(e) => set({ line1: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="도시(City)" value={value.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
        <input className="input" placeholder="우편번호(Postal code)" value={value.postalCode ?? ''} onChange={(e) => set({ postalCode: e.target.value })} />
        <input className="input" placeholder="국가(Country)" value={value.country ?? ''} onChange={(e) => set({ country: e.target.value })} />
        <input className="input" placeholder="시/도(Province)" value={value.province ?? ''} onChange={(e) => set({ province: e.target.value })} />
      </div>
    </div>
  );
}

// ── Step 5: 티켓 티어 ─────────────────────────────────────────
function TicketsStep({ value, onChange }: { value: EventTicketTier[]; onChange: (v: EventTicketTier[]) => void }) {
  const update = (i: number, p: Partial<EventTicketTier>) => onChange(value.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const add = () => onChange([...value, { key: newTierKey(), type: 'full_pass', feeMode: 'client' }]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-grey-500">
        <Ticket size={15} /> <span className="label-caps">티켓 (패스)</span>
      </div>
      {value.length === 0 && (
        <p className="rounded-lg bg-grey-50 p-3 text-xs text-grey-500">
          판매할 티켓이 없습니다. 풀패스·데이패스·파티패스 등 티켓을 추가하세요.
        </p>
      )}
      {value.map((t, i) => (
        <div key={t.key} className="space-y-2 rounded-lg border border-grey-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-grey-600">티켓 #{i + 1}</span>
            <button type="button" className="btn btn-secondary btn-sm text-danger" onClick={() => remove(i)}>삭제</button>
          </div>
          <I18nField label="티켓명" value={t.name ?? {}} onChange={(v) => update(i, { name: v })} />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="label-caps">종류</label>
              <select className="input" value={t.type ?? 'full_pass'} onChange={(e) => update(i, { type: e.target.value as TicketTierType })}>
                {TICKET_TIER_TYPE_KEYS.map((k) => <option key={k} value={k}>{TICKET_TYPE_LABEL[k]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="label-caps">판매 수량</label>
              <input type="number" min={0} step={1} className="input" value={t.units ?? ''}
                onChange={(e) => update(i, { units: e.target.value === '' ? undefined : Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} />
            </div>
            <div className="space-y-1.5">
              <label className="label-caps">수수료</label>
              <select className="input" value={t.feeMode ?? 'client'} onChange={(e) => update(i, { feeMode: e.target.value as TicketFeeMode })}>
                {(['client', 'absorb'] as TicketFeeMode[]).map((m) => <option key={m} value={m}>{FEE_MODE_LABEL[m]}</option>)}
              </select>
            </div>
          </div>
          <PriceField label="판매가" value={t.price ?? {}} onChange={(v: Prices) => update(i, { price: v })} />
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>+ 티켓 추가</button>
    </div>
  );
}

// ── Step 6: 대상(오디언스) ────────────────────────────────────
function AudienceStep({ value, onChange }: { value: EventAudience; onChange: (v: EventAudience) => void }) {
  const set = (p: Partial<EventAudience>) => onChange({ ...value, ...p });
  const levels = value.levels ?? [];
  const styles = value.danceStyles ?? [];
  const toggleLevel = (l: AttendeeLevel) => set({ levels: levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l] });
  const toggleStyle = (s: string) => set({ danceStyles: styles.includes(s) ? styles.filter((x) => x !== s) : [...styles, s] });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-grey-500">
        <Users size={15} /> <span className="label-caps">대상 (오디언스)</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label-caps">예상 참가자 수</label>
          <input type="number" min={0} step={1} className="input" value={value.estimatedAttendees ?? ''}
            onChange={(e) => set({ estimatedAttendees: e.target.value === '' ? undefined : Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} />
        </div>
        <div className="space-y-1.5">
          <label className="label-caps">참가자 주요 출신</label>
          <select className="input" value={value.attendeesLocation ?? ''}
            onChange={(e) => set({ attendeesLocation: (e.target.value || undefined) as AttendeesLocation | undefined })}>
            <option value="">선택</option>
            {ATTENDEES_LOCATION_KEYS.map((k) => <option key={k} value={k}>{ATTENDEES_LOCATION_LABEL[k]}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="label-caps">추천 레벨</label>
        <div className="flex flex-wrap gap-2">
          {ATTENDEE_LEVEL_KEYS.map((l) => (
            <Chip key={l} active={levels.includes(l)} onClick={() => toggleLevel(l)}>{LEVEL_LABEL[l]}</Chip>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="label-caps">댄스 스타일 {styles.length > 0 && <span className="text-grey-400">({styles.length})</span>}</label>
        <div className="flex flex-wrap gap-1.5">
          {DANCE_STYLES.map((s) => (
            <Chip key={s} active={styles.includes(s)} onClick={() => toggleStyle(s)} small>{s}</Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 7: 상세 콘텐츠 ───────────────────────────────────────
function ContentStep({
  values, set, ec, setEc,
}: {
  values: Record<string, unknown>;
  set: (n: string, v: unknown) => void;
  ec: EventContent;
  setEc: (p: Partial<EventContent>) => void;
}) {
  const setSection = (key: EventSectionKey, v: I18n) => setEc({ sections: { ...ec.sections, [key]: v } });
  const media = ec.media ?? [];
  const setMedia = (m: string[]) => setEc({ media: m });
  const moveMedia = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const n = [...media];
    const a = n[i]; const b = n[j];
    if (a === undefined || b === undefined) return;
    n[i] = b; n[j] = a; setMedia(n);
  };

  return (
    <div className="space-y-5">
      {/* 대표 이미지(포스터) */}
      <div className="space-y-1.5">
        <label className="label-caps flex items-center gap-1.5"><ImageIcon size={13} /> 대표 이미지 (포스터·썸네일)</label>
        <ProductImageField
          value={values.image_url as string | undefined}
          set={(v) => set('image_url', v)}
          allValues={values}
        />
      </div>

      {/* 히어로 / 소개 */}
      <div className="space-y-3 border-t border-grey-100 pt-4">
        <I18nField label="히어로 배너 이미지 URL" value={ec.banner ?? {}} onChange={(v) => setEc({ banner: v })} />
        <I18nField label="상단 배지" value={ec.badge ?? {}} onChange={(v) => setEc({ badge: v })} />
        <I18nField label="부제" value={ec.subtitle ?? {}} onChange={(v) => setEc({ subtitle: v })} />
      </div>

      {/* 미디어 갤러리 */}
      <div className="space-y-2 border-t border-grey-100 pt-4">
        <span className="label-caps">미디어 (유튜브·인스타·이미지·동영상 URL)</span>
        <p className="text-xs text-grey-500">URL 을 붙여넣으면 종류를 자동 인식해 본문 상단에 순서대로 표시합니다.</p>
        {media.map((url, i) => {
          const kind = url.trim() ? resolveMedia(url).kind : null;
          return (
            <div key={i} className="flex items-center gap-2">
              <input className="input flex-1" value={url}
                placeholder="https://youtu.be/… , https://instagram.com/p/… , https://…/image.jpg"
                onChange={(e) => { const n = [...media]; n[i] = e.target.value; setMedia(n); }} />
              {kind && <span className="shrink-0 rounded-pill bg-grey-100 px-2 py-1 text-xs text-grey-600">{MEDIA_KIND_LABEL[kind]}</span>}
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === 0} onClick={() => moveMedia(i, -1)}>↑</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={i === media.length - 1} onClick={() => moveMedia(i, 1)}>↓</button>
              <button type="button" className="btn btn-secondary btn-sm text-danger" onClick={() => setMedia(media.filter((_, j) => j !== i))}>삭제</button>
            </div>
          );
        })}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMedia([...media, ''])}>+ URL 추가</button>
      </div>

      {/* 섹션별 콘텐츠 (리치 에디터) */}
      <div className="space-y-4 border-t border-grey-100 pt-4">
        <p className="text-xs text-grey-500">각 섹션은 리치 에디터로 작성합니다(굵게·제목·목록·이미지). 내용이 있는 섹션만 고객 페이지 메뉴/본문에 노출됩니다.</p>
        {EVENT_SECTION_KEYS.map((key) => (
          <RichEditorI18n key={key} label={`섹션 — ${SECTION_LABEL[key]}`}
            value={ec.sections?.[key] ?? {}} onChange={(v) => setSection(key, v)} />
        ))}
      </div>

      {/* 상세 페이지(AI) */}
      <div className="space-y-1.5 border-t border-grey-100 pt-4">
        <label className="label-caps">상세 페이지 (AI 생성)</label>
        <AiProductGenerator
          value={values.detail_html_i18n as I18n | undefined}
          set={(v) => set('detail_html_i18n', v)}
          allValues={values}
        />
      </div>
    </div>
  );
}

// ── 공용 위젯 ─────────────────────────────────────────────────
function Chip({ active, onClick, children, small }: {
  active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'rounded-pill border font-medium transition-colors',
        small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        active ? 'border-transparent bg-black text-white' : 'border-grey-200 bg-white text-grey-600 hover:border-grey-300',
      )}>
      {children}
    </button>
  );
}

function DateTime({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="label-caps">{label}</label>
      <input type="datetime-local" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
