'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import {
  cancelClassSchema,
  createClassSchema,
  generateCtlSchema,
  type CancelClassInput,
  type CreateClassInput,
  type GenerateCtlInput,
} from '@/validations/class';
import type { ClassesRow } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface ClassListItem extends ClassesRow {
  courseCode: string;
  courseName: string;
}

export async function listClassesAction(): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .select('*, courses(code, name)')
    .order('class_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const { courses: _courses, ...rest } = row;
    return { ...rest, courseCode: course?.code ?? '—', courseName: course?.name ?? '—' };
  });
}

export async function createClassAction(input: CreateClassInput): Promise<ActionResult> {
  const parsed = createClassSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();
  const data = parsed.data;

  const { error } = await supabase.rpc('trilho_create_class', {
    p_course_id: data.courseId,
    p_class_number: data.classNumber,
    p_title: data.title,
    p_class_date: data.date,
    p_start_time: data.startTime,
    p_end_time: data.endTime,
    p_notes: data.notes || null,
    p_also_create_ctl: data.alsoCreateCtl,
    p_ctl_class_number: data.ctlClassNumber ?? null,
    p_ctl_title: data.ctlTitle || null,
    p_ctl_start_time: data.ctlStartTime || null,
    p_ctl_end_time: data.ctlEndTime || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/calendario');
  revalidatePath('/aulas');
  return {
    success: true,
    message: data.alsoCreateCtl
      ? 'Aula criada com sucesso, junto com a aula correspondente de CTL.'
      : 'Aula criada com sucesso.',
  };
}

export async function cancelClassAction(input: CancelClassInput): Promise<ActionResult> {
  const parsed = cancelClassSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_cancel_class', {
    p_class_id: parsed.data.classId,
    p_reason: parsed.data.reason || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/calendario');
  revalidatePath('/aulas');
  return { success: true, message: 'Aula cancelada. Ela não vai gerar falta para os alunos.' };
}

export async function generateCtlFromClassAction(input: GenerateCtlInput): Promise<ActionResult> {
  const parsed = generateCtlSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_generate_ctl_from_class', {
    p_maturidade_class_id: parsed.data.maturidadeClassId,
    p_ctl_start_time: parsed.data.ctlStartTime || null,
    p_ctl_end_time: parsed.data.ctlEndTime || null,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/calendario');
  revalidatePath('/aulas');
  return { success: true, message: 'Aula de CTL gerada com sucesso.' };
}

export interface BatchImportRow {
  classNumber: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  alsoCreateCtl?: boolean;
  notes?: string;
}

export interface BatchImportResult {
  total: number;
  imported: number;
  errors: { row: number; message: string }[];
}

/**
 * Importação em lote de calendário (seção 6/18). Usada tanto pelo
 * arquivo `src/data/seeds/maturidade-calendar.ts` quanto por uma
 * colagem manual no painel. Cada linha é criada com
 * `trilho_create_class` — se uma falhar, as outras continuam (o
 * resultado reporta linha a linha).
 */
export async function batchImportClassesAction(
  courseId: string,
  rows: BatchImportRow[],
): Promise<BatchImportResult> {
  await requireAdmin();
  const supabase = await createClient();

  const errors: { row: number; message: string }[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const { error } = await supabase.rpc('trilho_create_class', {
      p_course_id: courseId,
      p_class_number: row.classNumber,
      p_title: row.title,
      p_class_date: row.date,
      p_start_time: row.startTime,
      p_end_time: row.endTime,
      p_notes: row.notes || null,
      p_also_create_ctl: row.alsoCreateCtl ?? false,
    });

    if (error) {
      errors.push({ row: i + 1, message: friendlyRpcError(error.message) });
    } else {
      imported += 1;
    }
  }

  revalidatePath('/calendario');
  revalidatePath('/aulas');

  return { total: rows.length, imported, errors };
}
