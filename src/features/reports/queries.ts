import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { listStudentsWithSummaryAction } from '@/features/students/queries';
import { listDropoutReportAction } from '@/features/enrollments/actions';
import { SITUACAO_LABEL } from '@/lib/domain/situacao';
import { computePresenceByClass } from '@/lib/domain/dashboard-metrics';
import { formatDate } from '@/lib/format';
import type { CsvColumn } from '@/lib/export/csv';

const AT_RISK_SITUACOES = new Set(['ALERTA', 'LIMITE_ATINGIDO', 'LIMITE_EXCEDIDO']);

// ---------------------------------------------------------------------
// Alunos
// ---------------------------------------------------------------------
export interface AlunoReportRow {
  nome: string;
  curso: string;
  turma: string;
  presencas: number;
  faltas: number;
  limite: number;
  restantes: number;
  situacao: string;
  status: string;
}

function toAlunoReportRow(s: Awaited<ReturnType<typeof listStudentsWithSummaryAction>>[number]): AlunoReportRow {
  return {
    nome: s.nome,
    curso: s.courseName,
    turma: s.cohortName,
    presencas: s.presences,
    faltas: s.countedAbsences,
    limite: s.maxAbsences,
    restantes: s.absencesRemaining,
    situacao: SITUACAO_LABEL[s.situacao],
    status: s.memberActive ? 'Ativo' : 'Inativo',
  };
}

export async function getAlunosReportRows(): Promise<AlunoReportRow[]> {
  await requireAdmin();
  const students = await listStudentsWithSummaryAction();
  return students.map(toAlunoReportRow);
}

export const alunoReportColumns: CsvColumn<AlunoReportRow>[] = [
  { header: 'Nome', value: (r) => r.nome },
  { header: 'Curso', value: (r) => r.curso },
  { header: 'Turma', value: (r) => r.turma },
  { header: 'Presenças', value: (r) => r.presencas },
  { header: 'Faltas', value: (r) => r.faltas },
  { header: 'Limite', value: (r) => r.limite },
  { header: 'Restantes', value: (r) => r.restantes },
  { header: 'Situação', value: (r) => r.situacao },
  { header: 'Status', value: (r) => r.status },
];

// ---------------------------------------------------------------------
// Alunos em risco (subconjunto de Alunos)
// ---------------------------------------------------------------------
export async function getAlunosEmRiscoReportRows(): Promise<AlunoReportRow[]> {
  await requireAdmin();
  const students = await listStudentsWithSummaryAction();
  return students.filter((s) => AT_RISK_SITUACOES.has(s.situacao)).map(toAlunoReportRow);
}

// ---------------------------------------------------------------------
// Presença por aluno (percentual)
// ---------------------------------------------------------------------
export interface PresencaPorAlunoRow {
  nome: string;
  curso: string;
  turma: string;
  aulasRealizadas: number;
  presencas: number;
  faltas: number;
  percentual: string;
}

export async function getPresencaPorAlunoReportRows(): Promise<PresencaPorAlunoRow[]> {
  await requireAdmin();
  const students = await listStudentsWithSummaryAction();
  return students.map((s) => ({
    nome: s.nome,
    curso: s.courseName,
    turma: s.cohortName,
    aulasRealizadas: s.classesRecorded,
    presencas: s.presences,
    faltas: s.countedAbsences,
    percentual:
      s.classesRecorded > 0 ? `${Math.round((s.presences / s.classesRecorded) * 100)}%` : '—',
  }));
}

export const presencaPorAlunoColumns: CsvColumn<PresencaPorAlunoRow>[] = [
  { header: 'Nome', value: (r) => r.nome },
  { header: 'Curso', value: (r) => r.curso },
  { header: 'Turma', value: (r) => r.turma },
  { header: 'Aulas realizadas', value: (r) => r.aulasRealizadas },
  { header: 'Presenças', value: (r) => r.presencas },
  { header: 'Faltas', value: (r) => r.faltas },
  { header: '% de presença', value: (r) => r.percentual },
];

// ---------------------------------------------------------------------
// Presença por aula
// ---------------------------------------------------------------------
export interface PresencaPorAulaRow {
  curso: string;
  turma: string;
  aula: string;
  data: string;
  presentes: number;
  total: number;
  percentual: string;
}

export async function getPresencaPorAulaReportRows(): Promise<PresencaPorAulaRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('id, class_date, lesson_templates(lesson_code, title), cohorts(name, courses(name))')
    .eq('status', 'COMPLETED')
    .order('class_date', { ascending: true });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: attendanceRows } = sessionIds.length
    ? await supabase.from('attendance').select('class_session_id, status').in('class_session_id', sessionIds)
    : { data: [] };

  const points = computePresenceByClass(
    (sessions ?? []).map((s) => {
      const cohort = Array.isArray(s.cohorts) ? s.cohorts[0] : s.cohorts;
      const course = cohort?.courses ? (Array.isArray(cohort.courses) ? cohort.courses[0] : cohort.courses) : null;
      const lesson = Array.isArray(s.lesson_templates) ? s.lesson_templates[0] : s.lesson_templates;
      return {
        classSessionId: s.id,
        label: `${course?.name ?? ''} — ${lesson?.lesson_code ?? ''}: ${lesson?.title ?? ''}`,
        classDate: s.class_date,
      };
    }),
    (attendanceRows ?? []).map((row) => ({ classSessionId: row.class_session_id, status: row.status })),
  );

  return (sessions ?? []).map((s, i) => {
    const cohort = Array.isArray(s.cohorts) ? s.cohorts[0] : s.cohorts;
    const course = cohort?.courses ? (Array.isArray(cohort.courses) ? cohort.courses[0] : cohort.courses) : null;
    const lesson = Array.isArray(s.lesson_templates) ? s.lesson_templates[0] : s.lesson_templates;
    const point = points[i];
    return {
      curso: course?.name ?? '—',
      turma: cohort?.name ?? '—',
      aula: `${lesson?.lesson_code ?? ''}: ${lesson?.title ?? ''}`,
      data: formatDate(s.class_date),
      presentes: point?.present ?? 0,
      total: point?.total ?? 0,
      percentual: `${point?.pct ?? 0}%`,
    };
  });
}

export const presencaPorAulaColumns: CsvColumn<PresencaPorAulaRow>[] = [
  { header: 'Curso', value: (r) => r.curso },
  { header: 'Turma', value: (r) => r.turma },
  { header: 'Aula', value: (r) => r.aula },
  { header: 'Data', value: (r) => r.data },
  { header: 'Presentes', value: (r) => r.presentes },
  { header: 'Total', value: (r) => r.total },
  { header: '% de presença', value: (r) => r.percentual },
];

// ---------------------------------------------------------------------
// Faltas / Histórico completo (registros individuais de attendance)
// ---------------------------------------------------------------------
export interface AttendanceRecordRow {
  nome: string;
  curso: string;
  turma: string;
  aula: string;
  data: string;
  status: string;
  origem: string;
}

const STATUS_LABEL: Record<string, string> = {
  PRESENTE: 'Presente',
  FALTA: 'Falta',
  FALTA_JUSTIFICADA: 'Falta justificada',
  ATRASO: 'Atraso',
};

const SOURCE_LABEL: Record<string, string> = {
  STUDENT_CHECKIN: 'Check-in do aluno',
  PUBLIC_CHECKIN: 'Check-in público (sem login)',
  TEACHER: 'Professor',
  ADMIN: 'Administrador',
  SYSTEM: 'Automático',
};

async function getAllAttendanceRecords(): Promise<AttendanceRecordRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('attendance')
    .select(
      'status, source, members(nome), class_sessions(class_date, lesson_templates(lesson_code, title), cohorts(name, courses(name)))',
    );

  return (data ?? []).map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    const session = Array.isArray(row.class_sessions) ? row.class_sessions[0] : row.class_sessions;
    const cohort = session ? (Array.isArray(session.cohorts) ? session.cohorts[0] : session.cohorts) : null;
    const course = cohort?.courses ? (Array.isArray(cohort.courses) ? cohort.courses[0] : cohort.courses) : null;
    const lesson = session
      ? Array.isArray(session.lesson_templates)
        ? session.lesson_templates[0]
        : session.lesson_templates
      : null;
    return {
      nome: member?.nome ?? '—',
      curso: course?.name ?? '—',
      turma: cohort?.name ?? '—',
      aula: lesson ? `${lesson.lesson_code}: ${lesson.title}` : '—',
      data: session ? formatDate(session.class_date) : '—',
      status: STATUS_LABEL[row.status] ?? row.status,
      origem: SOURCE_LABEL[row.source] ?? row.source,
    };
  });
}

export async function getFaltasReportRows(): Promise<AttendanceRecordRow[]> {
  const all = await getAllAttendanceRecords();
  return all.filter((r) => r.status === 'Falta' || r.status === 'Falta justificada');
}

export async function getHistoricoCompletoReportRows(): Promise<AttendanceRecordRow[]> {
  return getAllAttendanceRecords();
}

export const attendanceRecordColumns: CsvColumn<AttendanceRecordRow>[] = [
  { header: 'Nome', value: (r) => r.nome },
  { header: 'Curso', value: (r) => r.curso },
  { header: 'Turma', value: (r) => r.turma },
  { header: 'Aula', value: (r) => r.aula },
  { header: 'Data', value: (r) => r.data },
  { header: 'Status', value: (r) => r.status },
  { header: 'Origem', value: (r) => r.origem },
];

// ---------------------------------------------------------------------
// Desistências
// ---------------------------------------------------------------------
export interface DesistenciaReportRow {
  nome: string;
  curso: string;
  turma: string;
  matriculadoEm: string;
  desistiuEm: string;
  motivo: string;
  observacoes: string;
  aulasAteDesistencia: number;
  presencas: number;
  faltas: number;
}

export async function getDesistenciasReportRows(): Promise<DesistenciaReportRow[]> {
  await requireAdmin();
  const rows = await listDropoutReportAction();
  return rows.map((r) => ({
    nome: r.student_name,
    curso: r.course_name,
    turma: r.cohort_name,
    matriculadoEm: formatDate(r.enrolled_at),
    desistiuEm: formatDate(r.dropped_out_at),
    motivo: r.dropout_reason ?? '—',
    observacoes: r.dropout_notes ?? '',
    aulasAteDesistencia: r.classes_recorded_until_dropout,
    presencas: r.presences,
    faltas: r.absences,
  }));
}

export const desistenciaReportColumns: CsvColumn<DesistenciaReportRow>[] = [
  { header: 'Nome', value: (r) => r.nome },
  { header: 'Curso', value: (r) => r.curso },
  { header: 'Turma', value: (r) => r.turma },
  { header: 'Matriculado em', value: (r) => r.matriculadoEm },
  { header: 'Desistiu em', value: (r) => r.desistiuEm },
  { header: 'Motivo', value: (r) => r.motivo },
  { header: 'Observações', value: (r) => r.observacoes },
  { header: 'Aulas até desistência', value: (r) => r.aulasAteDesistencia },
  { header: 'Presenças', value: (r) => r.presencas },
  { header: 'Faltas', value: (r) => r.faltas },
];
