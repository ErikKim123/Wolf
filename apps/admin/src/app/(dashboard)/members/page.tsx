// Design Ref: §5.4 회원관리 화면 — 목록 + 수정 드로어
'use client';
import { useState } from 'react';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { membersConfig } from '@/lib/resource/configs/members';

export default function MembersPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  return (
    <>
      <ResourceListPage
        config={membersConfig as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
      />
      <FormDrawer open={!!editing} title="회원 수정" onClose={() => setEditing(null)}>
        <ResourceFormPage
          config={membersConfig as never}
          initial={editing}
          onDone={() => setEditing(null)}
        />
      </FormDrawer>
    </>
  );
}
