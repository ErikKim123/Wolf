// Design Ref: §5.4 회원관리 — profiles CRUD (수정만, 생성은 Auth 가입 경유)
import type { ColumnDef } from '@tanstack/react-table';
import type { ResourceConfig } from '@/lib/resource/types';

interface MemberRow {
  id: string;
  email: string | null;
  role: string;
  name: string | null;
  locale: string;
  created_at: string;
}

const ROLE_OPTS = [
  { value: 'customer', label: '일반회원' },
  { value: 'partner', label: '파트너' },
  { value: 'admin', label: '관리자' },
];
const LOCALE_OPTS = [
  { value: 'en', label: 'EN' },
  { value: 'ko', label: 'KO' },
  { value: 'ja', label: 'JA' },
  { value: 'zh-TW', label: 'ZH-TW' },
];

const columns: ColumnDef<MemberRow, unknown>[] = [
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'role', header: '권한', cell: (c) => ROLE_OPTS.find((o) => o.value === c.getValue())?.label ?? String(c.getValue()) },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'locale', header: '언어' },
  { accessorKey: 'created_at', header: '가입일', cell: (c) => String(c.getValue() ?? '').slice(0, 10) },
];

export const membersConfig: ResourceConfig<MemberRow> = {
  key: 'members',
  table: 'profiles',
  title: '회원관리',
  canCreate: false, // 가입은 Auth 경유 — 어드민은 수정만
  selectColumns: 'id, email, role, name, locale, created_at',
  defaultSort: { column: 'created_at', asc: false },
  listColumns: columns,
  filters: [
    { name: 'q', label: '이메일/이름 검색', kind: 'search', searchColumns: ['email', 'name'] },
    { name: 'role', label: '권한', kind: 'select', options: ROLE_OPTS },
    { name: 'locale', label: '언어', kind: 'select', options: LOCALE_OPTS },
  ],
  formFields: [
    { name: 'email', label: '이메일', kind: 'text', readOnly: true },
    { name: 'name', label: '이름', kind: 'text' },
    { name: 'phone', label: '전화', kind: 'text' },
    { name: 'role', label: '권한', kind: 'select', options: ROLE_OPTS, required: true },
    { name: 'locale', label: '언어', kind: 'select', options: LOCALE_OPTS, required: true },
  ],
};
