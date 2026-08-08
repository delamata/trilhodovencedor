'use client';

import { Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getCelulaOptionsAction } from './actions';
import { importStudentsAction, type ImportStudentRow } from './import-actions';

const CSV_PLACEHOLDER =
  'nome,email,telefone\nJoão da Silva,joao@example.com,11999990000\nMaria Souza,maria@example.com,11988880000';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow extends ImportStudentRow {
  line: number;
  error?: string;
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dataLines = lines[0]?.toLowerCase().startsWith('nome') ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const cols = line.split(',').map((c) => c.trim());
    const [nome, email, tel] = cols;

    let error: string | undefined;
    if (!nome) error = 'nome vazio';
    else if (!email || !EMAIL_REGEX.test(email)) error = 'e-mail inválido';

    return {
      line: index + 1,
      nome: nome ?? '',
      email: email ?? '',
      tel: tel ?? '',
      error,
    };
  });
}

export function ImportStudentsDialog({
  cohortId,
  cohortLabel,
}: {
  cohortId: string;
  cohortLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [celula, setCelula] = useState('');
  const [celulaOptions, setCelulaOptions] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open && celulaOptions.length === 0) {
      getCelulaOptionsAction().then((options) => {
        setCelulaOptions(options);
        setCelula((current) => current || (options[0] ?? ''));
      });
    }
  }, [open, celulaOptions.length]);

  const parsed = useMemo(() => parseCsv(text), [text]);
  const validRows = parsed.filter((row) => !row.error);
  const invalidRows = parsed.filter((row) => row.error);

  async function handleImport() {
    if (validRows.length === 0 || !celula) return;
    setImporting(true);
    try {
      const result = await importStudentsAction(
        validRows.map(({ line: _line, error: _error, ...row }) => row),
        celula,
        cohortId,
      );
      if (result.errors.length === 0) {
        toast.success(`${result.imported} de ${result.total} alunos importados com sucesso.`);
        setOpen(false);
        setText('');
        router.refresh();
      } else {
        toast.error(
          `${result.imported} de ${result.total} importados. ${result.errors.length} falharam.`,
        );
        console.warn('Falhas na importação de alunos:', result.errors);
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
        Importar alunos
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importação em lote de alunos — {cohortLabel}</DialogTitle>
          <DialogDescription>
            Cole uma linha por aluno: nome,email,telefone. Todos serão matriculados na turma{' '}
            {cohortLabel}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="w-56 space-y-1">
            <Label htmlFor="import-celula">Célula (aplicada a todos)</Label>
            <Select value={celula} onValueChange={(value) => setCelula(value ?? '')}>
              <SelectTrigger id="import-celula">
                <SelectValue placeholder="Selecione a célula" />
              </SelectTrigger>
              <SelectContent>
                {celulaOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="students-csv">Alunos (CSV)</Label>
            <Textarea
              id="students-csv"
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
          <Button onClick={handleImport} disabled={validRows.length === 0 || !celula || importing}>
            {importing ? 'Importando…' : `Importar ${validRows.length} aluno(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
