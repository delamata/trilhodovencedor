'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTimeColumn } from '@/lib/format';
import { formatWeekday } from '@/lib/domain/weekday';
import type { GenerateCtlCalendarResult } from '@/types/database';
import { commitCtlCalendarAction, generateCtlCalendarPreviewAction } from './actions';

export function CtlCalendarPanel({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<GenerateCtlCalendarResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  async function handlePreview() {
    setLoading(true);
    try {
      const result = await generateCtlCalendarPreviewAction(cohortId);
      if (result.success) {
        setPreview(result.preview);
        if (result.preview.length === 0) {
          toast.info('Nenhuma terça-feira com aula de Maturidade encontrada para parear.');
        }
      } else {
        toast.error(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setCommitting(true);
    try {
      const result = await commitCtlCalendarAction(cohortId);
      if (result.success) {
        toast.success(result.message);
        setPreview(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setCommitting(false);
    }
  }

  const pending = (preview ?? []).filter((row) => !row.already_exists);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Gera automaticamente as aulas de CTL a partir das terças-feiras com aula de Maturidade na
        turma de origem vinculada. Revise antes de confirmar.
      </p>

      <Button size="sm" variant="outline" onClick={handlePreview} disabled={loading}>
        {loading ? 'Calculando…' : 'Pré-visualizar calendário'}
      </Button>

      {preview ? (
        preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma terça-feira encontrada. Confirme se a turma de origem (Maturidade) tem aulas em
            terças e se ela aponta para esta turma como &ldquo;próxima turma de CTL&rdquo;.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Aula</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={`${row.class_date}-${row.lesson_code}`} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        {formatDate(row.class_date)} ({formatWeekday(row.class_date)}) ·{' '}
                        {formatTimeColumn(row.start_time)}
                      </td>
                      <td className="px-3 py-2">
                        {row.lesson_code} — {row.lesson_title}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={row.already_exists ? 'outline' : 'secondary'}>
                          {row.already_exists ? 'Já existe' : 'Nova'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" onClick={handleCommit} disabled={committing || pending.length === 0}>
              {committing ? 'Salvando…' : `Confirmar e criar ${pending.length} aula(s)`}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
