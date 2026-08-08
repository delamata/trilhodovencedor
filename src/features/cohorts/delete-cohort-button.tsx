'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteCohortAction } from './actions';

/** Só aparece pra turmas FINISHED/CANCELLED — o próprio trilho_delete_cohort recusa qualquer outro status. */
export function DeleteCohortButton({
  cohortId,
  cohortLabel,
}: {
  cohortId: string;
  cohortLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      const result = await deleteCohortAction(cohortId);
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
    <ConfirmDialog
      trigger={
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          aria-label={`Excluir turma ${cohortLabel}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
        </Button>
      }
      title="Excluir turma"
      description={`Exclui permanentemente ${cohortLabel}, junto com todas as aulas, presenças e matrículas dela. Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir turma"
      destructive
      onConfirm={handleDelete}
    />
  );
}
