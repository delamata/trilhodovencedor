import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Cursos — Trilho do Vencedor' };

export default function CursosPage() {
  return (
    <div>
      <PageHeader
        title="Cursos"
        description="Maturidade e CTL — configuração de limite de faltas."
      />
      <EmptyState
        icon={GraduationCap}
        title="Tela de cursos em construção"
        description="A configuração de maxAbsences e regra de falta justificada chega na Fase 2."
      />
    </div>
  );
}
