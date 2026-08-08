'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';
import {
  changeEnrollmentSchema,
  enrollStudentSchema,
  endEnrollmentSchema,
  type ChangeEnrollmentInput,
  type EndEnrollmentInput,
  type EnrollStudentInput,
} from '@/validations/enrollment';

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Garante que o aluno (membro) tenha login (auth.users + profiles).
 * Se já existir um profile vinculado a esse member_id (ex.: já era
 * líder no Oikos), não faz nada — reaproveita o login existente.
 * Caso contrário, convida por e-mail (Supabase Admin API), igual ao
 * fluxo que o Oikos já usa para líderes (Authentication → Invite).
 */
async function ensureStudentLogin(
  memberId: string,
  email: string | undefined,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('member_id', memberId)
    .maybeSingle();

  if (existingProfile) {
    return { success: true, message: 'Aluno já possui login.' };
  }

  if (!email) {
    return {
      success: false,
      message: 'Informe o e-mail do aluno para criar o login de acesso.',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const admin = createAdminClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/redefinir-senha`,
  });

  if (inviteError || !invited.user) {
    const alreadyExists = inviteError?.message?.toLowerCase().includes('already registered');
    return {
      success: false,
      message: alreadyExists
        ? 'Já existe um login com este e-mail, mas ele não está vinculado a este aluno. Verifique o cadastro.'
        : 'Não foi possível enviar o convite de acesso para este e-mail.',
    };
  }

  const { error: profileError } = await admin.from('profiles').insert({
    user_id: invited.user.id,
    member_id: memberId,
    is_admin: false,
  });

  if (profileError) {
    return { success: false, message: 'Não foi possível vincular o login criado ao aluno.' };
  }

  return { success: true, message: 'Convite de acesso enviado.' };
}

export async function enrollStudentAction(input: EnrollStudentInput): Promise<ActionResult> {
  const parsed = enrollStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  let studentId: string;
  let email: string | undefined;

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
      return { success: false, message: 'Não foi possível cadastrar o novo aluno.' };
    }

    studentId = member.id;
    email = parsed.data.email;
  }

  const loginResult = await ensureStudentLogin(studentId, email);
  if (!loginResult.success) {
    return loginResult;
  }

  const { error: enrollError } = await supabase.rpc('trilho_enroll_student', {
    p_student_id: studentId,
    p_course_id: parsed.data.courseId,
  });

  if (enrollError) {
    return { success: false, message: friendlyRpcError(enrollError.message) };
  }

  revalidatePath('/cursos');
  revalidatePath('/alunos');
  return { success: true, message: 'Aluno matriculado com sucesso.' };
}

export async function changeEnrollmentAction(input: ChangeEnrollmentInput): Promise<ActionResult> {
  const parsed = changeEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_change_enrollment', {
    p_student_id: parsed.data.studentId,
    p_new_course_id: parsed.data.newCourseId,
    p_end_status: parsed.data.endStatus,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/cursos');
  revalidatePath('/alunos');
  return { success: true, message: 'Matrícula atualizada com sucesso.' };
}

export async function endEnrollmentAction(input: EndEnrollmentInput): Promise<ActionResult> {
  const parsed = endEnrollmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('trilho_end_enrollment', {
    p_enrollment_id: parsed.data.enrollmentId,
    p_status: parsed.data.status,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message) };
  }

  revalidatePath('/cursos');
  revalidatePath('/alunos');
  return { success: true, message: 'Matrícula encerrada com sucesso.' };
}
