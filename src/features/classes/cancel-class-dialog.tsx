'use client';

import { useRouter } from 'next/navigation';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cancelClassAction } from './actions';

export function CancelClassDialog({ classId, classTitle }: { classId: string; classTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const result = await cancelClassAction({ classId, reason });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setReason('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Cancelar aula</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar {classTitle}?</DialogTitle>
          <DialogDescription>
            Uma aula cancelada não gera falta para os alunos. O histórico não é apagado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Cancelando…' : 'Cancelar aula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
