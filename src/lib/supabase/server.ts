import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

/**
 * Client Supabase para uso em Server Components, Server Actions e
 * Route Handlers. Propaga a sessão do usuário via cookies — é essa
 * sessão que faz `auth.uid()` funcionar dentro das funções RPC
 * SECURITY DEFINER (trilho_member_id(), trilho_is_admin(), etc.).
 *
 * Nunca use isto para identificar "quem é o aluno" a partir de um ID
 * enviado pelo cliente — o aluno é sempre quem está autenticado nesta
 * sessão, resolvido no banco via trilho_member_id().
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component (sem permissão de
          // escrever cookies). Seguro ignorar quando há middleware
          // fazendo o refresh de sessão (ver src/middleware.ts).
        }
      },
    },
  });
}
