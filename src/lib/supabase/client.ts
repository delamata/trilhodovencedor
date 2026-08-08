'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

/**
 * Client Supabase para uso em Client Components. Usa a chave anon
 * pública — toda a segurança real vem do RLS (ver supabase/migrations),
 * nunca do sigilo desta chave.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
