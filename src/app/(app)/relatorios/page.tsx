import type { Metadata } from 'next';
import { FileBarChart } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Relatórios — Trilho do Vencedor' };

export default function RelatoriosPage() {
  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Exportações e indicadores por curso/aula/aluno."
      />
      <EmptyState
        icon={FileBarChart}
        title="Relatórios em construção"
        description="Exportação em CSV/XLSX de alunos, presença, faltas e alunos em risco chega na Fase 4."
      />
    </div>
  );
}
