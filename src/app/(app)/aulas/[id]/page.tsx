import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { ClassStatusBadge } from '@/components/shared/class-status-badge';
import { CourseBadge } from '@/components/shared/course-badge';
import { formatDate, formatTimeColumn } from '@/lib/format';
import { weekdayLabel } from '@/lib/domain/calendar';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getClassDetailAction, getClassRosterAction } from '@/features/attendance/actions';
import { AttendancePanel } from '@/features/attendance/attendance-panel';
import { StudentClassView } from '@/features/attendance/student-class-view';

export const metadata: Metadata = { title: 'Aula — Trilho do Vencedor' };

export default async function AulaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const classDetail = await getClassDetailAction(id);
  if (!classDetail) notFound();

  const canManage = user.isAdmin || user.teacherCourseIds.includes(classDetail.courseId);
  const isEnrolledStudent = classDetail.courseId === user.activeEnrollment?.courseId;

  if (!canManage && !isEnrolledStudent) {
    redirect('/aulas');
  }

  return (
    <div>
      <PageHeader
        title={`Aula ${classDetail.classNumber} — ${classDetail.title}`}
        description={`${formatDate(classDetail.classDate)} (${weekdayLabel(classDetail.classDate)}) · ${formatTimeColumn(classDetail.startTime)}–${formatTimeColumn(classDetail.endTime)}`}
        actions={
          <div className="flex items-center gap-2">
            <CourseBadge code={classDetail.courseCode} name={classDetail.courseName} />
            <ClassStatusBadge status={classDetail.status} />
          </div>
        }
      />

      {classDetail.notes ? (
        <p className="mb-6 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {classDetail.notes}
        </p>
      ) : null}

      {classDetail.status === 'CANCELLED' ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Esta aula foi cancelada e não gera falta para os alunos.
        </div>
      ) : canManage ? (
        <AttendancePanelData classId={classDetail.id} classDetail={classDetail} />
      ) : (
        <StudentClassViewData classDetail={classDetail} studentId={user.memberId} />
      )}
    </div>
  );
}

async function AttendancePanelData({
  classId,
  classDetail,
}: {
  classId: string;
  classDetail: NonNullable<Awaited<ReturnType<typeof getClassDetailAction>>>;
}) {
  const roster = await getClassRosterAction(classId);
  return (
    <AttendancePanel classDetail={classDetail} initialRoster={roster} initialStatus={classDetail.status} />
  );
}

async function StudentClassViewData({
  classDetail,
  studentId,
}: {
  classDetail: NonNullable<Awaited<ReturnType<typeof getClassDetailAction>>>;
  studentId: string | null;
}) {
  const roster = await getClassRosterAction(classDetail.id);
  const mine = roster.find((row) => row.studentId === studentId);
  return <StudentClassView classDetail={classDetail} myStatus={mine?.status ?? null} />;
}
