'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/current-user';

export interface MemberSearchResult {
  id: string;
  nome: string;
  celula: string;
  tel: string | null;
}

/**
 * Busca membros por nome (para o fluxo de matrícula). Reaproveita a
 * tabela `members` do Oikos — a visibilidade é a do RLS já existente
 * lá (`members_select_scope`): como ADMIN do Trilho é sempre
 * `profiles.is_admin = true`, e isso já dá acesso total no Oikos, o
 * admin sempre enxerga todo mundo aqui.
 */
export async function searchMembersAction(query: string): Promise<MemberSearchResult[]> {
  await requireAdmin();
  const supabase = await createClient();

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from('members')
    .select('id, nome, celula, tel')
    .ilike('nome', `%${trimmed}%`)
    .eq('active', true)
    .order('nome')
    .limit(20);

  if (error) {
    return [];
  }

  return data ?? [];
}

/** Lista as células conhecidas (tabela `celula_hierarquia` do Oikos), para o formulário de novo aluno. */
export async function getCelulaOptionsAction(): Promise<string[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('celula_hierarquia')
    .select('celula')
    .order('celula');

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.celula as string);
}
