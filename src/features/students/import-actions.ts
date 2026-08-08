'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';
import { friendlyRpcError } from '@/lib/errors';

export interface ImportStudentRow {
  nome: string;
  email: string;
  tel: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  errors: { row: number; nome: string; message: string }[];
}

/**
 * Importação em lote de alunos direto numa turma (cohort) específica.
 * Formato: nome,email,telefone. A tabela members do Oikos exige uma
 * célula (not null); como o CSV não inclui esse campo, o admin escolhe
 * uma célula única para aplicar a todo o lote no diálogo de importação.
 *
 * Cada linha, na ordem: cria o membro, convida o login por e-mail e
 * matricula na turma via trilho_enroll_student. Uma linha com erro não
 * interrompe as demais — o resultado reporta linha a linha, só depois
 * de confirmado pelo ADMIN (a validação/preview acontece antes, no
 * cliente).
 */
export async function importStudentsAction(
  rows: ImportStudentRow[],
  celula: string,
  cohortId: string,
): Promise<ImportResult> {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const errors: ImportResult['errors'] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({ nome: row.nome, celula, tipo: 'Adultos', posicao: 'Visitante', tel: row.tel || null })
      .select('id')
      .single();

    if (memberError || !member) {
      errors.push({ row: i + 1, nome: row.nome, message: 'Não foi possível cadastrar o aluno.' });
      continue;
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      row.email,
      { redirectTo: `${siteUrl}/redefinir-senha` },
    );

    if (inviteError || !invited.user) {
      errors.push({
        row: i + 1,
        nome: row.nome,
        message: inviteError?.message?.toLowerCase().includes('already registered')
          ? 'E-mail já cadastrado em outro login.'
          : 'Não foi possível enviar o convite de acesso.',
      });
      continue;
    }

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ user_id: invited.user.id, member_id: member.id, is_admin: false });

    if (profileError) {
      errors.push({ row: i + 1, nome: row.nome, message: 'Não foi possível vincular o login criado.' });
      continue;
    }

    const { error: enrollError } = await supabase.rpc('trilho_enroll_student', {
      p_student_id: member.id,
      p_cohort_id: cohortId,
    });

    if (enrollError) {
      errors.push({ row: i + 1, nome: row.nome, message: friendlyRpcError(enrollError.message) });
      continue;
    }

    imported += 1;
  }

  revalidatePath('/alunos');
  revalidatePath('/turmas');
  revalidatePath(`/turmas/${cohortId}`);

  return { total: rows.length, imported, errors };
}
