import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Layers, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { listCohortsAction } from '@/features/cohorts/actions';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Turmas — Trilho do Vencedor' };

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

export default async function TurmasPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const cohorts = await listCohortsAction();

  return (
    <div>
      <PageHeader
        title="Turmas"
        description={`${cohorts.length} turma${cohorts.length === 1 ? '' : 's'}`}
        actions={
          <Button render={<Link href="/turmas/nova" />}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova turma
          </Button>
        }
      />

      {cohorts.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhuma turma criada ainda" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Turma</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Período</th>
                <th className="px-4 py-3 text-right font-medium">Alunos</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/turmas/${cohort.id}`} className="font-medium text-foreground hover:underline">
                      {cohort.code} — {cohort.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cohort.courseName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{cohort.activeEnrollments}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cohort.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                      {STATUS_LABEL[cohort.status] ?? cohort.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
