// Design Ref: §5.4 회원관리 화면 — 목록 + 수정 드로어 + 계정 생성
'use client';
import { useState } from 'react';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { CreateMemberForm } from '@/components/member/CreateMemberForm';
import { membersConfig } from '@/lib/resource/configs/members';

export default function MembersPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);

  // canCreate 활성화 → 목록 헤더의 '추가' 버튼이 계정 생성 폼을 연다.
  const config = { ...membersConfig, canCreate: true };

  return (
    <>
      <ResourceListPage
        config={config as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setCreating(true)}
      />
      <FormDrawer open={!!editing} title="회원 수정" onClose={() => setEditing(null)}>
        <ResourceFormPage
          config={membersConfig as never}
          initial={editing}
          onDone={() => setEditing(null)}
        />
      </FormDrawer>
      <FormDrawer open={creating} title="회원 계정 생성" onClose={() => setCreating(false)}>
        <CreateMemberForm onDone={() => setCreating(false)} />
      </FormDrawer>
    </>
  );
}
