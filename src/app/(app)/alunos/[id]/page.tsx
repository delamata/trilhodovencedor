import type { Metadata } from 'next';
import { User } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Perfil do aluno — Trilho do Vencedor' };

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <PageHeader title="Perfil do aluno" description={`ID: ${id}`} />
      <EmptyState
        icon={User}
        title="Perfil do aluno em construção"
        description="Dados pessoais, matrícula, resumo de presença e histórico completo chegam na Fase 4."
      />
    </div>
  );
}
