import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ClassStatusBadge } from '@/components/shared/class-status-badge';
import { getCurrentUser } from '@/lib/auth/current-user';
import { formatDate, formatTimeColumn } from '@/lib/format';
import { formatWeekday } from '@/lib/domain/weekday';
import { getClassSessionDetailAction } from '@/features/class-sessions/actions';
import { ClassSessionActionsBar } from '@/features/class-sessions/class-session-actions-bar';
import { AttendanceRosterTable } from '@/features/class-sessions/attendance-roster-table';

export const metadata: Metadata = { title: 'Aula — Trilho do Vencedor' };

export default async function ClassSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin && !user.teacherCohortIds.length) redirect('/dashboard');

  const session = await getClassSessionDetailAction(id);
  if (!session) notFound();

  const canManage = user.isAdmin || user.teacherCohortIds.includes(session.cohortId);
  if (!canManage) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${session.lessonCode} — ${session.lessonTitle}`}
        description={
          <>
            <Link href={`/turmas/${session.cohortId}`} className="hover:underline">
              {session.courseCode} · {session.cohortName}
            </Link>
            {' · '}
            {formatDate(session.classDate)} ({formatWeekday(session.classDate)}) ·{' '}
            {formatTimeColumn(session.startTime)}–{formatTimeColumn(session.endTime)}
          </>
        }
        actions={<ClassStatusBadge status={session.status} />}
      />

      <ClassSessionActionsBar classSessionId={session.id} status={session.status} />

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">Presença</h2>
        <AttendanceRosterTable
          classSessionId={session.id}
          roster={session.roster}
          editable={session.status !== 'CANCELLED'}
        />
      </section>
    </div>
  );
}
