import type { Situacao } from './situacao';

export interface StudentSummaryLike {
  courseCode: string;
  presences: number;
  absences: number;
  classesRecorded: number;
  situacao: Situacao;
}

export interface SituacaoCount {
  situacao: Situacao;
  count: number;
}

export interface AdminDashboardMetrics {
  totalActiveStudents: number;
  maturidadeStudents: number;
  ctlStudents: number;
  totalPresences: number;
  totalClassesRecorded: number;
  averageAttendancePct: number;
  totalAbsences: number;
  atencaoCount: number;
  alertaCount: number;
  limiteAtingidoCount: number;
  limiteExcedidoCount: number;
  situacaoDistribution: SituacaoCount[];
}

const SITUACAO_ORDER: Situacao[] = [
  'REGULAR',
  'ATENCAO',
  'ALERTA',
  'LIMITE_ATINGIDO',
  'LIMITE_EXCEDIDO',
];

/** KPIs do dashboard administrativo, calculados a partir dos resumos por matrícula ativa (trilho_student_summary). */
export function computeAdminDashboardMetrics(summaries: StudentSummaryLike[]): AdminDashboardMetrics {
  const totalPresences = summaries.reduce((sum, s) => sum + s.presences, 0);
  const totalClassesRecorded = summaries.reduce((sum, s) => sum + s.classesRecorded, 0);
  const totalAbsences = summaries.reduce((sum, s) => sum + s.absences, 0);

  const bySituacao = new Map<Situacao, number>();
  for (const situacao of SITUACAO_ORDER) bySituacao.set(situacao, 0);
  for (const s of summaries) bySituacao.set(s.situacao, (bySituacao.get(s.situacao) ?? 0) + 1);

  return {
    totalActiveStudents: summaries.length,
    maturidadeStudents: summaries.filter((s) => s.courseCode === 'MATURIDADE').length,
    ctlStudents: summaries.filter((s) => s.courseCode === 'CTL').length,
    totalPresences,
    totalClassesRecorded,
    averageAttendancePct:
      totalClassesRecorded > 0 ? Math.round((totalPresences / totalClassesRecorded) * 100) : 0,
    totalAbsences,
    atencaoCount: bySituacao.get('ATENCAO') ?? 0,
    alertaCount: bySituacao.get('ALERTA') ?? 0,
    limiteAtingidoCount: bySituacao.get('LIMITE_ATINGIDO') ?? 0,
    limiteExcedidoCount: bySituacao.get('LIMITE_EXCEDIDO') ?? 0,
    situacaoDistribution: SITUACAO_ORDER.map((situacao) => ({
      situacao,
      count: bySituacao.get(situacao) ?? 0,
    })),
  };
}

export interface ClassAttendanceInput {
  classId: string;
  label: string;
  classDate: string;
}

export interface AttendanceRowInput {
  classId: string;
  status: 'PRESENTE' | 'FALTA' | 'FALTA_JUSTIFICADA' | 'ATRASO';
}

export interface PresenceByClassPoint {
  classId: string;
  label: string;
  classDate: string;
  present: number;
  total: number;
  pct: number;
}

/** Presença por aula (para o gráfico de barras): quantos registros PRESENTE por aula, sobre o total de registros lançados. */
export function computePresenceByClass(
  classes: ClassAttendanceInput[],
  attendanceRows: AttendanceRowInput[],
): PresenceByClassPoint[] {
  const byClass = new Map<string, { present: number; total: number }>();
  for (const row of attendanceRows) {
    const entry = byClass.get(row.classId) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (row.status === 'PRESENTE') entry.present += 1;
    byClass.set(row.classId, entry);
  }

  return classes.map((c) => {
    const entry = byClass.get(c.classId) ?? { present: 0, total: 0 };
    return {
      classId: c.classId,
      label: c.label,
      classDate: c.classDate,
      present: entry.present,
      total: entry.total,
      pct: entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0,
    };
  });
}
