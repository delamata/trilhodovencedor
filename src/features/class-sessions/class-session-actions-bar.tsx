'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { ClassSessionStatus } from '@/types/database';
import { cancelClassSessionAction, closeClassSessionAction, openClassSessionAction } from './actions';

export function ClassSessionActionsBar({
  classSessionId,
  status,
}: {
  classSessionId: string;
  status: ClassSessionStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleOpen() {
    setBusy(true);
    try {
      const result = await openClassSessionAction(classSessionId);
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

  async function handleClose() {
    setBusy(true);
    try {
      const result = await closeClassSessionAction(classSessionId);
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

  async function handleCancel() {
    setBusy(true);
    try {
      const result = await cancelClassSessionAction({ classSessionId });
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
      {status === 'SCHEDULED' ? (
        <>
          <Button size="sm" disabled={busy} onClick={handleOpen}>
            Abrir chamada
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline" disabled={busy}>
                Cancelar aula
              </Button>
            }
            title="Cancelar aula"
            description="Esta aula não contará falta/presença para ninguém."
            confirmLabel="Cancelar aula"
            destructive
            onConfirm={handleCancel}
          />
        </>
      ) : null}

      {status === 'ATTENDANCE_OPEN' ? (
        <ConfirmDialog
          trigger={
            <Button size="sm" disabled={busy}>
              Encerrar chamada
            </Button>
          }
          title="Encerrar chamada"
          description="Quem não confirmou presença até agora será marcado como falta automaticamente. Esta ação não pode ser desfeita."
          confirmLabel="Encerrar chamada"
          onConfirm={handleClose}
        />
      ) : null}
    </div>
  );
}
