'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/format';
import type { EligibleStudent } from './actions';
import { enrollEligibleStudentsAction } from './actions';

export function EligibleQueuePanel({
  students,
  ctlCohortOptions,
}: {
  students: EligibleStudent[];
  ctlCohortOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetCohortId, setTargetCohortId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggle(studentId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function handleEnroll() {
    if (!targetCohortId || selected.size === 0) return;
    setSubmitting(true);
    try {
      const result = await enrollEligibleStudentsAction(targetCohortId, Array.from(selected));
      if (result.success) {
        toast.success(result.message);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (students.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum aluno na fila de elegíveis no momento.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Alunos aprovados no Maturidade sem turma de CTL definida no momento da finalização. Escolha
        uma turma de CTL e matricule quem quiser em lote.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="w-10 px-3 py-2" />
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Turma de origem</th>
              <th className="px-3 py-2 font-medium">Concluído em</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.studentId} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  <Checkbox
                    checked={selected.has(student.studentId)}
                    onCheckedChange={() => toggle(student.studentId)}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-foreground">{student.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {student.cohortCode} — {student.cohortName}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {student.completedAt ? formatDate(student.completedAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={targetCohortId} onValueChange={(v) => setTargetCohortId(v ?? '')}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione a turma de CTL destino" />
          </SelectTrigger>
          <SelectContent>
            {ctlCohortOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleEnroll} disabled={submitting || !targetCohortId || selected.size === 0}>
          {submitting ? 'Matriculando…' : `Matricular ${selected.size} selecionado(s)`}
        </Button>
      </div>
    </div>
  );
}
