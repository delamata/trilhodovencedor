import type { Metadata } from 'next';
import { LayoutDashboard } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';

export const metadata: Metadata = { title: 'Início — Trilho do Vencedor' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.memberName?.split(' ')[0] ?? user?.email ?? '';

  return (
    <div>
      <PageHeader
        title={`Olá, ${firstName}.`}
        description="Este é o painel inicial — os indicadores completos chegam na próxima etapa do projeto."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard em construção"
        description={
          user?.role === 'ALUNO'
            ? 'Em breve você verá aqui seu curso, próxima aula, presenças e faltas.'
            : 'Em breve você verá aqui os indicadores de alunos, presença e faltas.'
        }
      />
    </div>
  );
}
