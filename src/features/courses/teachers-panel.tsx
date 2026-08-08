'use client';

import { UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { MemberCombobox } from '@/components/shared/member-combobox';
import { searchMembersAction, type MemberSearchResult } from '@/features/students/actions';
import { addTeacherToCourseAction, removeTeacherFromCourseAction, type TeacherRow } from './actions';

export function TeachersPanel({ courseId, teachers }: { courseId: string; teachers: TeacherRow[] }) {
  const [rows, setRows] = useState(teachers);
  const [selected, setSelected] = useState<MemberSearchResult | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    try {
      const result = await addTeacherToCourseAction(courseId, selected.id);
      if (result.success) {
        toast.success(result.message);
        setRows((prev) => [...prev, { teacherId: selected.id, nome: selected.nome }]);
        setSelected(null);
      } else {
        toast.error(result.message);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(teacherId: string) {
    const result = await removeTeacherFromCourseAction(courseId, teacherId);
    if (result.success) {
      toast.success(result.message);
      setRows((prev) => prev.filter((row) => row.teacherId !== teacherId));
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <MemberCombobox value={selected} onChange={setSelected} onSearch={searchMembersAction} />
        </div>
        <Button onClick={handleAdd} disabled={!selected || adding} className="shrink-0">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Adicionar professor
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum professor vinculado a este curso ainda." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.teacherId} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-foreground">{row.nome}</span>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" aria-label={`Remover ${row.nome} deste curso`}>
                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                }
                title="Remover professor do curso?"
                description={`${row.nome} deixará de ter acesso a abrir/fechar chamadas deste curso.`}
                confirmLabel="Remover"
                destructive
                onConfirm={() => handleRemove(row.teacherId)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
