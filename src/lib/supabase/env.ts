/**
 * Leitura centralizada das variáveis de ambiente do Supabase, com
 * validação explícita — falha cedo e com mensagem clara em vez de um
 * erro genérico de rede caso alguém esqueça de configurar o .env.local.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente "${name}" não configurada. Copie .env.example para ` +
        `.env.local e preencha com os dados do projeto Supabase (veja o README).`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}
