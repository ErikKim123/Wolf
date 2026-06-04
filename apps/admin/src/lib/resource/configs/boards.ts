// Design Ref: §5.4 게시판관리 — boards. 공지/문의/후기/FAQ 유형별 글 CRUD.
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import type { ResourceConfig } from '@/lib/resource/types';
import { StatusBadge } from '@/components/form/StatusBadge';

export interface BoardRow {
  id: string;
  board_type: string | null;
  title: string | null;
  content: string | null;
  author_id: string | null;
  status: string;
  created_at: string;
}

const TYPE_OPTS = [
  { value: 'notice', label: '공지' },
  { value: 'qna', label: '문의' },
  { value: 'review', label: '후기' },
  { value: 'faq', label: 'FAQ' },
];
const STATUS_OPTS = [
  { value: 'open', label: '공개' },
  { value: 'closed', label: '비공개' },
];

const columns: ColumnDef<BoardRow, unknown>[] = [
  { accessorKey: 'board_type', header: '유형', cell: (c) => TYPE_OPTS.find((o) => o.value === c.getValue())?.label ?? '—' },
  { accessorKey: 'title', header: '제목', cell: (c) => c.getValue() ?? '—' },
  { accessorKey: 'status', header: '상태', cell: (c) => StatusBadge({ status: STATUS_OPTS.find((o) => o.value === c.getValue())?.label ?? String(c.getValue()) }) },
  { accessorKey: 'created_at', header: '작성일', cell: (c) => String(c.getValue() ?? '').slice(0, 10) },
];

export const boardsConfig: ResourceConfig<BoardRow> = {
  key: 'boards',
  table: 'boards',
  title: '게시판관리',
  canCreate: true,
  selectColumns: 'id, board_type, title, content, author_id, status, created_at',
  defaultSort: { column: 'created_at', asc: false },
  listColumns: columns,
  filters: [
    { name: 'q', label: '제목 검색', kind: 'search', searchColumns: ['title'] },
    { name: 'board_type', label: '유형', kind: 'select', options: TYPE_OPTS },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS },
  ],
  formFields: [
    { name: 'board_type', label: '유형', kind: 'select', options: TYPE_OPTS, required: true },
    { name: 'title', label: '제목', kind: 'text', required: true },
    { name: 'content', label: '내용', kind: 'textarea' },
    { name: 'status', label: '상태', kind: 'select', options: STATUS_OPTS, required: true },
  ],
  schema: z
    .object({
      board_type: z.enum(['notice', 'qna', 'review', 'faq']).optional(),
      status: z.enum(['open', 'closed']).optional(),
    })
    .passthrough(),
};
