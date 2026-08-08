import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AbsenceProgress } from '@/components/shared/absence-progress';
import { AttendanceStatusBadge } from '@/components/shared/attendance-status-badge';
import { CourseBadge } from '@/components/shared/course-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { StudentStatusBadge } from '@/components/shared/student-status-badge';
import { formatDate, formatTimeColumn } from '@/lib/format';
import type { StudentDashboardData } from './actions';

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
  const firstName = data.nome.split(' ')[0] ?? data.nome;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground lg:text-2xl">Olá, {firstName}.</h1>
        <div className="mt-2">
          <CourseBadge code={data.courseCode} name={data.courseName} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Próxima aula</p>
        {data.nextClass ? (
          <p className="mt-1 text-lg font-semibold text-foreground">
            {formatDate(data.nextClass.classDate)} às {formatTimeColumn(data.nextClass.startTime)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma aula agendada no momento.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Presença</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {data.presences} / {data.classesRecorded}
          </p>
          <p className="text-xs text-muted-foreground">aulas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Faltas</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {data.countedAbsences} de {data.maxAbsences}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.absencesRemaining >= 0
              ? `ainda pode faltar ${data.absencesRemaining} aula${data.absencesRemaining === 1 ? '' : 's'}`
              : 'limite excedido'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Situação</p>
          <StudentStatusBadge situacao={data.situacao} />
        </div>
        <div className="mt-4">
          <AbsenceProgress countedAbsences={data.countedAbsences} maxAbsences={data.maxAbsences} />
        </div>
      </div>

      <Button
        render={<Link href="/presenca" />}
        size="lg"
        disabled={!data.canCheckInNow}
        className="h-14 w-full text-base"
      >
        {data.canCheckInNow ? 'Registrar presença' : 'Nenhuma chamada aberta agora'}
      </Button>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Histórico</h2>
        {data.recentHistory.length === 0 ? (
          <EmptyState title="Nenhuma presença registrada ainda." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Aula</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentHistory.map((row) => (
                  <TableRow key={row.classId}>
                    <TableCell>{formatDate(row.classDate)}</TableCell>
                    <TableCell>Aula {row.classNumber}</TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
