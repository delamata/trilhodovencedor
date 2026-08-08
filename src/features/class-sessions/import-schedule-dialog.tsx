'use client';

import { Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CourseScheduleRow } from '@/validations/course-schedule-import';
import { importCourseScheduleAction } from './import-schedule-actions';

const CSV_PLACEHOLDER =
  'numero,titulo,data,horario_inicio,horario_fim\n1,Novo Nascimento,2026-08-11,20:00,21:30\n2,Certeza da Salvação,2026-08-18,20:00,21:30\n3,Vida de Oração,2026-08-25,20:00,21:30\n4,A Palavra de Deus,2026-09-01,20:00,21:30';

const DATE_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

interface ParsedRow extends Partial<CourseScheduleRow> {
  line: number;
  error?: string;
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (DATE_ISO_REGEX.test(trimmed)) return trimmed;
  const brMatch = DATE_BR_REGEX.exec(trimmed);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(text);
  const dataLines = lines[0]?.toLowerCase().startsWith('numero') ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const [numeroRaw, titulo, dataRaw, horarioInicio, horarioFim] = cols;

    const numero = Number(numeroRaw);
    const data = dataRaw ? normalizeDate(dataRaw) : null;

    let error: string | undefined;
    if (!numeroRaw || !Number.isInteger(numero) || numero < 1) error = 'número da aula inválido';
    else if (!titulo) error = 'título vazio';
    else if (!data) error = 'data inválida (use AAAA-MM-DD ou DD/MM/AAAA)';
    else if (!horarioInicio || !TIME_REGEX.test(horarioInicio)) error = 'horário inicial inválido';
    else if (!horarioFim || !TIME_REGEX.test(horarioFim)) error = 'horário final inválido';
    else if (horarioFim <= horarioInicio) error = 'horário final deve ser depois do inicial';

    return {
      line: index + 1,
      numero: Number.isFinite(numero) ? numero : undefined,
      titulo,
      data: data ?? undefined,
      horarioInicio,
      horarioFim,
      error,
    };
  });
}

export function ImportScheduleDialog({
  cohortId,
  cohortLabel,
}: {
  cohortId: string;
  cohortLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => parseCsv(text), [text]);
  const validRows = parsed.filter((row): row is ParsedRow & CourseScheduleRow => !row.error);
  const invalidRows = parsed.filter((row) => row.error);

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const result = await importCourseScheduleAction(
        cohortId,
        validRows.map(({ line: _line, error: _error, ...row }) => row as CourseScheduleRow),
      );
      if (result.errors.length === 0) {
        toast.success(result.message);
        setOpen(false);
        setText('');
      } else {
        toast.error(result.message);
        console.warn('Falhas na importação de calendário:', result.errors);
      }
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        Importar CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar estrutura + calendário — {cohortLabel}</DialogTitle>
          <DialogDescription>
            Cole uma linha por aula: numero,titulo,data,horario_inicio,horario_fim. A cada 2 linhas
            (aula 1 e aula 2) um módulo é criado — se o módulo já existir no curso, é reaproveitado.
            Cada aula já fica agendada nesta turma, na data informada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-csv">Aulas (CSV)</Label>
            <Textarea
              id="schedule-csv"
              rows={10}
              placeholder={CSV_PLACEHOLDER}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {parsed.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p>
                {parsed.length} registros encontrados · {validRows.length} válidos ·{' '}
                {invalidRows.length} com erro
              </p>
              {invalidRows.length > 0 ? (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-destructive">
                  {invalidRows.slice(0, 8).map((row) => (
                    <li key={row.line}>
                      linha {row.line} — {row.error}
                    </li>
                  ))}
                  {invalidRows.length > 8 ? <li>… e mais {invalidRows.length - 8}</li> : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
            {importing ? 'Importando…' : `Importar ${validRows.length} aula(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
