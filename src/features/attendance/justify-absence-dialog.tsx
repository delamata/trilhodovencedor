'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { markAttendanceAction, type RosterRow } from './actions';

export function JustifyAbsenceDialog({
  row,
  classId,
  onClose,
  onJustified,
}: {
  row: RosterRow | null;
  classId: string;
  onClose: () => void;
  onJustified: (studentId: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!row) return;
    setSubmitting(true);
    try {
      const result = await markAttendanceAction({
        classId,
        studentId: row.studentId,
        status: 'FALTA_JUSTIFICADA',
        reason,
      });
      if (result.success) {
        toast.success(result.message);
        onJustified(row.studentId);
        setReason('');
        onClose();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar falta{row ? ` — ${row.nome}` : ''}</DialogTitle>
          <DialogDescription>
            A falta justificada não conta para o limite de faltas, a menos que o curso esteja
            configurado para contar (em Cursos → Configuração).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="justify-reason">Motivo</Label>
          <Textarea
            id="justify-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Salvando…' : 'Justificar falta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
