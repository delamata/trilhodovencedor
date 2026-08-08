import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Alunos — Trilho do Vencedor' };

export default function AlunosPage() {
  return (
    <div>
      <PageHeader title="Alunos" description="Cadastro, matrícula e situação dos alunos." />
      <EmptyState
        icon={Users}
        title="Tela de alunos em construção"
        description="A listagem com filtros, matrícula e importação chega na Fase 2/4 do projeto."
      />
    </div>
  );
}
