import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AbsenceProgress } from '@/components/shared/absence-progress';
import { AttendanceStatusBadge } from '@/components/shared/attendance-status-badge';
import { CourseBadge } from '@/components/shared/course-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StudentStatusBadge } from '@/components/shared/student-status-badge';
import { formatDate } from '@/lib/format';
import { getCurrentUser } from '@/lib/auth/current-user';
import {
  getStudentAttendanceHistoryAction,
  getStudentEnrollmentsAction,
  getStudentProfileAction,
} from '@/features/students/queries';

export const metadata: Metadata = { title: 'Perfil do aluno — Trilho do Vencedor' };

export default async function AlunoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.isAdmin) redirect('/dashboard');

  const profile = await getStudentProfileAction(id);
  if (!profile) notFound();

  const [enrollments, history] = await Promise.all([
    getStudentEnrollmentsAction(id),
    getStudentAttendanceHistoryAction(id),
  ]);

  const activeEnrollment = enrollments.find((e) => e.enrollmentStatus === 'ACTIVE');

  return (
    <div className="space-y-8">
      <PageHeader title={profile.nome} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Dados pessoais</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Nome" value={profile.nome} />
            <Row label="Telefone" value={profile.tel ?? '—'} />
            <Row
              label="Status"
              value={<Badge variant={profile.active ? 'secondary' : 'outline'}>{profile.active ? 'Ativo' : 'Inativo'}</Badge>}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Matrícula atual</h2>
          {activeEnrollment ? (
            <dl className="space-y-3 text-sm">
              <Row
                label="Curso"
                value={<CourseBadge code={activeEnrollment.courseCode} name={activeEnrollment.courseName} />}
              />
              <Row label="Data da matrícula" value={formatDate(activeEnrollment.enrolledAt)} />
              <Row label="Situação" value={<StudentStatusBadge situacao={activeEnrollment.situacao} />} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma matrícula ativa no momento.</p>
          )}
        </section>
      </div>

      {activeEnrollment ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">Resumo</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Aulas realizadas" value={activeEnrollment.classesRecorded} />
            <Stat label="Presenças" value={activeEnrollment.presences} />
            <Stat label="Faltas" value={activeEnrollment.absences} />
            <Stat label="Faltas justificadas" value={activeEnrollment.justifiedAbsences} />
            <Stat
              label="% de presença"
              value={
                activeEnrollment.classesRecorded > 0
                  ? `${Math.round((activeEnrollment.presences / activeEnrollment.classesRecorded) * 100)}%`
                  : '—'
              }
            />
            <Stat label="Limite de faltas" value={activeEnrollment.maxAbsences} />
            <Stat label="Faltas restantes" value={activeEnrollment.absencesRemaining} />
          </div>
          <div className="mt-6 max-w-md">
            <AbsenceProgress
              countedAbsences={activeEnrollment.countedAbsences}
              maxAbsences={activeEnrollment.maxAbsences}
            />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-base font-semibold text-foreground">Histórico completo</h2>
        {history.length === 0 ? (
          <EmptyState title="Nenhum registro de presença ainda." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.classId}>
                    <TableCell>{formatDate(row.classDate)}</TableCell>
                    <TableCell>
                      <CourseBadge code={row.courseCode} />
                    </TableCell>
                    <TableCell>
                      Aula {row.classNumber} — {row.title}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
