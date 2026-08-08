'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatWeekday } from '@/lib/domain/weekday';
import type { LessonTemplatesRow } from '@/types/database';
import { updateClassSessionAction } from './actions';

export function EditClassSessionDialog({
  classSessionId,
  lessonOptions,
  initialLessonTemplateId,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialNotes,
}: {
  classSessionId: string;
  lessonOptions: LessonTemplatesRow[];
  initialLessonTemplateId: string;
  initialDate: string;
  initialStartTime: string;
  initialEndTime: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lessonTemplateId, setLessonTemplateId] = useState(initialLessonTemplateId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime.slice(0, 5));
  const [endTime, setEndTime] = useState(initialEndTime.slice(0, 5));
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      const result = await updateClassSessionAction({
        classSessionId,
        lessonTemplateId,
        date,
        startTime,
        endTime,
        notes,
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Editar aula
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar aula</DialogTitle>
          <DialogDescription>
            Só é possível editar enquanto a aula está agendada (antes de abrir a chamada).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-lesson">Aula</Label>
            <Select value={lessonTemplateId} onValueChange={(v) => setLessonTemplateId(v ?? '')}>
              <SelectTrigger id="edit-lesson">
                <SelectValue placeholder="Selecione a aula" />
              </SelectTrigger>
              <SelectContent>
                {lessonOptions.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.lesson_code} — {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Data{date ? ` (${formatWeekday(date)})` : ''}</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-start">Início</Label>
              <Input
                id="edit-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-end">Término</Label>
              <Input
                id="edit-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Observações (opcional)</Label>
            <Textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting || !lessonTemplateId || !date}>
            {submitting ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
