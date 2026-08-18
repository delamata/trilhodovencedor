'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { friendlyRpcError } from '@/lib/errors';
import type {
  PublicRegisterTeacherResult,
  PublicSearchMembersResult,
  PublicTeachableCohortResult,
} from '@/types/database';

/**
 * Ações do cadastro público de professor (sem login). Mesma postura de
 * segurança do check-in público de aluno: só chama as 3 funções
 * liberadas para "anon" (ver
 * supabase/migrations/20260810090000_trilho_v2_public_teacher_registration.sql),
 * identidade confirmada por nome + últimos 4 dígitos do telefone, erro
 * sempre genérico.
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

export async function listTeachableCohortsAction(): Promise<PublicTeachableCohortResult[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('trilho_public_list_teachable_cohorts');
  return data ?? [];
}

export interface RegisterTeacherResult {
  success: boolean;
  message: string;
  results: PublicRegisterTeacherResult[];
}

export async function submitPublicTeacherRegistrationAction(
  memberId: string,
  phoneSuffix: string,
  cohortIds: string[],
): Promise<RegisterTeacherResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_register_teacher', {
    p_member_id: memberId,
    p_phone_suffix: phoneSuffix.trim(),
    p_cohort_ids: cohortIds,
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), results: [] };
  }

  return { success: true, message: '', results: data ?? [] };
}
