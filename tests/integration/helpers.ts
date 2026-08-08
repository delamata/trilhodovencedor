import { createHash } from 'node:crypto';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Helpers para os testes de integração das regras críticas. Rodam
 * contra o projeto Supabase REAL configurado em .env.local — por isso
 * ficam fora de `tests/unit` e só executam via `npm run test:integration`,
 * nunca no `npm test` padrão nem no CI (ver vitest.integration.config.ts
 * e o guard em critical-rules.test.ts).
 *
 * Tudo que este arquivo cria é prefixado com TEST_PREFIX e limpo no
 * afterAll do teste — mas se algo falhar no meio, pode sobrar lixo
 * prefixado; é seguro rodar a limpeza de novo manualmente filtrando
 * por esse prefixo.
 */

export const TEST_PREFIX = 'TESTE_AUTOMATIZADO_TRILHO';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} não configurada. Os testes de integração precisam do .env.local preenchido com o projeto Supabase real.`,
    );
  }
  return value;
}

export function adminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Hash idêntico ao usado nas funções trilho_* (digest sha256 + hex, ver 20260809100300_trilho_v2_functions.sql). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Cria um usuário de teste (auth.users + members + profiles) e retorna
 * um client já autenticado como ele — usado para chamar as funções
 * trilho_* exatamente como o app faria (auth.uid() precisa resolver
 * de verdade; a service_role key sozinha não serve pra isso).
 */
export async function createTestUserSession(opts: {
  admin: SupabaseClient<Database>;
  nome: string;
  celula: string;
  isAdmin: boolean;
}): Promise<{ userId: string; memberId: string; client: SupabaseClient<Database> }> {
  const { admin, nome, celula, isAdmin } = opts;
  const email = `${TEST_PREFIX.toLowerCase()}.${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID();

  const { data: member, error: memberError } = await admin
    .from('members')
    .insert({ nome, celula, tipo: 'Adultos', posicao: 'Visitante' })
    .select('id')
    .single();
  if (memberError || !member) throw memberError ?? new Error('Falha ao criar membro de teste.');

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error('Falha ao criar usuário de teste.');

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ user_id: created.user.id, member_id: member.id, is_admin: isAdmin });
  if (profileError) throw profileError;

  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = createSupabaseClient<Database>(url, anonKey);
  const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) throw signInError ?? new Error('Falha ao logar usuário de teste.');

  const client = createSupabaseClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { userId: created.user.id, memberId: member.id, client };
}

export interface TestFixtureIds {
  userIds: string[];
  memberIds: string[];
  classSessionIds: string[];
  cohortIds: string[];
}

/** Limpa, na ordem certa (respeitando as foreign keys), tudo que os testes criaram. */
export async function cleanupFixtures(admin: SupabaseClient<Database>, ids: TestFixtureIds): Promise<void> {
  if (ids.classSessionIds.length > 0) {
    const { data: attendanceRows } = await admin
      .from('attendance')
      .select('id')
      .in('class_session_id', ids.classSessionIds);
    const attendanceIds = attendanceRows?.map((r) => r.id) ?? [];
    if (attendanceIds.length > 0) {
      await admin.from('attendance_history').delete().in('attendance_id', attendanceIds);
    }
    await admin.from('attendance').delete().in('class_session_id', ids.classSessionIds);
    await admin.from('class_sessions').delete().in('id', ids.classSessionIds);
  }
  if (ids.memberIds.length > 0) {
    await admin.from('enrollments').delete().in('student_id', ids.memberIds);
  }
  if (ids.cohortIds.length > 0) {
    await admin.from('teacher_cohorts').delete().in('cohort_id', ids.cohortIds);
    await admin.from('cohorts').delete().in('id', ids.cohortIds);
  }
  for (const userId of ids.userIds) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  if (ids.memberIds.length > 0) {
    await admin.from('members').delete().in('id', ids.memberIds);
  }
}
