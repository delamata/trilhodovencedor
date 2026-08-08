'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import type { ClassSessionStatus, LessonTemplatesRow } from '@/types/database';
import {
  cancelClassSessionAction,
  closeClassSessionAction,
  openClassSessionAction,
} from './actions';
import { EditClassSessionDialog } from './edit-class-session-dialog';
import { DeleteClassSessionButton } from './delete-class-session-button';

export function ClassSessionActionsBar({
  classSessionId,
  cohortId,
  status,
  lessonOptions,
  lessonTemplateId,
  classDate,
  startTime,
  endTime,
  notes,
  lessonLabel,
}: {
  classSessionId: string;
  cohortId: string;
  status: ClassSessionStatus;
  lessonOptions: LessonTemplatesRow[];
  lessonTemplateId: string;
  classDate: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  lessonLabel: string;
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
          <EditClassSessionDialog
            classSessionId={classSessionId}
            lessonOptions={lessonOptions}
            initialLessonTemplateId={lessonTemplateId}
            initialDate={classDate}
            initialStartTime={startTime}
            initialEndTime={endTime}
            initialNotes={notes}
          />
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

      {status === 'SCHEDULED' || status === 'CANCELLED' ? (
        <DeleteClassSessionButton
          classSessionId={classSessionId}
          cohortId={cohortId}
          lessonLabel={lessonLabel}
        />
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
