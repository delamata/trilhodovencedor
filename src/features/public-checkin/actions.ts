'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { friendlyRpcError } from '@/lib/errors';
import type { PublicCheckinResult, PublicGetStatusResult, PublicSearchStudentsResult } from '@/types/database';

/**
 * Ações do check-in público (sem login — seção 19-28). Chamam só as 3
 * funções liberadas para o role "anon" (ver
 * supabase/migrations/*_trilho_v2_rls.sql). Mesmo um usuário logado
 * que acesse este link usa este mesmo caminho, sem nenhuma
 * dependência da sessão dele.
 */

async function clientIp(): Promise<string | null> {
  const h = await headers();
  // Vercel/proxies padrão: x-forwarded-for pode ter uma lista "cliente, proxy1, proxy2".
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return h.get('x-real-ip');
}

export interface PublicStatusResult {
  success: boolean;
  message: string;
  status: PublicGetStatusResult | null;
}

export async function getPublicStatusAction(cohortCode: string, token: string): Promise<PublicStatusResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trilho_public_get_status', {
    p_cohort_code: cohortCode,
    p_token: token,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), status: null };
  }

  return { success: true, message: '', status: data?.[0] ?? null };
}

export interface SearchResult {
  success: boolean;
  message: string;
  students: PublicSearchStudentsResult[];
}

export async function searchPublicStudentsAction(
  cohortCode: string,
  token: string,
  query: string,
): Promise<SearchResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_search_students', {
    p_cohort_code: cohortCode,
    p_token: token,
    p_name_query: query,
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), students: [] };
  }

  return { success: true, message: '', students: data ?? [] };
}

export interface CheckinResult {
  success: boolean;
  message: string;
  result: PublicCheckinResult | null;
}

export async function submitPublicCheckinAction(
  cohortCode: string,
  token: string,
  studentId: string,
  phoneSuffix: string,
): Promise<CheckinResult> {
  const supabase = await createClient();
  const ip = await clientIp();

  const { data, error } = await supabase.rpc('trilho_public_checkin', {
    p_cohort_code: cohortCode,
    p_token: token,
    p_student_id: studentId,
    p_phone_suffix: phoneSuffix.trim(),
    p_ip: ip,
  });

  if (error) {
    return { success: false, message: friendlyRpcError(error.message), result: null };
  }

  return { success: true, message: '', result: data?.[0] ?? null };
}
