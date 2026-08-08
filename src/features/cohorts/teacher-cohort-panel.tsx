'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MemberCombobox } from '@/components/shared/member-combobox';
import { searchMembersAction, type MemberSearchResult } from '@/features/students/actions';
import { addTeacherToCohortAction, removeTeacherFromCohortAction, type TeacherListItem } from './actions';

export function TeacherCohortPanel({
  cohortId,
  teachers,
}: {
  cohortId: string;
  teachers: TeacherListItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await addTeacherToCohortAction(cohortId, selected.id);
      if (result.success) {
        toast.success(result.message);
        setSelected(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(teacherId: string) {
    setBusy(true);
    try {
      const result = await removeTeacherFromCohortAction(cohortId, teacherId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {teachers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum professor vinculado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {teachers.map((teacher) => (
            <li
              key={teacher.teacherId}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              {teacher.nome}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleRemove(teacher.teacherId)}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MemberCombobox value={selected} onChange={setSelected} onSearch={searchMembersAction} />
        </div>
        <Button size="sm" disabled={!selected || busy} onClick={handleAdd}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
