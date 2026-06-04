// Design Ref: §5.4 메인화면관리 — 목록 + 생성/수정 드로어
'use client';
import { useState } from 'react';
import { ResourceListPage } from '@/components/resource/ResourceListPage';
import { ResourceFormPage } from '@/components/resource/ResourceFormPage';
import { FormDrawer } from '@/components/resource/FormDrawer';
import { mainSectionsConfig } from '@/lib/resource/configs/main-sections';

export default function MainSectionsPage() {
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);
  const open = editing !== undefined;

  return (
    <>
      <ResourceListPage
        config={mainSectionsConfig as never}
        onRowClick={(row) => setEditing(row as Record<string, unknown>)}
        onCreate={() => setEditing(null)}
      />
      <FormDrawer open={open} title={editing ? '섹션 수정' : '섹션 추가'} onClose={() => setEditing(undefined)}>
        <ResourceFormPage
          config={mainSectionsConfig as never}
          initial={editing ?? null}
          onDone={() => setEditing(undefined)}
        />
      </FormDrawer>
    </>
  );
}
