import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { GraduationCap, Layers, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getCourseAction, listCourseStructureAction } from '@/features/courses/actions';
import { CourseConfigForm } from '@/features/courses/course-config-form';
import { CourseStructurePanel } from '@/features/courses/course-structure-panel';
import { listCohortsAction } from '@/features/cohorts/actions';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Curso — Trilho do Vencedor' };

export default async function CursoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const course = await getCourseAction(id);
  if (!course) notFound();

  const [modules, cohorts] = await Promise.all([
    listCourseStructureAction(id),
    listCohortsAction(id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={course.name}
        description={`${cohorts.length} turma${cohorts.length === 1 ? '' : 's'} · ${modules.length} módulo${modules.length === 1 ? '' : 's'}`}
      />

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Configuração do curso
        </h2>
        <CourseConfigForm course={course} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <CourseStructurePanel courseId={id} modules={modules} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Turmas
          </h2>
          <Button size="sm" render={<Link href={`/turmas/nova?curso=${id}`} />}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova turma
          </Button>
        </div>

        {cohorts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma turma criada ainda para este curso.
          </p>
        ) : (
          <div className="space-y-2">
            {cohorts.map((cohort) => (
              <Link
                key={cohort.id}
                href={`/turmas/${cohort.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {cohort.code} — {cohort.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)} ·{' '}
                    {cohort.activeEnrollments} aluno{cohort.activeEnrollments === 1 ? '' : 's'}
                  </p>
                </div>
                <Badge variant={cohort.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                  {cohort.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
