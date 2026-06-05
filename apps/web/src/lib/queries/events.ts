// Design Ref: 행사 캘린더 — 티켓(event_content) 상품을 startAt 기준으로 캘린더에 배치.
import { createClient } from '@/lib/supabase/server';
import type { EventContent, I18n, Prices } from '@wolf/shared';

/** 캘린더/카드에 필요한 행사(티켓) 항목 */
export interface EventListItem {
  id: string;
  code: string | null;
  product_type: string;
  seller_id: string;
  is_partner_product: boolean;
  name_i18n: I18n;
  prices: Prices;
  event_content: EventContent;
}

/** 판매중 + event_content.startAt 이 있는 티켓 행사 목록 (startAt 오름차순) */
export async function listEvents(): Promise<EventListItem[]> {
  const { data, error } = await createClient()
    .from('products')
    .select(
      'id, code, product_type, seller_id, is_partner_product, name_i18n, prices, event_content',
    )
    .eq('product_type', 'ticket')
    .eq('status', 'active')
    .not('event_content', 'is', null);
  if (error) throw error;
  return (data ?? [])
    .filter((p): p is EventListItem => Boolean((p.event_content as EventContent | null)?.startAt))
    .sort((a, b) => (a.event_content.startAt! < b.event_content.startAt! ? -1 : 1));
}
