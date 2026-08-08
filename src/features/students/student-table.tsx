import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CourseBadge } from '@/components/shared/course-badge';
import { StudentStatusBadge } from '@/components/shared/student-status-badge';
import type { StudentListRow } from './queries';

export function StudentTable({ students }: { students: StudentListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Curso</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead className="text-right">Presenças</TableHead>
            <TableHead className="text-right">Faltas</TableHead>
            <TableHead className="text-right">Limite</TableHead>
            <TableHead className="text-right">Restantes</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.enrollmentId}>
              <TableCell className="font-medium text-foreground">{student.nome}</TableCell>
              <TableCell>
                <CourseBadge code={student.courseCode} name={student.courseName} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{student.cohortName}</TableCell>
              <TableCell className="text-right tabular-nums">{student.presences}</TableCell>
              <TableCell className="text-right tabular-nums">{student.countedAbsences}</TableCell>
              <TableCell className="text-right tabular-nums">{student.maxAbsences}</TableCell>
              <TableCell className="text-right tabular-nums">{student.absencesRemaining}</TableCell>
              <TableCell>
                <StudentStatusBadge situacao={student.situacao} />
              </TableCell>
              <TableCell>
                <Badge variant={student.memberActive ? 'secondary' : 'outline'}>
                  {student.memberActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Link
                  href={`/alunos/${student.studentId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
