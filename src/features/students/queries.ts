'use server';

import { createClient } from '@/lib/supabase/server';
import { getSituacao, type Situacao } from '@/lib/domain/situacao';
import type { AcademicResult, AttendanceStatus, EnrollmentStatus } from '@/types/database';

export interface StudentListRow {
  studentId: string;
  enrollmentId: string;
  nome: string;
  tel: string | null;
  memberActive: boolean;
  courseId: string;
  courseCode: string;
  courseName: string;
  cohortId: string;
  cohortCode: string;
  cohortName: string;
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
  cohortId?: string;
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
      cohortId: s.cohort_id,
      cohortCode: s.cohort_code,
      cohortName: s.cohort_name,
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
  if (filters.cohortId) rows = rows.filter((r) => r.cohortId === filters.cohortId);
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
  cohortId: string;
  cohortCode: string;
  cohortName: string;
  maxAbsences: number;
  enrollmentStatus: EnrollmentStatus;
  academicResult: AcademicResult;
  enrolledAt: string;
  completedAt: string | null;
  droppedOutAt: string | null;
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
    cohortId: s.cohort_id,
    cohortCode: s.cohort_code,
    cohortName: s.cohort_name,
    maxAbsences: s.max_absences,
    enrollmentStatus: s.enrollment_status,
    academicResult: s.academic_result,
    enrolledAt: s.enrolled_at,
    completedAt: s.completed_at,
    droppedOutAt: s.dropped_out_at,
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
  classSessionId: string;
  courseCode: string;
  lessonCode: string;
  lessonTitle: string;
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
    .select(
      'status, class_sessions(id, class_date, lesson_templates(lesson_code, title), cohorts(courses(code)))',
    )
    .eq('student_id', studentId);

  return (data ?? [])
    .map((row) => {
      const session = Array.isArray(row.class_sessions) ? row.class_sessions[0] : row.class_sessions;
      const lesson = session
        ? Array.isArray(session.lesson_templates)
          ? session.lesson_templates[0]
          : session.lesson_templates
        : null;
      const cohort = session
        ? Array.isArray(session.cohorts)
          ? session.cohorts[0]
          : session.cohorts
        : null;
      const course = cohort?.courses
        ? Array.isArray(cohort.courses)
          ? cohort.courses[0]
          : cohort.courses
        : null;
      return {
        classSessionId: session?.id ?? '',
        courseCode: course?.code ?? '—',
        lessonCode: lesson?.lesson_code ?? '—',
        lessonTitle: lesson?.title ?? '—',
        classDate: session?.class_date ?? '',
        status: row.status,
      };
    })
    .sort((a, b) => (a.classDate < b.classDate ? 1 : -1));
}
