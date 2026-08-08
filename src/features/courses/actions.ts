'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { courseConfigSchema, type CourseConfigInput } from '@/validations/course';
import type { CoursesRow } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function listCoursesAction(): Promise<CoursesRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('courses').select('*').order('name');
  if (error || !data) {
    return [];
  }
  return data;
}

export async function getCourseAction(courseId: string): Promise<CoursesRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
  return data ?? null;
}

export async function updateCourseConfigAction(
  courseId: string,
  input: CourseConfigInput,
): Promise<ActionResult> {
  const parsed = courseConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('courses')
    .update({
      max_absences: parsed.data.maxAbsences,
      justified_absence_counts_towards_limit: parsed.data.justifiedAbsenceCountsTowardsLimit,
      active: parsed.data.active,
    })
    .eq('id', courseId);

  if (error) {
    return { success: false, message: 'Não foi possível salvar a configuração do curso.' };
  }

  revalidatePath('/cursos');
  revalidatePath(`/cursos/${courseId}`);
  return { success: true, message: 'Configuração do curso salva com sucesso.' };
}

export interface TeacherRow {
  teacherId: string;
  nome: string;
}

export async function listTeachersForCourseAction(courseId: string): Promise<TeacherRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('teacher_courses')
    .select('teacher_id, members(nome)')
    .eq('course_id', courseId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    return { teacherId: row.teacher_id, nome: member?.nome ?? '—' };
  });
}

export async function addTeacherToCourseAction(
  courseId: string,
  teacherId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('teacher_courses')
    .insert({ course_id: courseId, teacher_id: teacherId });

  if (error) {
    return {
      success: false,
      message: error.code === '23505' ? 'Este professor já leciona este curso.' : 'Não foi possível adicionar o professor.',
    };
  }

  revalidatePath(`/cursos/${courseId}`);
  return { success: true, message: 'Professor adicionado ao curso.' };
}

export async function removeTeacherFromCourseAction(
  courseId: string,
  teacherId: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('teacher_courses')
    .delete()
    .eq('course_id', courseId)
    .eq('teacher_id', teacherId);

  if (error) {
    return { success: false, message: 'Não foi possível remover o professor.' };
  }

  revalidatePath(`/cursos/${courseId}`);
  return { success: true, message: 'Professor removido do curso.' };
}

export interface EnrolledStudentRow {
  enrollmentId: string;
  studentId: string;
  nome: string;
  enrolledAt: string;
}

export async function listActiveStudentsForCourseAction(
  courseId: string,
): Promise<EnrolledStudentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, student_id, enrolled_at, members(nome)')
    .eq('course_id', courseId)
    .eq('status', 'ACTIVE')
    .order('enrolled_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const member = Array.isArray(row.members) ? row.members[0] : row.members;
    return {
      enrollmentId: row.id,
      studentId: row.student_id,
      nome: member?.nome ?? '—',
      enrolledAt: row.enrolled_at,
    };
  });
}
