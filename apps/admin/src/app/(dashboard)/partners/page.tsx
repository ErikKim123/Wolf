// Design Ref: §5.4 파트너관리 — 목록 + 승인 전이 + 편집 드로어
'use client';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { useStatusTransition } from '@/lib/queries/resource';
import { CreatePartnerForm } from '@/components/partner/CreatePartnerForm';
import {
  partnersConfig,
  PARTNER_TRANSITIONS,
  type PartnerRow,
} from '@/lib/resource/configs/partners';

function PartnerActions({ row }: { row: PartnerRow }) {
  const transition = useStatusTransition('partners', 'partners');
  const allowed = PARTNER_TRANSITIONS[row.status] ?? [];
  if (allowed.length === 0) return <span className="text-grey-400">—</span>;
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {allowed.map((t) => (
        <button
          key={t.to}
          className="btn btn-secondary btn-sm"
          disabled={transition.isPending}
          onClick={() => transition.mutate({ id: row.id, status: t.to })}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function PartnersPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);

  // 액션 컬럼을 동적으로 덧붙임 (Plan SC: 파트너 승인 흐름)
  const actionCol: ColumnDef<PartnerRow, unknown> = {
    id: 'actions',
    header: '승인/상태',
    cell: (c) => <PartnerActions row={c.row.original} />,
  };
  // canCreate 활성화 → 목록 헤더의 '추가' 버튼이 계정 생성 폼을 연다.
  const config = {
    ...partnersConfig,
    canCreate: true,
    listColumns: [...partnersConfig.listColumns, actionCol],
  };

  return (
    <>
      <ResourceListPage
        config={config as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setCreating(true)}
      />
      <FormDrawer open={!!editing} title="파트너 편집" onClose={() => setEditing(null)}>
        <ResourceFormPage
          config={partnersConfig as never}
          initial={editing}
          onDone={() => setEditing(null)}
        />
      </FormDrawer>
      <FormDrawer open={creating} title="파트너 계정 생성" onClose={() => setCreating(false)}>
        <CreatePartnerForm onDone={() => setCreating(false)} />
      </FormDrawer>
    </>
  );
}
