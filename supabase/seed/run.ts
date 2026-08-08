/**
 * Seed de desenvolvimento. Cria:
 *   - os cursos MATURIDADE/CTL (idempotente, mesmo efeito de 01_courses.sql)
 *   - 2 módulos (4 aulas) de estrutura acadêmica para cada curso
 *   - 1 turma ACTIVE de cada curso, com a turma de Maturidade apontando
 *     a de CTL como next_ctl_cohort_id
 *   - 1 ADMIN, 1 PROFESSOR (vinculado às duas turmas), 5 alunos de
 *     Maturidade, 5 alunos de CTL (usuários fake, só para dev)
 *
 * ⚠️ ATENÇÃO: este projeto usa o MESMO Supabase do app Oikos. Rodar
 * este script cria pessoas e logins de verdade nesse banco. Só rode
 * contra um projeto Supabase que seja realmente de desenvolvimento/
 * teste — nunca contra o projeto usado pela igreja em produção.
 *
 * Uso:
 *   npm run seed
 *
 * Todas as senhas gastas aqui são fixas e óbvias (ver DEV_PASSWORD
 * abaixo) — servem só para login local durante o desenvolvimento.
 * Nunca são usadas em produção e nunca representam credenciais reais.
 *
 * Este script usa a service role key, que ignora RLS — por isso grava
 * direto nas tabelas (lesson_templates/cohorts/enrollments) em vez de
 * chamar as funções trilho_* (elas checam trilho_is_admin() via
 * auth.uid(), que é null numa sessão de service role).
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

const DEV_PASSWORD = 'trilho-dev-2026';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Defina ${name} em .env.local antes de rodar o seed.`);
  }
  return value;
}

function lessonCode(prefix: string, moduleNumber: number, lessonNumber: number): string {
  return `${prefix}${String(moduleNumber).padStart(2, '0')}-${String(lessonNumber).padStart(2, '0')}`;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed de desenvolvimento não pode rodar com NODE_ENV=production.');
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('→ Semeando cursos…');
  const { data: courses, error: coursesError } = await admin
    .from('courses')
    .upsert(
      [
        {
          code: 'MATURIDADE',
          name: 'Maturidade',
          lesson_code_prefix: 'MA',
          max_absences: 7,
          justified_absence_counts_towards_limit: false,
          active: true,
        },
        {
          code: 'CTL',
          name: 'CTL',
          lesson_code_prefix: 'CT',
          max_absences: 6,
          justified_absence_counts_towards_limit: false,
          active: true,
        },
      ],
      { onConflict: 'code' },
    )
    .select('id, code, lesson_code_prefix');
  if (coursesError || !courses) throw coursesError ?? new Error('Falha ao semear cursos.');

  const maturidade = courses.find((c) => c.code === 'MATURIDADE')!;
  const ctl = courses.find((c) => c.code === 'CTL')!;

  console.log('→ Semeando estrutura acadêmica (módulos/aulas)…');
  async function seedModules(courseId: string, prefix: string, titles: [string, string][]) {
    const { data: existing } = await admin
      .from('lesson_templates')
      .select('module_number')
      .eq('course_id', courseId);
    if (existing && existing.length > 0) return;

    let order = 0;
    for (let m = 0; m < titles.length; m += 1) {
      const moduleNumber = m + 1;
      const [t1, t2] = titles[m]!;
      order += 1;
      await admin.from('lesson_templates').insert([
        {
          course_id: courseId,
          module_number: moduleNumber,
          lesson_number: 1,
          lesson_code: lessonCode(prefix, moduleNumber, 1),
          title: t1,
          display_order: order,
        },
      ]);
      order += 1;
      await admin.from('lesson_templates').insert([
        {
          course_id: courseId,
          module_number: moduleNumber,
          lesson_number: 2,
          lesson_code: lessonCode(prefix, moduleNumber, 2),
          title: t2,
          display_order: order,
        },
      ]);
    }
  }

  await seedModules(maturidade.id, 'MA', [
    ['Novo Nascimento', 'Certeza da Salvação'],
    ['Vida de Oração', 'A Palavra de Deus'],
  ]);
  await seedModules(ctl.id, 'CT', [
    ['Chamado para Liderar', 'Caráter do Líder'],
    ['Discipulado', 'Multiplicação de Células'],
  ]);

  console.log('→ Semeando turmas…');
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const in90days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  async function upsertCohort(courseId: string, code: string, name: string) {
    const { data: existing } = await admin.from('cohorts').select('id').eq('code', code).maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await admin
      .from('cohorts')
      .insert({
        course_id: courseId,
        code,
        name,
        start_date: iso(today),
        end_date: iso(in90days),
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    if (error || !data) throw error ?? new Error(`Falha ao criar turma ${code}.`);
    return data.id;
  }

  const maturidadeCohortId = await upsertCohort(maturidade.id, 'MAT-DEV-1', 'Maturidade — Turma de desenvolvimento');
  const ctlCohortId = await upsertCohort(ctl.id, 'CTL-DEV-1', 'CTL — Turma de desenvolvimento');

  await admin.from('cohorts').update({ next_ctl_cohort_id: ctlCohortId }).eq('id', maturidadeCohortId);

  const { data: celulas } = await admin.from('celula_hierarquia').select('celula').limit(1);
  const celula = celulas?.[0]?.celula ?? 'Otavio e Jô';

  async function seedPerson(opts: {
    nome: string;
    email: string;
    isAdmin: boolean;
    cohortId?: string;
  }) {
    const { data: existingAuth } = await admin.auth.admin.listUsers();
    const existingUser = existingAuth?.users.find((u) => u.email === opts.email);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: opts.email,
        password: DEV_PASSWORD,
        email_confirm: true,
      });
      if (error || !created.user) throw error ?? new Error(`Falha ao criar usuário ${opts.email}.`);
      userId = created.user.id;
    }

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('member_id')
      .eq('user_id', userId)
      .maybeSingle();

    let memberId: string;
    if (existingProfile?.member_id) {
      memberId = existingProfile.member_id;
    } else {
      const { data: member, error } = await admin
        .from('members')
        .insert({ nome: opts.nome, celula, tipo: 'Adultos', posicao: 'Visitante' })
        .select('id')
        .single();
      if (error || !member) throw error ?? new Error(`Falha ao criar membro ${opts.nome}.`);
      memberId = member.id;

      await admin.from('profiles').upsert({ user_id: userId, member_id: memberId, is_admin: opts.isAdmin });
    }

    if (opts.cohortId) {
      const { data: activeEnrollment } = await admin
        .from('enrollments')
        .select('id')
        .eq('student_id', memberId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!activeEnrollment) {
        await admin.from('enrollments').insert({ student_id: memberId, cohort_id: opts.cohortId, status: 'ACTIVE' });
      }
    }

    console.log(`  ✓ ${opts.email} (${opts.nome})`);
    return memberId;
  }

  console.log('→ Semeando ADMIN…');
  await seedPerson({ nome: 'Admin de Desenvolvimento', email: 'admin.dev@trilho.local', isAdmin: true });

  console.log('→ Semeando PROFESSOR…');
  const professorMemberId = await seedPerson({
    nome: 'Professor de Desenvolvimento',
    email: 'professor.dev@trilho.local',
    isAdmin: false,
  });
  await admin
    .from('teacher_cohorts')
    .upsert(
      [
        { teacher_id: professorMemberId, cohort_id: maturidadeCohortId },
        { teacher_id: professorMemberId, cohort_id: ctlCohortId },
      ],
      { onConflict: 'teacher_id,cohort_id' },
    );

  console.log('→ Semeando 5 alunos de Maturidade…');
  for (let i = 1; i <= 5; i += 1) {
    await seedPerson({
      nome: `Aluno Maturidade ${i} (dev)`,
      email: `aluno.maturidade${i}.dev@trilho.local`,
      isAdmin: false,
      cohortId: maturidadeCohortId,
    });
  }

  console.log('→ Semeando 5 alunos de CTL…');
  for (let i = 1; i <= 5; i += 1) {
    await seedPerson({
      nome: `Aluno CTL ${i} (dev)`,
      email: `aluno.ctl${i}.dev@trilho.local`,
      isAdmin: false,
      cohortId: ctlCohortId,
    });
  }

  console.log('\nPronto! Senha de todos os logins de desenvolvimento:', DEV_PASSWORD);
}

main().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
