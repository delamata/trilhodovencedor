'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { generateCtlFromClassAction } from './actions';

export function GenerateCtlButton({ classId, classTitle }: { classId: string; classTitle: string }) {
  const router = useRouter();

  async function handleConfirm() {
    const result = await generateCtlFromClassAction({ maturidadeClassId: classId });
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Gerar aula de CTL
        </Button>
      }
      title="Gerar aula de CTL?"
      description={`Cria uma aula de CTL na mesma data/horário de "${classTitle}", já que ela cai numa terça-feira.`}
      confirmLabel="Gerar"
      onConfirm={handleConfirm}
    />
  );
}
