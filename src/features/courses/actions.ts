'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import { courseConfigSchema, type CourseConfigInput } from '@/validations/course';
import type { CoursesRow, LessonTemplatesRow } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function listCoursesAction(): Promise<CoursesRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('courses').select('*').order('name');
  if (error || !data) return [];
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

// ---------------------------------------------------------------------
// Estrutura acadêmica (módulos/aulas — lesson_templates)
// ---------------------------------------------------------------------
export interface ModuleGroup {
  moduleNumber: number;
  lessons: LessonTemplatesRow[];
}

export async function listCourseStructureAction(courseId: string): Promise<ModuleGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lesson_templates')
    .select('*')
    .eq('course_id', courseId)
    .order('module_number')
    .order('lesson_number');

  const byModule = new Map<number, LessonTemplatesRow[]>();
  for (const row of data ?? []) {
    const list = byModule.get(row.module_number) ?? [];
    list.push(row);
    byModule.set(row.module_number, list);
  }

  return Array.from(byModule.entries())
    .sort(([a], [b]) => a - b)
    .map(([moduleNumber, lessons]) => ({ moduleNumber, lessons }));
}

export async function addModuleAction(
  courseId: string,
  lesson1Title: string,
  lesson2Title: string,
  description?: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_add_module', {
    p_course_id: courseId,
    p_lesson1_title: lesson1Title,
    p_lesson2_title: lesson2Title,
    p_description: description || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath(`/cursos/${courseId}`);
  return { success: true, message: 'Módulo criado com sucesso.' };
}

export async function updateLessonTemplateAction(
  lessonTemplateId: string,
  title: string,
  description?: string,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_update_lesson_template', {
    p_id: lessonTemplateId,
    p_title: title,
    p_description: description || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/cursos');
  return { success: true, message: 'Aula atualizada com sucesso.' };
}
