'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listCohortOptionsForCourseAction, updateCohortAction } from './actions';

/**
 * Só faz sentido numa turma de Maturidade: define para qual turma de
 * CTL os aprovados devem ser promovidos automaticamente ao finalizar
 * (seção 13-16). `next_ctl_cohort_id` também é a mesma coluna usada
 * por trilho_generate_ctl_calendar para achar a turma de origem.
 */
export function NextCtlCohortSelector({
  cohortId,
  cohortName,
  startDate,
  endDate,
  ctlCourseId,
  currentNextCohortId,
}: {
  cohortId: string;
  cohortName: string;
  startDate: string;
  endDate: string;
  ctlCourseId: string;
  currentNextCohortId: string | null;
}) {
  const router = useRouter();
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [value, setValue] = useState(currentNextCohortId ?? 'none');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCohortOptionsForCourseAction(ctlCourseId).then(setOptions);
  }, [ctlCourseId]);

  async function handleSave() {
    setBusy(true);
    try {
      const result = await updateCohortAction({
        id: cohortId,
        name: cohortName,
        startDate,
        endDate,
        nextCtlCohortId: value === 'none' ? null : value,
      });
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
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Turma de CTL para onde os aprovados nesta turma serão promovidos automaticamente ao
        finalizar. Também é a turma usada para calcular o calendário de CTL a partir das terças.
      </p>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={(v) => setValue(v ?? 'none')}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Nenhuma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma (usar fila de elegíveis)</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={busy || value === (currentNextCohortId ?? 'none')}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
