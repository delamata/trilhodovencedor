'use client';

import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { maturidadeCalendarSeed } from '@/data/seeds/maturidade-calendar';
import type { CoursesRow } from '@/types/database';
import { batchImportClassesAction, type BatchImportRow } from './actions';

const CSV_PLACEHOLDER =
  'numero,titulo,data,horario_inicio,horario_fim,criar_ctl\n1,Aula 1,2026-08-11,20:00,21:30,sim\n2,Aula 2,2026-08-18,20:00,21:30,sim';

interface ParsedRow extends BatchImportRow {
  line: number;
  error?: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dataLines = lines[0]?.toLowerCase().startsWith('numero') ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const cols = line.split(',').map((c) => c.trim());
    const [numero, titulo, data, inicio, fim, criarCtl] = cols;
    const classNumber = Number(numero);

    let error: string | undefined;
    if (!numero || Number.isNaN(classNumber) || classNumber < 1) error = 'número da aula inválido';
    else if (!titulo) error = 'título vazio';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) error = 'data inválida (use AAAA-MM-DD)';
    else if (!/^\d{2}:\d{2}$/.test(inicio ?? '')) error = 'horário inicial inválido (use HH:mm)';
    else if (!/^\d{2}:\d{2}$/.test(fim ?? '')) error = 'horário final inválido (use HH:mm)';

    return {
      line: index + 1,
      classNumber,
      title: titulo ?? '',
      date: data ?? '',
      startTime: inicio ?? '',
      endTime: fim ?? '',
      alsoCreateCtl: ['sim', 'true', '1', 'yes'].includes((criarCtl ?? '').toLowerCase()),
      error,
    };
  });
}

export function BatchImportDialog({ courses }: { courses: CoursesRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');

  const parsed = useMemo(() => parseCsv(text), [text]);
  const validRows = parsed.filter((row) => !row.error);
  const invalidRows = parsed.filter((row) => row.error);

  function loadSeedFile() {
    if (maturidadeCalendarSeed.length === 0) {
      toast.info(
        'O arquivo src/data/seeds/maturidade-calendar.ts ainda está vazio. Preencha-o com as datas reais e recarregue a página, ou cole as aulas manualmente abaixo.',
      );
      return;
    }
    const csv = maturidadeCalendarSeed
      .map(
        (row) =>
          `${row.classNumber},${row.title},${row.date},${row.startTime},${row.endTime},${row.alsoCreateCtl ? 'sim' : 'nao'}`,
      )
      .join('\n');
    setText(csv);
  }

  async function handleImport() {
    if (validRows.length === 0 || !courseId) return;
    setImporting(true);
    try {
      const result = await batchImportClassesAction(
        courseId,
        validRows.map(({ line: _line, error: _error, ...row }) => row),
      );
      if (result.errors.length === 0) {
        toast.success(`${result.imported} de ${result.total} aulas importadas com sucesso.`);
        setOpen(false);
        setText('');
        router.refresh();
      } else {
        toast.error(
          `${result.imported} de ${result.total} aulas importadas. ${result.errors.length} falharam — veja o console para detalhes.`,
        );
        console.warn('Falhas na importação de calendário:', result.errors);
        router.refresh();
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        Importar calendário
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importação em lote de calendário</DialogTitle>
          <DialogDescription>
            Cole uma linha por aula (numero,titulo,data,horario_inicio,horario_fim,criar_ctl) ou
            carregue do arquivo de seed do Maturidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="w-48 space-y-1">
              <Label htmlFor="import-course">Curso de destino</Label>
              <Select value={courseId} onValueChange={(value) => setCourseId(value ?? '')}>
                <SelectTrigger id="import-course">
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={loadSeedFile}>
              Carregar de maturidade-calendar.ts
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv">Aulas (CSV)</Label>
            <Textarea
              id="csv"
              rows={8}
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
