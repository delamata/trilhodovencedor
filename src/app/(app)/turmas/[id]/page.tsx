import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Users, CalendarDays, Link2, GraduationCap, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { getCurrentUser } from '@/lib/auth/current-user';
import { formatDate } from '@/lib/format';
import {
  getCohortDetailAction,
  listActiveCoursesAction,
  listCohortRosterAction,
  listTeachersForCohortAction,
} from '@/features/cohorts/actions';
import { listCourseStructureAction } from '@/features/courses/actions';
import { listClassSessionsForCohortAction } from '@/features/class-sessions/actions';
import { CohortLifecyclePanel } from '@/features/cohorts/cohort-lifecycle-panel';
import { PublicLinkPanel } from '@/features/cohorts/public-link-panel';
import { TeacherCohortPanel } from '@/features/cohorts/teacher-cohort-panel';
import { CohortRosterPanel } from '@/features/enrollments/cohort-roster-panel';
import { ClassSessionsPanel } from '@/features/class-sessions/class-sessions-panel';
import { CtlCalendarPanel } from '@/features/cohorts/ctl-calendar-panel';
import { NextCtlCohortSelector } from '@/features/cohorts/next-ctl-cohort-selector';

export const metadata: Metadata = { title: 'Turma — Trilho do Vencedor' };

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planejada',
  ACTIVE: 'Ativa',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

export default async function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const isTeacherHere = user.teacherCohortIds.includes(id);
  if (!user.isAdmin && !isTeacherHere) redirect('/dashboard');

  const cohort = await getCohortDetailAction(id);
  if (!cohort) notFound();

  const [modules, sessions, roster, teachers, courses] = await Promise.all([
    listCourseStructureAction(cohort.course_id),
    listClassSessionsForCohortAction(id),
    listCohortRosterAction(id),
    listTeachersForCohortAction(id),
    listActiveCoursesAction(),
  ]);

  const lessonOptions = modules.flatMap((m) => m.lessons);
  const ctlCourse = courses.find((c) => c.code === 'CTL');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${cohort.code} — ${cohort.name}`}
        description={`${cohort.courseName} · ${formatDate(cohort.start_date)} – ${formatDate(cohort.end_date)}`}
        actions={<Badge variant={cohort.status === 'ACTIVE' ? 'secondary' : 'outline'}>{STATUS_LABEL[cohort.status] ?? cohort.status}</Badge>}
      />

      {user.isAdmin ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <CohortLifecyclePanel cohortId={cohort.id} status={cohort.status} />
        </section>
      ) : null}

      {user.isAdmin && cohort.courseCode === 'MATURIDADE' && ctlCourse ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Promoção automática para o CTL
          </h2>
          <NextCtlCohortSelector
            cohortId={cohort.id}
            cohortName={cohort.name}
            startDate={cohort.start_date}
            endDate={cohort.end_date}
            ctlCourseId={ctlCourse.id}
            currentNextCohortId={cohort.next_ctl_cohort_id}
          />
        </section>
      ) : null}

      {user.isAdmin && cohort.courseCode === 'CTL' ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Gerar calendário a partir do Maturidade
          </h2>
          <CtlCalendarPanel cohortId={cohort.id} />
        </section>
      ) : null}

      {user.isAdmin ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Link de presença (sem login)
          </h2>
          <PublicLinkPanel
            cohortId={cohort.id}
            cohortCode={cohort.code}
            enabled={cohort.public_attendance_enabled}
            hasToken={Boolean(cohort.public_attendance_token_hash)}
            siteUrl={siteUrl}
          />
        </section>
      ) : null}

      {user.isAdmin ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <UserCog className="h-4 w-4" aria-hidden="true" />
            Professores
          </h2>
          <TeacherCohortPanel cohortId={cohort.id} teachers={teachers} />
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Aulas
        </h2>
        <ClassSessionsPanel cohortId={cohort.id} sessions={sessions} lessonOptions={lessonOptions} />
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          Alunos
        </h2>
        <CohortRosterPanel cohortId={cohort.id} roster={roster} />
      </section>
    </div>
  );
}
