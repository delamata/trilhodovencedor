/**
 * Seed de desenvolvimento (seção 29 da spec). Cria:
 *   - os cursos MATURIDADE/CTL (idempotente, mesmo efeito de 01_courses.sql)
 *   - 1 ADMIN, 1 PROFESSOR, 5 alunos de Maturidade, 5 alunos de CTL
 *     (usuários fake, só para ambiente de desenvolvimento)
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
        { code: 'MATURIDADE', name: 'Maturidade', max_absences: 7, justified_absence_counts_towards_limit: false, active: true },
        { code: 'CTL', name: 'CTL', max_absences: 6, justified_absence_counts_towards_limit: false, active: true },
      ],
      { onConflict: 'code' },
    )
    .select('id, code');
  if (coursesError || !courses) throw coursesError ?? new Error('Falha ao semear cursos.');

  const maturidadeId = courses.find((c) => c.code === 'MATURIDADE')!.id;
  const ctlId = courses.find((c) => c.code === 'CTL')!.id;

  const { data: celulas } = await admin.from('celula_hierarquia').select('celula').limit(1);
  const celula = celulas?.[0]?.celula ?? 'Otavio e Jô';

  async function seedPerson(opts: {
    nome: string;
    email: string;
    isAdmin: boolean;
    courseId?: string;
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

    if (opts.courseId) {
      const { data: activeEnrollment } = await admin
        .from('enrollments')
        .select('id')
        .eq('student_id', memberId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (!activeEnrollment) {
        await admin
          .from('enrollments')
          .insert({ student_id: memberId, course_id: opts.courseId, status: 'ACTIVE' });
      }
    }

    console.log(`  ✓ ${opts.email} (${opts.nome})`);
  }

  console.log('→ Semeando ADMIN…');
  await seedPerson({ nome: 'Admin de Desenvolvimento', email: 'admin.dev@trilho.local', isAdmin: true });

  console.log('→ Semeando PROFESSOR…');
  const professorEmail = 'professor.dev@trilho.local';
  await seedPerson({ nome: 'Professor de Desenvolvimento', email: professorEmail, isAdmin: false });
  const { data: professorProfile } = await admin
    .from('profiles')
    .select('member_id')
    .eq('user_id', (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === professorEmail)!.id)
    .maybeSingle();
  if (professorProfile?.member_id) {
    await admin
      .from('teacher_courses')
      .upsert(
        [
          { teacher_id: professorProfile.member_id, course_id: maturidadeId },
          { teacher_id: professorProfile.member_id, course_id: ctlId },
        ],
        { onConflict: 'teacher_id,course_id' },
      );
  }

  console.log('→ Semeando 5 alunos de Maturidade…');
  for (let i = 1; i <= 5; i += 1) {
    await seedPerson({
      nome: `Aluno Maturidade ${i} (dev)`,
      email: `aluno.maturidade${i}.dev@trilho.local`,
      isAdmin: false,
      courseId: maturidadeId,
    });
  }

  console.log('→ Semeando 5 alunos de CTL…');
  for (let i = 1; i <= 5; i += 1) {
    await seedPerson({
      nome: `Aluno CTL ${i} (dev)`,
      email: `aluno.ctl${i}.dev@trilho.local`,
      isAdmin: false,
      courseId: ctlId,
    });
  }

  console.log('\nPronto! Senha de todos os logins de desenvolvimento:', DEV_PASSWORD);
}

main().catch((error) => {
  console.error('Erro no seed:', error);
  process.exit(1);
});
