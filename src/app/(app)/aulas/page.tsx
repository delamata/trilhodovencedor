import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Aulas — Trilho do Vencedor' };

export default function AulasPage() {
  return (
    <div>
      <PageHeader title="Aulas" description="Próximas aulas e histórico." />
      <EmptyState
        icon={BookOpen}
        title="Lista de aulas em construção"
        description="A lista de aulas com status (agendada, chamada aberta, finalizada, cancelada) chega na Fase 2."
      />
    </div>
  );
}
