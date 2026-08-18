'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { friendlyRpcError } from '@/lib/errors';
import type {
  PublicCreateMemberResult,
  PublicRegisterTeacherModulesResult,
  PublicSearchMembersResult,
  PublicTeachableModuleResult,
} from '@/types/database';

/**
 * Ações do cadastro público de professor (sem login). Mesma postura de
 * segurança do check-in público de aluno: só chama as funções
 * liberadas para "anon" (ver
 * supabase/migrations/20260810090000_trilho_v2_public_teacher_registration.sql
 * e 20260810100000_trilho_v2_module_teachers.sql), identidade
 * confirmada por nome + últimos 4 dígitos do telefone, erro sempre
 * genérico. A unidade de escolha é o MÓDULO (não a turma inteira) —
 * cada módulo só pode ter um professor.
 */

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return h.get('x-real-ip');
}

export interface SearchMembersResult {
  success: boolean;
  message: string;
  members: PublicSearchMembersResult[];
}

export async function searchPublicMembersAction(query: string): Promise<SearchMembersResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_search_members', {
    p_name_query: query,
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), members: [] };
  }

  return { success: true, message: '', members: data ?? [] };
}

export interface CreateMemberResult {
  success: boolean;
  message: string;
  member: PublicCreateMemberResult | null;
}

/**
 * Cadastra um professor que ainda não é membro conhecido do sistema.
 * Não pede célula — só discipuladores pra cima se cadastram aqui, e
 * quem cuida da célula de verdade desse membro é o cadastro no Oikos.
 */
export async function createPublicMemberAction(
  nome: string,
  tel: string,
): Promise<CreateMemberResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_create_member', {
    p_nome: nome,
    p_tel: tel,
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), member: null };
  }

  return { success: true, message: '', member: data?.[0] ?? null };
}

export async function listTeachableModulesAction(): Promise<PublicTeachableModuleResult[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('trilho_public_list_teachable_modules');
  return data ?? [];
}

export interface RegisterModulesResult {
  success: boolean;
  message: string;
  results: PublicRegisterTeacherModulesResult[];
}

export async function submitModuleRegistrationAction(
  memberId: string,
  phoneSuffix: string,
  selections: { cohortId: string; moduleNumber: number }[],
): Promise<RegisterModulesResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_register_teacher_modules', {
    p_member_id: memberId,
    p_phone_suffix: phoneSuffix.trim(),
    p_cohort_ids: selections.map((s) => s.cohortId),
    p_module_numbers: selections.map((s) => s.moduleNumber),
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), results: [] };
  }

  return { success: true, message: '', results: data ?? [] };
}
