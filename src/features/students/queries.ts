'use server';

import { createClient } from '@/lib/supabase/server';
import { getSituacao, type Situacao } from '@/lib/domain/situacao';
import type { AttendanceStatus } from '@/types/database';

export interface StudentListRow {
  studentId: string;
  enrollmentId: string;
  nome: string;
  tel: string | null;
  memberActive: boolean;
  courseId: string;
  courseCode: string;
  courseName: string;
  maxAbsences: number;
  classesRecorded: number;
  presences: number;
  absences: number;
  justifiedAbsences: number;
  countedAbsences: number;
  absencesRemaining: number;
  situacao: Situacao;
  enrolledAt: string;
}

export interface StudentListFilters {
  curso?: string;
  situacao?: Situacao;
  status?: 'ativo' | 'inativo';
  nome?: string;
}

/**
 * Lista de alunos com matrícula ativa, cruzando a view
 * trilho_student_summary (presenças/faltas) com members (nome/tel).
 * Filtra e ordena em memória — o volume esperado (dezenas a poucas
 * centenas de alunos) não justifica paginação no banco.
 */
export async function listStudentsWithSummaryAction(
  filters: StudentListFilters = {},
): Promise<StudentListRow[]> {
  const supabase = await createClient();

  const { data: summaries } = await supabase
    .from('trilho_student_summary')
    .select('*')
    .eq('enrollment_status', 'ACTIVE');

  if (!summaries || summaries.length === 0) return [];

  const studentIds = summaries.map((s) => s.student_id);
  const { data: members } = await supabase
    .from('members')
    .select('id, nome, tel, active')
    .in('id', studentIds);

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  let rows: StudentListRow[] = summaries.map((s) => {
    const member = memberById.get(s.student_id);
    return {
      studentId: s.student_id,
      enrollmentId: s.enrollment_id,
      nome: member?.nome ?? '—',
      tel: member?.tel ?? null,
      memberActive: member?.active ?? true,
      courseId: s.course_id,
      courseCode: s.course_code,
      courseName: s.course_name,
      maxAbsences: s.max_absences,
      classesRecorded: s.classes_recorded,
      presences: s.presences,
      absences: s.absences,
      justifiedAbsences: s.justified_absences,
      countedAbsences: s.counted_absences,
      absencesRemaining: s.absences_remaining,
      situacao: getSituacao(s.absences_remaining),
      enrolledAt: s.enrolled_at,
    };
  });

  if (filters.curso) rows = rows.filter((r) => r.courseCode === filters.curso);
  if (filters.situacao) rows = rows.filter((r) => r.situacao === filters.situacao);
  if (filters.status) {
    rows = rows.filter((r) => (filters.status === 'ativo' ? r.memberActive : !r.memberActive));
  }
  if (filters.nome) {
    const query = filters.nome.trim().toLowerCase();
    rows = rows.filter((r) => r.nome.toLowerCase().includes(query));
  }

  rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return rows;
}

export interface StudentProfile {
  id: string;
  nome: string;
  tel: string | null;
  active: boolean;
  nasc: string | null;
}

export async function getStudentProfileAction(studentId: string): Promise<StudentProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('members')
    .select('id, nome, tel, active, nasc')
    .eq('id', studentId)
    .maybeSingle();
  return data ?? null;
}

export interface StudentEnrollmentSummary {
  enrollmentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  maxAbsences: number;
  enrollmentStatus: string;
  enrolledAt: string;
  endedAt: string | null;
  classesRecorded: number;
  presences: number;
  absences: number;
  justifiedAbsences: number;
  countedAbsences: number;
  absencesRemaining: number;
  situacao: Situacao;
}

/** Todas as matrículas (ativas e históricas) do aluno, com resumo de presença de cada uma. */
export async function getStudentEnrollmentsAction(
  studentId: string,
): Promise<StudentEnrollmentSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('trilho_student_summary')
    .select('*')
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false });

  return (data ?? []).map((s) => ({
    enrollmentId: s.enrollment_id,
    courseId: s.course_id,
    courseCode: s.course_code,
    courseName: s.course_name,
    maxAbsences: s.max_absences,
    enrollmentStatus: s.enrollment_status,
    enrolledAt: s.enrolled_at,
    endedAt: s.ended_at,
    classesRecorded: s.classes_recorded,
    presences: s.presences,
    absences: s.absences,
    justifiedAbsences: s.justified_absences,
    countedAbsences: s.counted_absences,
    absencesRemaining: s.absences_remaining,
    situacao: getSituacao(s.absences_remaining),
  }));
}

export interface StudentHistoryRow {
  classId: string;
  courseCode: string;
  classNumber: number;
  title: string;
  classDate: string;
  status: AttendanceStatus;
}

/** Histórico completo de aulas com registro de presença deste aluno, mais recentes primeiro. */
export async function getStudentAttendanceHistoryAction(
  studentId: string,
): Promise<StudentHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('attendance')
    .select('status, classes(id, class_number, title, class_date, courses(code))')
    .eq('student_id', studentId);

  return (data ?? [])
    .map((row) => {
      const classRow = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      const course = classRow ? (Array.isArray(classRow.courses) ? classRow.courses[0] : classRow.courses) : null;
      return {
        classId: classRow?.id ?? '',
        courseCode: course?.code ?? '—',
        classNumber: classRow?.class_number ?? 0,
        title: classRow?.title ?? '—',
        classDate: classRow?.class_date ?? '',
        status: row.status,
      };
    })
    .sort((a, b) => (a.classDate < b.classDate ? 1 : -1));
}
