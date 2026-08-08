'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import {
  importCourseScheduleSchema,
  type CourseScheduleRow,
} from '@/validations/course-schedule-import';
import type { AddModuleResult } from '@/types/database';

export interface ImportScheduleResult {
  total: number;
  imported: number;
  modulesCreated: number;
  skipped: { row: number; message: string }[];
  errors: { row: number; message: string }[];
}

/**
 * Importa em lote a estrutura acadêmica (módulos/aulas — em pares, 2
 * linhas = 1 módulo, seguindo o "numero" de cada linha) E já agenda
 * cada aula na turma escolhida, num único upload. Idempotente: se o
 * módulo já existe no curso (mesmo module_number/lesson_number), reusa
 * em vez de tentar recriar; se a aula já está agendada nesta turma
 * (mesmo lesson_template_id), pula em vez de duplicar.
 */
export async function importCourseScheduleAction(
  cohortId: string,
  rows: CourseScheduleRow[],
): Promise<ImportScheduleResult & { success: boolean; message: string }> {
  const parsed = importCourseScheduleSchema.safeParse({ cohortId, rows });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      total: rows.length,
      imported: 0,
      modulesCreated: 0,
      skipped: [],
      errors: [],
    };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, course_id')
    .eq('id', cohortId)
    .maybeSingle();

  if (!cohort) {
    return {
      success: false,
      message: 'Turma não encontrada.',
      total: rows.length,
      imported: 0,
      modulesCreated: 0,
      skipped: [],
      errors: [],
    };
  }

  const { data: existingLessons } = await supabase
    .from('lesson_templates')
    .select('id, module_number, lesson_number')
    .eq('course_id', cohort.course_id);

  const lessonIdByPosition = new Map<string, string>(
    (existingLessons ?? []).map((l) => [`${l.module_number}-${l.lesson_number}`, l.id]),
  );

  const { data: existingSessions } = await supabase
    .from('class_sessions')
    .select('lesson_template_id')
    .eq('cohort_id', cohortId);
  const scheduledLessonIds = new Set((existingSessions ?? []).map((s) => s.lesson_template_id));

  const sortedRows = [...parsed.data.rows].sort((a, b) => a.numero - b.numero);

  // Agrupa por módulo (2 linhas por módulo: numero ímpar = aula 1, par = aula 2).
  const byModule = new Map<number, { lesson1?: CourseScheduleRow; lesson2?: CourseScheduleRow }>();
  for (const row of sortedRows) {
    const moduleNumber = Math.ceil(row.numero / 2);
    const lessonNumber = row.numero % 2 === 1 ? 1 : 2;
    const entry = byModule.get(moduleNumber) ?? {};
    if (lessonNumber === 1) entry.lesson1 = row;
    else entry.lesson2 = row;
    byModule.set(moduleNumber, entry);
  }

  const errors: ImportScheduleResult['errors'] = [];
  const skipped: ImportScheduleResult['skipped'] = [];
  let modulesCreated = 0;
  let imported = 0;

  for (const [moduleNumber, { lesson1, lesson2 }] of [...byModule.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const lesson1Existing = lessonIdByPosition.get(`${moduleNumber}-1`);
    const lesson2Existing = lessonIdByPosition.get(`${moduleNumber}-2`);

    if (!lesson1Existing || !lesson2Existing) {
      if (!lesson1 || !lesson2) {
        const presentRow = lesson1 ?? lesson2;
        errors.push({
          row: presentRow?.numero ?? moduleNumber * 2,
          message: `Módulo ${moduleNumber} incompleto — faltam as 2 aulas (a estrutura acadêmica exige um par completo).`,
        });
        continue;
      }

      const { data, error } = await supabase.rpc('trilho_add_module', {
        p_course_id: cohort.course_id,
        p_lesson1_title: lesson1.titulo,
        p_lesson2_title: lesson2.titulo,
      });

      if (error) {
        errors.push({ row: lesson1.numero, message: friendlyRpcError(error.message) });
        errors.push({ row: lesson2.numero, message: friendlyRpcError(error.message) });
        continue;
      }

      const result = (data as AddModuleResult[])[0];
      if (result) {
        lessonIdByPosition.set(`${moduleNumber}-1`, result.lesson1_id);
        lessonIdByPosition.set(`${moduleNumber}-2`, result.lesson2_id);
        modulesCreated += 1;
      }
    }

    for (const row of [lesson1, lesson2]) {
      if (!row) continue;
      const lessonId = lessonIdByPosition.get(`${moduleNumber}-${row.numero % 2 === 1 ? 1 : 2}`);
      if (!lessonId) {
        errors.push({ row: row.numero, message: 'Não foi possível resolver a aula do módulo.' });
        continue;
      }

      if (scheduledLessonIds.has(lessonId)) {
        skipped.push({
          row: row.numero,
          message: 'Esta aula já está agendada nesta turma — pulada.',
        });
        continue;
      }

      const { error: sessionError } = await supabase.rpc('trilho_create_class_session', {
        p_cohort_id: cohortId,
        p_lesson_template_id: lessonId,
        p_class_date: row.data,
        p_start_time: row.horarioInicio,
        p_end_time: row.horarioFim,
      });

      if (sessionError) {
        errors.push({ row: row.numero, message: friendlyRpcError(sessionError.message) });
        continue;
      }

      scheduledLessonIds.add(lessonId);
      imported += 1;
    }
  }

  revalidatePath(`/turmas/${cohortId}`);
  revalidatePath('/cursos');

  const message = `${imported} aula(s) agendada(s)${modulesCreated > 0 ? `, ${modulesCreated} módulo(s) novo(s) criado(s)` : ''}${skipped.length > 0 ? `, ${skipped.length} já existia(m)` : ''}${errors.length > 0 ? `, ${errors.length} com erro` : ''}.`;

  return {
    success: errors.length === 0,
    message,
    total: rows.length,
    imported,
    modulesCreated,
    skipped,
    errors,
  };
}
