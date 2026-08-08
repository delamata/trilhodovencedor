import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listCohortsAction, listEligibleQueueAction } from '@/features/cohorts/actions';
import { EligibleQueuePanel } from '@/features/cohorts/eligible-queue-panel';

export const metadata: Metadata = { title: 'Fila de elegíveis — Trilho do Vencedor' };

export default async function FilaDeElegiveisPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const [students, cohorts] = await Promise.all([listEligibleQueueAction(), listCohortsAction()]);

  const ctlCohortOptions = cohorts
    .filter((c) => c.courseCode === 'CTL' && c.status !== 'CANCELLED')
    .map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }));

  return (
    <div>
      <PageHeader
        title="Fila de elegíveis"
        description="Alunos aprovados no Maturidade que ainda não têm turma de CTL."
      />
      <EligibleQueuePanel students={students} ctlCohortOptions={ctlCohortOptions} />
    </div>
  );
}
