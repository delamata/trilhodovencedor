'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { CohortStatus } from '@/types/database';
import { activateCohortAction, cancelCohortAction, finalizeCohortAction } from './actions';

export function CohortLifecyclePanel({ cohortId, status }: { cohortId: string; status: CohortStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ success: boolean; message: string }>) {
    setBusy(true);
    try {
      const result = await action();
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
    <div className="flex flex-wrap items-center gap-2">
      {status === 'PLANNED' ? (
        <Button size="sm" disabled={busy} onClick={() => run(() => activateCohortAction(cohortId))}>
          Ativar turma
        </Button>
      ) : null}

      {status === 'ACTIVE' ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="default" disabled={busy}>
              Finalizar turma
            </Button>
          }
          title="Finalizar turma"
          description="Isso encerra as matrículas ativas, calcula aprovação/reprovação de cada aluno pelo limite de faltas do curso e — se houver turma de CTL vinculada — promove automaticamente os aprovados. Esta ação não pode ser desfeita."
          confirmLabel="Finalizar turma"
          onConfirm={() => run(() => finalizeCohortAction(cohortId))}
        />
      ) : null}

      {status === 'PLANNED' || status === 'ACTIVE' ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" disabled={busy}>
              Cancelar turma
            </Button>
          }
          title="Cancelar turma"
          description="A turma será marcada como cancelada. Use apenas se a turma não vai acontecer."
          confirmLabel="Cancelar turma"
          destructive
          onConfirm={() => run(() => cancelCohortAction(cohortId))}
        />
      ) : null}
    </div>
  );
}
