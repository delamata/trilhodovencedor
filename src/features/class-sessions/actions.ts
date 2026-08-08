'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import { mergeRosterWithAttendance, type RosterEntry } from '@/lib/domain/roster';
import {
  cancelClassSessionSchema,
  createClassSessionSchema,
  updateClassSessionSchema,
  type CancelClassSessionInput,
  type CreateClassSessionInput,
  type UpdateClassSessionInput,
} from '@/validations/class';
import type { AttendanceStatus, ClassSessionStatus } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface ClassSessionListItem {
  id: string;
  cohortId: string;
  cohortName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  lessonTemplateId: string;
  lessonCode: string;
  lessonTitle: string;
  classDate: string;
  startTime: string;
  endTime: string;
  status: ClassSessionStatus;
}

function mapSessionRow(row: {
  id: string;
  cohort_id: string;
  lesson_template_id: string;
  class_date: string;
  start_time: string;
  end_time: string;
  status: ClassSessionStatus;
  lesson_templates: unknown;
  cohorts: unknown;
}): ClassSessionListItem {
  const lesson = Array.isArray(row.lesson_templates)
    ? row.lesson_templates[0]
    : row.lesson_templates;
  const cohort = Array.isArray(row.cohorts) ? row.cohorts[0] : row.cohorts;
  const course = cohort?.courses
    ? Array.isArray(cohort.courses)
      ? cohort.courses[0]
      : cohort.courses
    : null;

  return {
    id: row.id,
    cohortId: row.cohort_id,
    cohortName: cohort?.name ?? '—',
    courseId: course?.id ?? '',
    courseCode: course?.code ?? '—',
    courseName: course?.name ?? '—',
    lessonTemplateId: row.lesson_template_id,
    lessonCode: lesson?.lesson_code ?? '—',
    lessonTitle: lesson?.title ?? '—',
    classDate: row.class_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  };
}

export async function listClassSessionsForCohortAction(
  cohortId: string,
): Promise<ClassSessionListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('class_sessions')
    .select(
      'id, cohort_id, lesson_template_id, class_date, start_time, end_time, status, lesson_templates(lesson_code, title), cohorts(name, courses(id, code, name))',
    )
    .eq('cohort_id', cohortId)
    .order('class_date')
    .order('start_time');

  return (data ?? []).map(mapSessionRow);
}

/** Próximas aulas dos professores (turmas em que ele está vinculado via teacher_cohorts). */
export async function listUpcomingClassSessionsForTeacherAction(
  cohortIds: string[],
): Promise<ClassSessionListItem[]> {
  if (cohortIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('class_sessions')
    .select(
      'id, cohort_id, lesson_template_id, class_date, start_time, end_time, status, lesson_templates(lesson_code, title), cohorts(name, courses(id, code, name))',
    )
    .in('cohort_id', cohortIds)
    .neq('status', 'CANCELLED')
    .order('class_date')
    .order('start_time');

  return (data ?? []).map(mapSessionRow);
}

export interface ClassSessionDetail extends ClassSessionListItem {
  notes: string | null;
  maxAbsences: number;
  roster: RosterEntry[];
}

export async function getClassSessionDetailAction(
  classSessionId: string,
): Promise<ClassSessionDetail | null> {
  const supabase = await createClient();

  const { data: sessionRow } = await supabase
    .from('class_sessions')
    .select(
      'id, cohort_id, lesson_template_id, class_date, start_time, end_time, status, notes, lesson_templates(lesson_code, title), cohorts(name, courses(id, code, name, max_absences))',
    )
    .eq('id', classSessionId)
    .maybeSingle();

  if (!sessionRow) return null;

  const base = mapSessionRow(sessionRow);
  const cohort = Array.isArray(sessionRow.cohorts) ? sessionRow.cohorts[0] : sessionRow.cohorts;
  const course = cohort?.courses
    ? Array.isArray(cohort.courses)
      ? cohort.courses[0]
      : cohort.courses
    : null;

  const [{ data: enrollments }, { data: attendanceRows }] = await Promise.all([
    supabase
      .from('enrollments')
      .select('student_id, members(nome)')
      .eq('cohort_id', sessionRow.cohort_id)
      .eq('status', 'ACTIVE'),
    supabase
      .from('attendance')
      .select('id, student_id, status, source, checked_in_at')
      .eq('class_session_id', classSessionId),
  ]);

  const roster = mergeRosterWithAttendance(
    (enrollments ?? []).map((e) => {
      const member = Array.isArray(e.members) ? e.members[0] : e.members;
      return { studentId: e.student_id, nome: member?.nome ?? '—' };
    }),
    (attendanceRows ?? []).map((a) => ({
      id: a.id,
      studentId: a.student_id,
      status: a.status,
      source: a.source,
      checkedInAt: a.checked_in_at,
    })),
  );

  return {
    ...base,
    notes: sessionRow.notes,
    maxAbsences: course?.max_absences ?? 0,
    roster,
  };
}

export async function createClassSessionAction(
  input: CreateClassSessionInput,
): Promise<ActionResult> {
  const parsed = createClassSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_create_class_session', {
    p_cohort_id: parsed.data.cohortId,
    p_lesson_template_id: parsed.data.lessonTemplateId,
    p_class_date: parsed.data.date,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_notes: parsed.data.notes || null,
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath(`/turmas/${parsed.data.cohortId}`);
  return { success: true, message: 'Aula criada com sucesso.' };
}

export async function cancelClassSessionAction(
  input: CancelClassSessionInput,
): Promise<ActionResult> {
  const parsed = cancelClassSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_cancel_class_session', {
    p_class_session_id: parsed.data.classSessionId,
    p_reason: parsed.data.reason || null,
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath('/aulas');
  revalidatePath(`/aulas/${parsed.data.classSessionId}`);
  return { success: true, message: 'Aula cancelada.' };
}

export async function updateClassSessionAction(
  input: UpdateClassSessionInput,
): Promise<ActionResult> {
  const parsed = updateClassSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_update_class_session', {
    p_class_session_id: parsed.data.classSessionId,
    p_lesson_template_id: parsed.data.lessonTemplateId,
    p_class_date: parsed.data.date,
    p_start_time: parsed.data.startTime,
    p_end_time: parsed.data.endTime,
    p_notes: parsed.data.notes || null,
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath(`/aulas/${parsed.data.classSessionId}`);
  return { success: true, message: 'Aula atualizada.' };
}

export async function deleteClassSessionAction(classSessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_delete_class_session', {
    p_class_session_id: classSessionId,
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath('/turmas');
  return { success: true, message: 'Aula excluída.' };
}

export async function openClassSessionAction(classSessionId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_open_class_session', {
    p_class_session_id: classSessionId,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath(`/aulas/${classSessionId}`);
  return { success: true, message: 'Chamada aberta.' };
}

export async function closeClassSessionAction(
  classSessionId: string,
): Promise<ActionResult & { markedPresent?: number; markedAbsent?: number }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_close_class_session', {
    p_class_session_id: classSessionId,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath(`/aulas/${classSessionId}`);
  const result = data?.[0];
  return {
    success: true,
    message: result
      ? `Chamada encerrada: ${result.marked_present} presente(s), ${result.marked_absent} falta(s) lançada(s) automaticamente.`
      : 'Chamada encerrada.',
    markedPresent: result?.marked_present,
    markedAbsent: result?.marked_absent,
  };
}

export async function markAttendanceAction(
  classSessionId: string,
  studentId: string,
  status: AttendanceStatus,
  reason?: string,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('trilho_mark_attendance', {
    p_class_session_id: classSessionId,
    p_student_id: studentId,
    p_status: status,
    p_reason: reason || null,
  });
  if (error) return { success: false, message: friendlyRpcError(error.message) };
  revalidatePath(`/aulas/${classSessionId}`);
  return { success: true, message: 'Presença atualizada.' };
}
