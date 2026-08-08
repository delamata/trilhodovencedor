'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteClassSessionAction } from './actions';

export function DeleteClassSessionButton({
  classSessionId,
  cohortId,
  lessonLabel,
}: {
  classSessionId: string;
  cohortId: string;
  lessonLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const result = await deleteClassSessionAction(classSessionId);
      if (result.success) {
        toast.success(result.message);
        router.push(`/turmas/${cohortId}`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" disabled={busy}>
          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          Excluir aula
        </Button>
      }
      title="Excluir aula"
      description={`Exclui permanentemente ${lessonLabel} desta turma. Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir aula"
      destructive
      onConfirm={handleDelete}
    />
  );
}
