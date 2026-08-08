import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Layers, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  listCohortsAction,
  type CohortSortField,
  type SortDirection,
} from '@/features/cohorts/actions';
import { DeleteCohortButton } from '@/features/cohorts/delete-cohort-button';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Turmas — Trilho do Vencedor' };

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

const SORTABLE_COLUMNS: { field: CohortSortField; label: string }[] = [
  { field: 'code', label: 'Turma' },
  { field: 'courseName', label: 'Curso' },
  { field: 'start_date', label: 'Período' },
  { field: 'activeEnrollments', label: 'Alunos' },
  { field: 'status', label: 'Status' },
];

const VALID_FIELDS = new Set<string>(SORTABLE_COLUMNS.map((c) => c.field));

export default async function TurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const params = await searchParams;
  const sortField: CohortSortField = VALID_FIELDS.has(params.sort ?? '')
    ? (params.sort as CohortSortField)
    : 'start_date';
  const sortDir: SortDirection = params.dir === 'asc' ? 'asc' : 'desc';

  const cohorts = await listCohortsAction(undefined, { field: sortField, dir: sortDir });

  function headerHref(field: CohortSortField) {
    const nextDir: SortDirection = sortField === field && sortDir === 'desc' ? 'asc' : 'desc';
    return `/turmas?sort=${field}&dir=${nextDir}`;
  }

  function SortIcon({ field }: { field: CohortSortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
    );
  }

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
                {SORTABLE_COLUMNS.map((column) => (
                  <th key={column.field} className="px-4 py-3 font-medium">
                    <Link
                      href={headerHref(column.field)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {column.label}
                      <SortIcon field={column.field} />
                    </Link>
                  </th>
                ))}
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr
                  key={cohort.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/turmas/${cohort.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {cohort.code} — {cohort.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cohort.courseName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{cohort.activeEnrollments}</td>
                  <td className="px-4 py-3">
                    <Badge variant={cohort.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                      {STATUS_LABEL[cohort.status] ?? cohort.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {cohort.status === 'FINISHED' || cohort.status === 'CANCELLED' ? (
                      <DeleteCohortButton
                        cohortId={cohort.id}
                        cohortLabel={`${cohort.code} — ${cohort.name}`}
                      />
                    ) : null}
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
