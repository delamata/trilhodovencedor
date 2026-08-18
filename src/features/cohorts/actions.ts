'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import {
  createCohortSchema,
  updateCohortSchema,
  type CreateCohortInput,
  type UpdateCohortInput,
} from '@/validations/cohort';
import type { CohortsRow, CoursesRow, FinalizeCohortResult } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface CohortListItem extends CohortsRow {
  courseCode: string;
  courseName: string;
  activeEnrollments: number;
}

export type CohortSortField =
  'code' | 'courseName' | 'start_date' | 'end_date' | 'activeEnrollments' | 'status';
export type SortDirection = 'asc' | 'desc';

/**
 * Lista todas as turmas (com o curso já resolvido). Sem `sort`, vem
 * mais recentes primeiro. A contagem de alunos ativos é calculada em
 * memória, então a ordenação por ela (e por curso, que vem de um join)
 * também é feita em memória — o volume de turmas nunca justifica
 * ordenar isso no banco.
 */
export async function listCohortsAction(
  courseId?: string,
  sort?: { field: CohortSortField; dir: SortDirection },
): Promise<CohortListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('cohorts')
    .select('*, courses(code, name)')
    .order('start_date', { ascending: false });

  if (courseId) query = query.eq('course_id', courseId);

  const { data } = await query;
  if (!data) return [];

  const cohortIds = data.map((c) => c.id);
  const { data: enrollmentCounts } = cohortIds.length
    ? await supabase
        .from('enrollments')
        .select('cohort_id')
        .eq('status', 'ACTIVE')
        .in('cohort_id', cohortIds)
    : { data: [] };

  const countByCohort = new Map<string, number>();
  for (const row of enrollmentCounts ?? []) {
    countByCohort.set(row.cohort_id, (countByCohort.get(row.cohort_id) ?? 0) + 1);
  }

  const items = data.map((row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const { courses: _courses, ...cohort } = row;
    return {
      ...(cohort as CohortsRow),
      courseCode: course?.code ?? '—',
      courseName: course?.name ?? '—',
      activeEnrollments: countByCohort.get(row.id) ?? 0,
    };
  });

  if (!sort) return items;

  const { field, dir } = sort;
  const factor = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv), 'pt-BR') * factor;
  });
}

export interface CohortDetail extends CohortsRow {
  courseCode: string;
  courseName: string;
  maxAbsences: number;
  previousCohortLabel: string | null;
  nextCtlCohortLabel: string | null;
}

export async function getCohortDetailAction(cohortId: string): Promise<CohortDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cohorts')
    .select('*, courses(code, name, max_absences)')
    .eq('id', cohortId)
    .maybeSingle();

  if (!data) return null;

  const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;
  const { courses: _c, ...cohort } = data;

  const relatedIds = [cohort.previous_cohort_id, cohort.next_ctl_cohort_id].filter(
    (id): id is string => Boolean(id),
  );
  const { data: related } = relatedIds.length
    ? await supabase.from('cohorts').select('id, code, name').in('id', relatedIds)
    : { data: [] };
  const relatedById = new Map((related ?? []).map((r) => [r.id, r]));
  const previous = cohort.previous_cohort_id ? relatedById.get(cohort.previous_cohort_id) : null;
  const next = cohort.next_ctl_cohort_id ? relatedById.get(cohort.next_ctl_cohort_id) : null;

  return {
    ...cohort,
    courseCode: course?.code ?? '—',
    courseName: course?.name ?? '—',
    maxAbsences: course?.max_absences ?? 0,
    previousCohortLabel: previous ? `${previous.code} — ${previous.name}` : null,
    nextCtlCohortLabel: next ? `${next.code} — ${next.name}` : null,
  };
}

export async function listActiveCoursesAction(): Promise<CoursesRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('courses').select('*').eq('active', true).order('name');
  return data ?? [];
}

/** Turmas de um curso, para os selects de "turma anterior" / "próxima turma de CTL". */
export async function listCohortOptionsForCourseAction(
  courseId: string,
): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cohorts')
    .select('id, code, name')
    .eq('course_id', courseId)
    .order('start_date', { ascending: false });

  return (data ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }));
}

export async function createCohortAction(
  input: CreateCohortInput,
): Promise<ActionResult & { id?: string }> {
  const parsed = createCohortSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('trilho_create_cohort', {
    p_course_id: parsed.data.courseId,
    p_code: parsed.data.code,
    p_name: parsed.data.name,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
    p_previous_cohort_id: parsed.data.previousCohortId ?? null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/turmas');
  return { success: true, message: 'Turma criada com sucesso.', id: data as string };
}

export async function updateCohortAction(input: UpdateCohortInput): Promise<ActionResult> {
  const parsed = updateCohortSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_update_cohort', {
    p_id: parsed.data.id,
    p_name: parsed.data.name,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
    p_next_ctl_cohort_id: parsed.data.nextCtlCohortId ?? null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/turmas');
  revalidatePath(`/turmas/${parsed.data.id}`);
  return { success: true, message: 'Turma atualizada com sucesso.' };
}

export async function activateCohortAction(cohortId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_activate_cohort', { p_id: cohortId });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${cohortId}`);
  return { success: true, message: 'Turma ativada.' };
}

export async function cancelCohortAction(cohortId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_cancel_cohort', { p_id: cohortId });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${cohortId}`);
  return { success: true, message: 'Turma cancelada.' };
}

/** Exclui uma turma antiga (só FINISHED/CANCELLED — checado também no banco). Apaga aulas/matrículas dela junto. */
export async function deleteCohortAction(cohortId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_delete_cohort', { p_cohort_id: cohortId });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath('/turmas');
  return { success: true, message: 'Turma excluída.' };
}

export async function regeneratePublicTokenAction(
  cohortId: string,
): Promise<ActionResult & { token?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_regenerate_public_token', {
    p_cohort_id: cohortId,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath(`/turmas/${cohortId}`);
  return { success: true, message: 'Novo link gerado.', token: data?.[0]?.token };
}

export async function setPublicAttendanceEnabledAction(
  cohortId: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_set_public_attendance_enabled', {
    p_cohort_id: cohortId,
    p_enabled: enabled,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath(`/turmas/${cohortId}`);
  return {
    success: true,
    message: enabled ? 'Link de presença ativado.' : 'Link de presença desativado.',
  };
}

export async function finalizeCohortAction(
  cohortId: string,
): Promise<ActionResult & { result?: FinalizeCohortResult }> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_finalize_cohort', { p_cohort_id: cohortId });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${cohortId}`);
  revalidatePath('/alunos');
  const result = data?.[0];
  return {
    success: true,
    message: result
      ? `Turma finalizada: ${result.approved_count} aprovado(s), ${result.not_approved_count} não aprovado(s), ${result.promoted_count} promovido(s) para o CTL.`
      : 'Turma finalizada.',
    result,
  };
}

export interface EligibleStudent {
  studentId: string;
  nome: string;
  cohortCode: string;
  cohortName: string;
  completedAt: string | null;
}

/**
 * Fila de elegíveis (seção 17): aprovados no Maturidade que não têm
 * matrícula ativa em nenhuma turma (ou seja, nenhuma turma de CTL
 * existia — ou eles não foram promovidos automaticamente — no momento
 * da finalização).
 */
export async function listEligibleQueueAction(): Promise<EligibleStudent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('trilho_student_summary')
    .select('*')
    .eq('course_code', 'MATURIDADE')
    .eq('enrollment_status', 'COMPLETED')
    .eq('academic_result', 'APPROVED');

  if (!data || data.length === 0) return [];

  const studentIds = data.map((row) => row.student_id);
  const { data: activeEnrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('status', 'ACTIVE')
    .in('student_id', studentIds);

  const hasActive = new Set((activeEnrollments ?? []).map((row) => row.student_id));

  const { data: members } = await supabase.from('members').select('id, nome').in('id', studentIds);
  const nameById = new Map((members ?? []).map((m) => [m.id, m.nome]));

  return data
    .filter((row) => !hasActive.has(row.student_id))
    .map((row) => ({
      studentId: row.student_id,
      nome: nameById.get(row.student_id) ?? '—',
      cohortCode: row.cohort_code,
      cohortName: row.cohort_name,
      completedAt: row.completed_at,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface TeacherListItem {
  teacherId: string;
  nome: string;
}

export async function listTeachersForCohortAction(cohortId: string): Promise<TeacherListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('teacher_cohorts')
    .select('teacher_id, members(nome)')
    .eq('cohort_id', cohortId);

  return (data ?? [])
    .map((row) => {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      return { teacherId: row.teacher_id, nome: member?.nome ?? '—' };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function addTeacherToCohortAction(
  cohortId: string,
  teacherId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('teacher_cohorts')
    .insert({ cohort_id: cohortId, teacher_id: teacherId });
  if (error) {
    return {
      success: false,
      message:
        error.code === '23505'
          ? 'Este professor já está vinculado a esta turma.'
          : 'Não foi possível vincular o professor.',
    };
  }
  revalidatePath(`/turmas/${cohortId}`);
  return { success: true, message: 'Professor vinculado à turma.' };
}

export async function removeTeacherFromCohortAction(
  cohortId: string,
  teacherId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('teacher_cohorts')
    .delete()
    .eq('cohort_id', cohortId)
    .eq('teacher_id', teacherId);
  if (error) return { success: false, message: 'Não foi possível remover o professor.' };
  revalidatePath(`/turmas/${cohortId}`);
  return { success: true, message: 'Professor removido da turma.' };
}

export interface CohortRosterEntry {
  enrollmentId: string;
  studentId: string;
  nome: string;
  tel: string | null;
  status: string;
  academicResult: string;
  enrolledAt: string;
  droppedOutAt: string | null;
}

export async function listCohortRosterAction(cohortId: string): Promise<CohortRosterEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('enrollments')
    .select(
      'id, student_id, status, academic_result, enrolled_at, dropped_out_at, members(nome, tel)',
    )
    .eq('cohort_id', cohortId)
    .order('enrolled_at', { ascending: false });

  return (data ?? []).map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    return {
      enrollmentId: row.id,
      studentId: row.student_id,
      nome: member?.nome ?? '—',
      tel: member?.tel ?? null,
      status: row.status,
      academicResult: row.academic_result,
      enrolledAt: row.enrolled_at,
      droppedOutAt: row.dropped_out_at,
    };
  });
}

export async function enrollEligibleStudentsAction(
  ctlCohortId: string,
  studentIds: string[],
): Promise<ActionResult & { count?: number }> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_enroll_eligible_students', {
    p_ctl_cohort_id: ctlCohortId,
    p_student_ids: studentIds,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${ctlCohortId}`);
  revalidatePath('/alunos');
  return { success: true, message: `${data} aluno(s) matriculado(s) no CTL.`, count: data ?? 0 };
}

export interface ModuleTeacherRow {
  moduleTeacherId: string | null;
  moduleNumber: number;
  lesson1Code: string;
  lesson1Title: string;
  lesson1Date: string | null;
  lesson2Code: string;
  lesson2Title: string;
  lesson2Date: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

/** Um registro por módulo do curso desta turma, com o professor responsável (se algum professor já escolheu) e a data de cada aula (se já agendada). */
export async function listModuleTeachersForCohortAction(
  cohortId: string,
): Promise<ModuleTeacherRow[]> {
  const supabase = await createClient();

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('course_id')
    .eq('id', cohortId)
    .maybeSingle();
  if (!cohort) return [];

  const [{ data: lessons }, { data: assignments }, { data: sessions }] = await Promise.all([
    supabase
      .from('lesson_templates')
      .select('id, module_number, lesson_number, lesson_code, title')
      .eq('course_id', cohort.course_id)
      .order('module_number')
      .order('lesson_number'),
    supabase
      .from('module_teachers')
      .select('id, module_number, teacher_id, members(nome)')
      .eq('cohort_id', cohortId),
    supabase
      .from('class_sessions')
      .select('lesson_template_id, class_date')
      .eq('cohort_id', cohortId)
      .neq('status', 'CANCELLED'),
  ]);

  const dateByLessonTemplateId = new Map(
    (sessions ?? []).map((s) => [s.lesson_template_id, s.class_date]),
  );

  type LessonPick = {
    id: string;
    module_number: number;
    lesson_number: number;
    lesson_code: string;
    title: string;
  };
  const byModule = new Map<number, { lesson1?: LessonPick; lesson2?: LessonPick }>();
  for (const lesson of lessons ?? []) {
    const entry = byModule.get(lesson.module_number) ?? {};
    if (lesson.lesson_number === 1) entry.lesson1 = lesson;
    else entry.lesson2 = lesson;
    byModule.set(lesson.module_number, entry);
  }

  const assignmentByModule = new Map((assignments ?? []).map((a) => [a.module_number, a]));

  return Array.from(byModule.entries())
    .sort(([a], [b]) => a - b)
    .map(([moduleNumber, { lesson1, lesson2 }]) => {
      const assignment = assignmentByModule.get(moduleNumber);
      const member = assignment
        ? Array.isArray(assignment.members)
          ? assignment.members[0]
          : assignment.members
        : null;
      return {
        moduleTeacherId: assignment?.id ?? null,
        moduleNumber,
        lesson1Code: lesson1?.lesson_code ?? '—',
        lesson1Title: lesson1?.title ?? '—',
        lesson1Date: lesson1 ? (dateByLessonTemplateId.get(lesson1.id) ?? null) : null,
        lesson2Code: lesson2?.lesson_code ?? '—',
        lesson2Title: lesson2?.title ?? '—',
        lesson2Date: lesson2 ? (dateByLessonTemplateId.get(lesson2.id) ?? null) : null,
        teacherId: assignment?.teacher_id ?? null,
        teacherName: member?.nome ?? null,
      };
    });
}

export async function removeModuleTeacherAction(moduleTeacherId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('module_teachers').delete().eq('id', moduleTeacherId);
  if (error) return { success: false, message: 'Não foi possível remover o professor do módulo.' };
  revalidatePath('/turmas');
  return { success: true, message: 'Professor removido do módulo.' };
}
