import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env';

/**
 * Client Supabase com a service_role key — ignora RLS completamente.
 *
 * USO RESTRITO a operações administrativas de servidor que
 * genuinamente precisam de privilégio elevado, por exemplo:
 *   - criar login (auth.users) de um aluno/professor na hora da
 *     matrícula (Admin API: auth.admin.createUser);
 *   - importação em lote de alunos.
 *
 * NUNCA importe este módulo em código que roda no navegador — o
 * import "server-only" no topo faz o build falhar se isso acontecer
 * por engano. Toda operação feita com este client deve, ela mesma,
 * checar trilho_is_admin() (via o client de sessão do usuário) antes
 * de agir, porque este client sozinho não sabe quem é o chamador.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
