import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Calendário — Trilho do Vencedor' };

export default function CalendarioPage() {
  return (
    <div>
      <PageHeader title="Calendário" description="Aulas de Maturidade e CTL." />
      <EmptyState
        icon={CalendarDays}
        title="Calendário em construção"
        description="Visualização em lista/mês, com geração automática de aula CTL nas terças, chega na Fase 2."
      />
    </div>
  );
}
