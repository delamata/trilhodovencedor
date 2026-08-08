'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import {
  enrollStudentSchema,
  markDropoutSchema,
  type EnrollStudentInput,
  type MarkDropoutInput,
} from '@/validations/enrollment';
import type { TrilhoDropoutReportRow } from '@/types/database';

export interface ActionResult {
  success: boolean;
  message: string;
}

/** Matricula um aluno existente, ou cria um aluno novo e já matricula, numa turma específica. */
export async function enrollStudentAction(input: EnrollStudentInput): Promise<ActionResult> {
  const parsed = enrollStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  let studentId: string;

  if (parsed.data.mode === 'existing') {
    studentId = parsed.data.studentId;
  } else {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        nome: parsed.data.nome,
        celula: parsed.data.celula,
        tipo: 'Adultos',
        posicao: 'Visitante',
        tel: parsed.data.tel || null,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      return { success: false, message: 'Não foi possível cadastrar o aluno.' };
    }
    studentId = member.id;
  }

  const { error } = await supabase.rpc('trilho_enroll_student', {
    p_student_id: studentId,
    p_cohort_id: parsed.data.cohortId,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/alunos');
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${parsed.data.cohortId}`);
  return { success: true, message: 'Aluno matriculado com sucesso.' };
}

export async function endEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_end_enrollment', {
    p_enrollment_id: enrollmentId,
    p_status: 'CANCELLED',
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath('/alunos');
  revalidatePath('/turmas');
  return { success: true, message: 'Matrícula encerrada.' };
}

export async function markDropoutAction(input: MarkDropoutInput): Promise<ActionResult> {
  const parsed = markDropoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_mark_dropout', {
    p_enrollment_id: parsed.data.enrollmentId,
    p_dropped_out_at: parsed.data.droppedOutAt,
    p_reason: parsed.data.reason || null,
    p_notes: parsed.data.notes || null,
  });

  if (error) return { success: false, message: friendlyRpcError(error.message) };

  revalidatePath('/alunos');
  revalidatePath('/turmas');
  revalidatePath('/relatorios');
  return { success: true, message: 'Desistência registrada.' };
}

export async function listDropoutReportAction(): Promise<TrilhoDropoutReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('trilho_dropout_report')
    .select('*')
    .order('dropped_out_at', { ascending: false });
  return data ?? [];
}
