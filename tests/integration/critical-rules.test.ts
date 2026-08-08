import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { todayInAppTimezone } from '@/lib/format';
import {
  TEST_PREFIX,
  adminClient,
  cleanupFixtures,
  createTestUserSession,
  sha256Hex,
  type TestFixtureIds,
} from './helpers';

/**
 * Testes de integração das regras críticas — seção 34 da spec.
 *
 * NÃO rodam com `npm test` nem no CI padrão: precisam do Supabase real
 * (.env.local) e criam/apagam dados de verdade (prefixados com
 * TESTE_AUTOMATIZADO_TRILHO, sempre limpos no afterAll). Rode com:
 *
 *   npm run test:integration
 *
 * TESTE 6-9 (limite atingido/excedido pra Maturidade=7 e CTL=6) são
 * lógica pura e já ficam em tests/unit/situacao.test.ts — não
 * precisam de banco, então não são repetidos aqui.
 */
const hasCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hasCredentials)('Regras críticas (banco real)', () => {
  let admin: SupabaseClient<Database>;
  let maturidadeCourseId: string;
  let ctlCourseId: string;
  let celula: string;

  let matStudent: Awaited<ReturnType<typeof createTestUserSession>>;
  let ctlStudent: Awaited<ReturnType<typeof createTestUserSession>>;
  let adminUser: Awaited<ReturnType<typeof createTestUserSession>>;

  let classMatOpen: string;
  let classCtlOpen: string;
  let classMatClosed: string;
  let classCancelled: string;

  const fixtures: TestFixtureIds = { userIds: [], memberIds: [], classIds: [] };
  const today = todayInAppTimezone();

  beforeAll(async () => {
    admin = adminClient();

    const { data: courses } = await admin.from('courses').select('id, code').in('code', ['MATURIDADE', 'CTL']);
    const mat = courses?.find((c) => c.code === 'MATURIDADE');
    const ctl = courses?.find((c) => c.code === 'CTL');
    if (!mat || !ctl) {
      throw new Error('Cursos MATURIDADE/CTL não encontrados — rode supabase/seed/01_courses.sql primeiro.');
    }
    maturidadeCourseId = mat.id;
    ctlCourseId = ctl.id;

    const { data: celulas } = await admin.from('celula_hierarquia').select('celula').limit(1);
    celula = celulas?.[0]?.celula ?? 'Otavio e Jô';

    matStudent = await createTestUserSession({
      admin,
      nome: `${TEST_PREFIX} Aluno Maturidade`,
      celula,
      isAdmin: false,
    });
    ctlStudent = await createTestUserSession({
      admin,
      nome: `${TEST_PREFIX} Aluno CTL`,
      celula,
      isAdmin: false,
    });
    adminUser = await createTestUserSession({
      admin,
      nome: `${TEST_PREFIX} Admin`,
      celula,
      isAdmin: true,
    });
    fixtures.userIds.push(matStudent.userId, ctlStudent.userId, adminUser.userId);
    fixtures.memberIds.push(matStudent.memberId, ctlStudent.memberId, adminUser.memberId);

    await admin
      .from('enrollments')
      .insert([
        { student_id: matStudent.memberId, course_id: maturidadeCourseId, status: 'ACTIVE' },
        { student_id: ctlStudent.memberId, course_id: ctlCourseId, status: 'ACTIVE' },
      ]);

    const { data: classes, error: classesError } = await admin
      .from('classes')
      .insert([
        {
          course_id: maturidadeCourseId,
          class_number: 90001,
          title: `${TEST_PREFIX} Aula Maturidade aberta`,
          class_date: today,
          start_time: '20:00',
          end_time: '21:30',
          status: 'SCHEDULED',
        },
        {
          course_id: ctlCourseId,
          class_number: 90001,
          title: `${TEST_PREFIX} Aula CTL aberta`,
          class_date: today,
          start_time: '20:00',
          end_time: '21:30',
          status: 'SCHEDULED',
        },
        {
          course_id: maturidadeCourseId,
          class_number: 90002,
          title: `${TEST_PREFIX} Aula Maturidade encerrada`,
          class_date: today,
          start_time: '20:00',
          end_time: '21:30',
          status: 'COMPLETED',
        },
        {
          course_id: maturidadeCourseId,
          class_number: 90003,
          title: `${TEST_PREFIX} Aula Maturidade cancelada`,
          class_date: today,
          start_time: '20:00',
          end_time: '21:30',
          status: 'CANCELLED',
        },
      ])
      .select('id, class_number, course_id');
    if (classesError || !classes) throw classesError ?? new Error('Falha ao criar aulas de teste.');

    classMatOpen = classes.find(
      (c) => c.class_number === 90001 && c.course_id === maturidadeCourseId,
    )!.id;
    classCtlOpen = classes.find((c) => c.class_number === 90001 && c.course_id === ctlCourseId)!.id;
    classMatClosed = classes.find((c) => c.class_number === 90002)!.id;
    classCancelled = classes.find((c) => c.class_number === 90003)!.id;
    fixtures.classIds.push(classMatOpen, classCtlOpen, classMatClosed, classCancelled);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 1000).toISOString();

    await admin.from('attendance_sessions').insert([
      {
        class_id: classMatOpen,
        token_hash: sha256Hex('token-mat-aberta'),
        short_code_hash: sha256Hex('111111'),
        expires_at: future,
      },
      {
        class_id: classCtlOpen,
        token_hash: sha256Hex('token-ctl-aberta'),
        short_code_hash: sha256Hex('222222'),
        expires_at: future,
      },
      {
        class_id: classMatClosed,
        token_hash: sha256Hex('token-mat-encerrada'),
        short_code_hash: sha256Hex('333333'),
        expires_at: past,
        closed_at: new Date().toISOString(),
      },
    ]);
  });

  afterAll(async () => {
    await cleanupFixtures(admin, fixtures);
  });

  it('TESTE 1 — aluno de Maturidade tentando registrar presença em aula de CTL é NEGADO', async () => {
    const { error } = await matStudent.client.rpc('trilho_checkin_attendance', { p_value: '222222' });
    expect(error?.message).toBe('CURSO_DIFERENTE');
  });

  it('TESTE 2 — aluno de CTL tentando registrar presença em aula de Maturidade é NEGADO', async () => {
    const { error } = await ctlStudent.client.rpc('trilho_checkin_attendance', { p_value: '111111' });
    expect(error?.message).toBe('CURSO_DIFERENTE');
  });

  it('TESTE 3 — aluno tentando registrar presença duas vezes na mesma aula é NEGADO na segunda', async () => {
    const first = await matStudent.client.rpc('trilho_checkin_attendance', { p_value: '111111' });
    expect(first.error).toBeNull();
    expect(first.data?.[0]?.class_title).toContain('Aula Maturidade aberta');

    const second = await matStudent.client.rpc('trilho_checkin_attendance', { p_value: '111111' });
    expect(second.error?.message).toBe('PRESENCA_JA_REGISTRADA');
  });

  it('TESTE 4 — aluno tentando registrar presença depois da chamada fechada é NEGADO', async () => {
    const { error } = await matStudent.client.rpc('trilho_checkin_attendance', { p_value: '333333' });
    expect(error?.message).toBe('CHAMADA_ENCERRADA');
  });

  it('TESTE 5 — aluno tentando possuir duas matrículas ativas é NEGADO PELO BANCO', async () => {
    // matStudent já tem matrícula ACTIVE em Maturidade (criada no beforeAll).
    // Uma segunda matrícula ACTIVE (em qualquer curso) deve violar o
    // índice único parcial enrollments_one_active_per_student.
    const { error } = await admin
      .from('enrollments')
      .insert({ student_id: matStudent.memberId, course_id: ctlCourseId, status: 'ACTIVE' });

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // unique_violation
  });

  it('TESTE 10 — aula cancelada não permite abrir chamada (logo, nunca gera falta)', async () => {
    const { error } = await adminUser.client.rpc('trilho_open_attendance_session', {
      p_class_id: classCancelled,
    });
    expect(error?.message).toBe('AULA_CANCELADA');
  });
});
