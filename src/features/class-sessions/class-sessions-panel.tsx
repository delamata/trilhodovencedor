'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
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
import { ClassStatusBadge } from '@/components/shared/class-status-badge';
import { formatDate, formatTimeColumn } from '@/lib/format';
import { formatWeekday } from '@/lib/domain/weekday';
import type { LessonTemplatesRow } from '@/types/database';
import { createClassSessionAction, type ClassSessionListItem } from './actions';
import { ImportScheduleDialog } from './import-schedule-dialog';

export function ClassSessionsPanel({
  cohortId,
  cohortLabel,
  sessions,
  lessonOptions,
}: {
  cohortId: string;
  cohortLabel: string;
  sessions: ClassSessionListItem[];
  lessonOptions: LessonTemplatesRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lessonTemplateId, setLessonTemplateId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('21:30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const result = await createClassSessionAction({
        cohortId,
        lessonTemplateId,
        date,
        startTime,
        endTime,
        notes,
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setLessonTemplateId('');
        setDate('');
        setNotes('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sessions.length} aula{sessions.length === 1 ? '' : 's'} agendada
          {sessions.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <ImportScheduleDialog cohortId={cohortId} cohortLabel={cohortLabel} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agendar aula
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar aula</DialogTitle>
                <DialogDescription>
                  Escolha qual aula do módulo será dada e quando. O dia da semana é calculado
                  automaticamente a partir da data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lesson">Aula</Label>
                  <Select
                    value={lessonTemplateId}
                    onValueChange={(v) => setLessonTemplateId(v ?? '')}
                  >
                    <SelectTrigger id="lesson">
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
                  <Label htmlFor="date">Data{date ? ` (${formatWeekday(date)})` : ''}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Início</Label>
                    <Input
                      id="start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">Término</Label>
                    <Input
                      id="end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={submitting || !lessonTemplateId || !date}>
                  {submitting ? 'Agendando…' : 'Agendar aula'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma aula agendada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/aulas/${session.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:border-primary/40"
            >
              <div>
                <p className="font-medium text-foreground">
                  {session.lessonCode} — {session.lessonTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(session.classDate)} ({formatWeekday(session.classDate)}) ·{' '}
                  {formatTimeColumn(session.startTime)}–{formatTimeColumn(session.endTime)}
                </p>
              </div>
              <ClassStatusBadge status={session.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
