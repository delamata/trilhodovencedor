import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { listStudentsWithSummaryAction } from '@/features/students/queries';
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
  presencas: number;
  faltas: number;
  limite: number;
  restantes: number;
  situacao: string;
  status: string;
}

export async function getAlunosReportRows(): Promise<AlunoReportRow[]> {
  await requireAdmin();
  const students = await listStudentsWithSummaryAction();
  return students.map((s) => ({
    nome: s.nome,
    curso: s.courseName,
    presencas: s.presences,
    faltas: s.countedAbsences,
    limite: s.maxAbsences,
    restantes: s.absencesRemaining,
    situacao: SITUACAO_LABEL[s.situacao],
    status: s.memberActive ? 'Ativo' : 'Inativo',
  }));
}

export const alunoReportColumns: CsvColumn<AlunoReportRow>[] = [
  { header: 'Nome', value: (r) => r.nome },
  { header: 'Curso', value: (r) => r.curso },
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
  return students
    .filter((s) => AT_RISK_SITUACOES.has(s.situacao))
    .map((s) => ({
      nome: s.nome,
      curso: s.courseName,
      presencas: s.presences,
      faltas: s.countedAbsences,
      limite: s.maxAbsences,
      restantes: s.absencesRemaining,
      situacao: SITUACAO_LABEL[s.situacao],
      status: s.memberActive ? 'Ativo' : 'Inativo',
    }));
}

// ---------------------------------------------------------------------
// Presença por aluno (percentual)
// ---------------------------------------------------------------------
export interface PresencaPorAlunoRow {
  nome: string;
  curso: string;
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
  aula: string;
  data: string;
  presentes: number;
  total: number;
  percentual: string;
}

export async function getPresencaPorAulaReportRows(): Promise<PresencaPorAulaRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from('classes')
    .select('id, class_number, title, class_date, courses(code, name)')
    .eq('status', 'COMPLETED')
    .order('class_date', { ascending: true });

  const classIds = (classes ?? []).map((c) => c.id);
  const { data: attendanceRows } = classIds.length
    ? await supabase.from('attendance').select('class_id, status').in('class_id', classIds)
    : { data: [] };

  const points = computePresenceByClass(
    (classes ?? []).map((c) => {
      const course = Array.isArray(c.courses) ? c.courses[0] : c.courses;
      return { classId: c.id, label: `${course?.name ?? ''} — Aula ${c.class_number}: ${c.title}`, classDate: c.class_date };
    }),
    (attendanceRows ?? []).map((row) => ({ classId: row.class_id, status: row.status })),
  );

  return (classes ?? []).map((c, i) => {
    const course = Array.isArray(c.courses) ? c.courses[0] : c.courses;
    const point = points[i];
    return {
      curso: course?.name ?? '—',
      aula: `Aula ${c.class_number}: ${c.title}`,
      data: formatDate(c.class_date),
      presentes: point?.present ?? 0,
      total: point?.total ?? 0,
      percentual: `${point?.pct ?? 0}%`,
    };
  });
}

export const presencaPorAulaColumns: CsvColumn<PresencaPorAulaRow>[] = [
  { header: 'Curso', value: (r) => r.curso },
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
  TEACHER: 'Professor',
  ADMIN: 'Administrador',
  SYSTEM: 'Automático',
};

async function getAllAttendanceRecords(): Promise<AttendanceRecordRow[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from('attendance')
    .select('status, source, members(nome), classes(class_number, title, class_date, courses(name))');

  return (data ?? []).map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const course = classRow ? (Array.isArray(classRow.courses) ? classRow.courses[0] : classRow.courses) : null;
    return {
      nome: member?.nome ?? '—',
      curso: course?.name ?? '—',
      aula: classRow ? `Aula ${classRow.class_number}: ${classRow.title}` : '—',
      data: classRow ? formatDate(classRow.class_date) : '—',
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
  { header: 'Aula', value: (r) => r.aula },
  { header: 'Data', value: (r) => r.data },
  { header: 'Status', value: (r) => r.status },
  { header: 'Origem', value: (r) => r.origem },
];
