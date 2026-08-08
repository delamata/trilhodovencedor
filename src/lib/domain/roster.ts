import type { AttendanceSource, AttendanceStatus } from '@/types/database';

export interface RosterEnrollment {
  studentId: string;
  nome: string;
}

export interface RosterAttendance {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  checkedInAt: string | null;
}

export interface RosterEntry {
  studentId: string;
  nome: string;
  status: AttendanceStatus | 'PENDENTE';
  source: AttendanceSource | null;
  checkedInAt: string | null;
  attendanceId: string | null;
}

/**
 * Combina a lista de alunos matriculados ativos numa turma com os
 * registros de presença já lançados para uma aula (class_session)
 * específica. Quem ainda não tem registro aparece como "PENDENTE"
 * (chamada aberta e ele ainda não confirmou, ou chamada nem foi
 * aberta ainda) — nunca como FALTA até a chamada ser encerrada de
 * verdade (isso é feito no banco, por trilho_close_class_session()).
 */
export function mergeRosterWithAttendance(
  enrollments: RosterEnrollment[],
  attendanceRows: RosterAttendance[],
): RosterEntry[] {
  const byStudent = new Map(attendanceRows.map((row) => [row.studentId, row]));

  return enrollments
    .map((enrollment) => {
      const attendance = byStudent.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        nome: enrollment.nome,
        status: attendance?.status ?? ('PENDENTE' as const),
        source: attendance?.source ?? null,
        checkedInAt: attendance?.checkedInAt ?? null,
        attendanceId: attendance?.id ?? null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
