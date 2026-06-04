// Design Ref: §5 Phase 4 — 게시판 조회 (공개 글, board_type 별). content 는 평문(textarea).
import { createClient } from '@/lib/supabase/server';

export type BoardType = 'notice' | 'qna' | 'review' | 'faq';

export interface BoardRow {
  id: string;
  board_type: BoardType | null;
  title: string | null;
  content: string | null;
  status: string;
  created_at: string;
}

/** 공개(open) 글 목록 — type 지정 시 해당 유형만 */
export async function getBoards(type?: BoardType): Promise<BoardRow[]> {
  let q = createClient()
    .from('boards')
    .select('id, board_type, title, content, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50);
  if (type) q = q.eq('board_type', type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BoardRow[];
}

export async function getBoard(id: string): Promise<BoardRow | null> {
  const { data, error } = await createClient()
    .from('boards')
    .select('id, board_type, title, content, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as BoardRow | null) ?? null;
}
