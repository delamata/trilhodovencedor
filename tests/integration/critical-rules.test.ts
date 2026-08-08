import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { todayInAppTimezone } from '@/lib/format';
import {
  TEST_PREFIX,
  adminClient,
  cleanupFixtures,
  createTestUserSession,
  requireEnv,
  sha256Hex,
  type TestFixtureIds,
} from './helpers';

/**
 * Testes de integração das regras críticas do Trilho do Vencedor v2
 * (Curso vs Turma, chamada por turma, check-in público sem login).
 *
 * NÃO rodam com `npm test` nem no CI padrão: precisam do Supabase real
 * (.env.local) e criam/apagam dados de verdade (prefixados com
 * TESTE_AUTOMATIZADO_TRILHO, sempre limpos no afterAll). Rode com:
 *
 *   npm run test:integration
 *
 * Regras de geração de código de aula (MA01-01/CT03-02) e de cálculo
 * de dia da semana são lógica pura e já ficam em tests/unit/
 * (lesson-code.test.ts, weekday.test.ts) — não precisam de banco, então
 * não são repetidas aqui.
 */
const hasCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hasCredentials)('Regras críticas (banco real)', () => {
  let admin: SupabaseClient<Database>;
  let anon: SupabaseClient<Database>;
  let maturidadeCourseId: string;
  let ctlCourseId: string;
  let maturidadeLessonId: string;
  let celula: string;

  let matStudent: Awaited<ReturnType<typeof createTestUserSession>>;
  let adminUser: Awaited<ReturnType<typeof createTestUserSession>>;

  let matCohortId: string;
  let ctlCohortId: string;
  let matCohortCode: string;
  let publicToken: string;

  const fixtures: TestFixtureIds = { userIds: [], memberIds: [], classSessionIds: [], cohortIds: [] };
  const today = todayInAppTimezone();
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    admin = adminClient();
    anon = createSupabaseClient<Database>(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );

    const { data: courses } = await admin.from('courses').select('id, code').in('code', ['MATURIDADE', 'CTL']);
    const mat = courses?.find((c) => c.code === 'MATURIDADE');
    const ctl = courses?.find((c) => c.code === 'CTL');
    if (!mat || !ctl) {
      throw new Error('Cursos MATURIDADE/CTL não encontrados — rode supabase/seed/01_courses.sql primeiro.');
    }
    maturidadeCourseId = mat.id;
    ctlCourseId = ctl.id;

    const [{ data: matLesson }, { data: _ctlLesson }] = await Promise.all([
      admin.from('lesson_templates').select('id').eq('course_id', maturidadeCourseId).limit(1).maybeSingle(),
      admin.from('lesson_templates').select('id').eq('course_id', ctlCourseId).limit(1).maybeSingle(),
    ]);
    if (!matLesson || !_ctlLesson) {
      throw new Error('Nenhuma aula (lesson_template) encontrada — rode npm run seed primeiro.');
    }
    maturidadeLessonId = matLesson.id;

    const { data: celulas } = await admin.from('celula_hierarquia').select('celula').limit(1);
    celula = celulas?.[0]?.celula ?? 'Otavio e Jô';

    matStudent = await createTestUserSession({
      admin,
      nome: `${TEST_PREFIX} Aluno Maturidade`,
      celula,
      isAdmin: false,
    });
    adminUser = await createTestUserSession({ admin, nome: `${TEST_PREFIX} Admin`, celula, isAdmin: true });
    fixtures.userIds.push(matStudent.userId, adminUser.userId);
    fixtures.memberIds.push(matStudent.memberId, adminUser.memberId);

    matCohortCode = `${TEST_PREFIX}_MAT_${suffix}`;
    const { data: cohorts, error: cohortsError } = await admin
      .from('cohorts')
      .insert([
        {
          course_id: maturidadeCourseId,
          code: matCohortCode,
          name: `${TEST_PREFIX} Turma Maturidade`,
          start_date: today,
          end_date: today,
          status: 'ACTIVE',
        },
        {
          course_id: ctlCourseId,
          code: `${TEST_PREFIX}_CTL_${suffix}`,
          name: `${TEST_PREFIX} Turma CTL`,
          start_date: today,
          end_date: today,
          status: 'ACTIVE',
        },
      ])
      .select('id, course_id');
    if (cohortsError || !cohorts) throw cohortsError ?? new Error('Falha ao criar turmas de teste.');

    matCohortId = cohorts.find((c) => c.course_id === maturidadeCourseId)!.id;
    ctlCohortId = cohorts.find((c) => c.course_id === ctlCourseId)!.id;
    fixtures.cohortIds.push(matCohortId, ctlCohortId);

    await admin.from('enrollments').insert({ student_id: matStudent.memberId, cohort_id: matCohortId, status: 'ACTIVE' });

    // token de presença pública — grava o hash direto (equivalente ao
    // que trilho_regenerate_public_token faria), pra não depender de
    // sessão admin no beforeAll.
    publicToken = `${TEST_PREFIX}-token-${suffix}`;
    await admin
      .from('cohorts')
      .update({
        public_attendance_enabled: true,
        public_attendance_token_hash: sha256Hex(publicToken),
        public_attendance_token_created_at: new Date().toISOString(),
      })
      .eq('id', matCohortId);

    // telefone conhecido, pro teste de check-in público com sufixo correto/errado.
    await admin.from('members').update({ tel: '11999998888' }).eq('id', matStudent.memberId);
  });

  afterAll(async () => {
    await cleanupFixtures(admin, fixtures);
  });

  it('TESTE 1 — matricular aluno numa turma cria enrollment ACTIVE (trilho_enroll_student)', async () => {
    const { data: newMember } = await admin
      .from('members')
      .insert({ nome: `${TEST_PREFIX} Aluno avulso`, celula, tipo: 'Adultos', posicao: 'Visitante' })
      .select('id')
      .single();
    fixtures.memberIds.push(newMember!.id);

    const { data, error } = await adminUser.client.rpc('trilho_enroll_student', {
      p_student_id: newMember!.id,
      p_cohort_id: matCohortId,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('TESTE 2 — não-admin não pode matricular aluno (SEM_PERMISSAO)', async () => {
    const { error } = await matStudent.client.rpc('trilho_enroll_student', {
      p_student_id: matStudent.memberId,
      p_cohort_id: ctlCohortId,
    });
    expect(error?.message).toBe('SEM_PERMISSAO');
  });

  it('TESTE 3 — aluno com matrícula ativa não pode ter uma segunda (índice único parcial)', async () => {
    // matStudent já tem matrícula ACTIVE na turma de Maturidade.
    const { error } = await admin
      .from('enrollments')
      .insert({ student_id: matStudent.memberId, cohort_id: ctlCohortId, status: 'ACTIVE' });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23505'); // unique_violation
  });

  it('TESTE 4 — cria aula (class_session) numa turma', async () => {
    const { data, error } = await adminUser.client.rpc('trilho_create_class_session', {
      p_cohort_id: matCohortId,
      p_lesson_template_id: maturidadeLessonId,
      p_class_date: today,
      p_start_time: '20:00',
      p_end_time: '21:30',
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    fixtures.classSessionIds.push(data as string);
  });

  it('TESTE 5 — abrir chamada muda status para ATTENDANCE_OPEN', async () => {
    const sessionId = fixtures.classSessionIds[0]!;
    const { error } = await adminUser.client.rpc('trilho_open_class_session', { p_class_session_id: sessionId });
    expect(error).toBeNull();

    const { data: session } = await admin.from('class_sessions').select('status').eq('id', sessionId).single();
    expect(session?.status).toBe('ATTENDANCE_OPEN');
  });

  it('TESTE 6 — só pode haver uma chamada aberta por turma (CHAMADA_JA_ABERTA)', async () => {
    const { data: secondSessionId } = await adminUser.client.rpc('trilho_create_class_session', {
      p_cohort_id: matCohortId,
      p_lesson_template_id: maturidadeLessonId,
      p_class_date: today,
      p_start_time: '22:00',
      p_end_time: '23:00',
    });
    fixtures.classSessionIds.push(secondSessionId as string);

    const { error } = await adminUser.client.rpc('trilho_open_class_session', {
      p_class_session_id: secondSessionId as string,
    });
    expect(error?.message).toBe('CHAMADA_JA_ABERTA');
  });

  it('TESTE 7 — encerrar chamada sem chamada aberta é NEGADO (CHAMADA_NAO_ABERTA)', async () => {
    const scheduledSessionId = fixtures.classSessionIds[1]!;
    const { error } = await adminUser.client.rpc('trilho_close_class_session', {
      p_class_session_id: scheduledSessionId,
    });
    expect(error?.message).toBe('CHAMADA_NAO_ABERTA');
  });

  it('TESTE 8 — cancelar aula com chamada aberta é NEGADO (ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR)', async () => {
    const openSessionId = fixtures.classSessionIds[0]!;
    const { error } = await adminUser.client.rpc('trilho_cancel_class_session', {
      p_class_session_id: openSessionId,
    });
    expect(error?.message).toBe('ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR');
  });

  it('TESTE 9 — encerrar chamada marca falta automática (SYSTEM) para quem não confirmou', async () => {
    const openSessionId = fixtures.classSessionIds[0]!;
    const { data, error } = await adminUser.client.rpc('trilho_close_class_session', {
      p_class_session_id: openSessionId,
    });
    expect(error).toBeNull();
    expect(data?.[0]?.marked_absent).toBeGreaterThanOrEqual(1);

    const { data: attendance } = await admin
      .from('attendance')
      .select('status, source')
      .eq('class_session_id', openSessionId)
      .eq('student_id', matStudent.memberId)
      .single();
    expect(attendance?.status).toBe('FALTA');
    expect(attendance?.source).toBe('SYSTEM');
  });

  it('TESTE 10 — marcar presença manualmente sobrescreve a falta automática e registra histórico', async () => {
    const openSessionId = fixtures.classSessionIds[0]!;
    const { error } = await adminUser.client.rpc('trilho_mark_attendance', {
      p_class_session_id: openSessionId,
      p_student_id: matStudent.memberId,
      p_status: 'PRESENTE',
    });
    expect(error).toBeNull();

    const { data: history } = await admin
      .from('attendance_history')
      .select('old_status, new_status')
      .eq('new_status', 'PRESENTE');
    expect(history?.some((h) => h.old_status === 'FALTA')).toBe(true);
  });

  it('TESTE 11 — desistência (trilho_mark_dropout) tira o aluno da matrícula ativa', async () => {
    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id')
      .eq('student_id', matStudent.memberId)
      .eq('status', 'ACTIVE')
      .single();

    const { error } = await adminUser.client.rpc('trilho_mark_dropout', {
      p_enrollment_id: enrollment!.id,
      p_dropped_out_at: today,
      p_reason: 'OUTRO',
    });
    expect(error).toBeNull();

    const { data: updated } = await admin.from('enrollments').select('status').eq('id', enrollment!.id).single();
    expect(updated?.status).toBe('DROPPED_OUT');
  });

  it('TESTE 12 — desistente não pode ter presença marcada (ALUNO_SEM_MATRICULA_NA_TURMA)', async () => {
    const openSessionId = fixtures.classSessionIds[1]!;
    const { error } = await adminUser.client.rpc('trilho_mark_attendance', {
      p_class_session_id: openSessionId,
      p_student_id: matStudent.memberId,
      p_status: 'PRESENTE',
    });
    expect(error?.message).toBe('ALUNO_SEM_MATRICULA_NA_TURMA');
  });

  it('TESTE 13 — pré-visualização do calendário de CTL (p_commit=false) não grava nada', async () => {
    await admin.from('cohorts').update({ next_ctl_cohort_id: ctlCohortId }).eq('id', matCohortId);

    const { data, error } = await adminUser.client.rpc('trilho_generate_ctl_calendar', {
      p_ctl_cohort_id: ctlCohortId,
      p_commit: false,
    });
    expect(error).toBeNull();

    const { count } = await admin
      .from('class_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('cohort_id', ctlCohortId);
    expect(count ?? 0).toBe(0);
    // Sem terça-feira com aula de Maturidade nos fixtures deste teste,
    // o preview pode vir vazio — o que importa é não ter gravado nada.
    expect(Array.isArray(data)).toBe(true);
  });

  it('TESTE 14 — gerar calendário de CTL (p_commit=true) é idempotente', async () => {
    // Cria uma aula de Maturidade numa terça-feira conhecida.
    const { data: tuesdaySessionId } = await adminUser.client.rpc('trilho_create_class_session', {
      p_cohort_id: matCohortId,
      p_lesson_template_id: maturidadeLessonId,
      p_class_date: '2026-08-11', // terça-feira
      p_start_time: '20:00',
      p_end_time: '21:30',
    });
    fixtures.classSessionIds.push(tuesdaySessionId as string);

    const first = await adminUser.client.rpc('trilho_generate_ctl_calendar', {
      p_ctl_cohort_id: ctlCohortId,
      p_commit: true,
    });
    expect(first.error).toBeNull();
    const createdIds = (
      await admin.from('class_sessions').select('id').eq('cohort_id', ctlCohortId)
    ).data?.map((r) => r.id) ?? [];
    fixtures.classSessionIds.push(...createdIds);
    expect(createdIds.length).toBeGreaterThanOrEqual(1);

    const second = await adminUser.client.rpc('trilho_generate_ctl_calendar', {
      p_ctl_cohort_id: ctlCohortId,
      p_commit: true,
    });
    expect(second.error).toBeNull();
    expect(second.data?.every((row) => row.already_exists)).toBe(true);

    const { count } = await admin
      .from('class_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('cohort_id', ctlCohortId);
    expect(count).toBe(createdIds.length);
  });

  it('TESTE 15 — check-in público com token inválido é NEGADO (LINK_INVALIDO)', async () => {
    const { error } = await anon.rpc('trilho_public_get_status', {
      p_cohort_code: matCohortCode,
      p_token: 'token-errado',
    });
    expect(error?.message).toBe('LINK_INVALIDO');
  });

  it('TESTE 16 — busca pública exige pelo menos 3 letras (NOME_MUITO_CURTO)', async () => {
    const { error } = await anon.rpc('trilho_public_search_students', {
      p_cohort_code: matCohortCode,
      p_token: publicToken,
      p_name_query: 'an',
    });
    expect(error?.message).toBe('NOME_MUITO_CURTO');
  });

  it('TESTE 17 — check-in público com sufixo de telefone errado é NEGADO com erro genérico', async () => {
    // Reabre uma chamada pra ter algo pra confirmar.
    const sessionId = fixtures.classSessionIds[1]!;
    await adminUser.client.rpc('trilho_open_class_session', { p_class_session_id: sessionId });

    // matStudent desistiu no TESTE 11 — usa um aluno ativo novo pra este teste.
    const { data: activeMember } = await admin
      .from('members')
      .insert({ nome: `${TEST_PREFIX} Aluno checkin`, celula, tipo: 'Adultos', posicao: 'Visitante', tel: '11977776666' })
      .select('id')
      .single();
    fixtures.memberIds.push(activeMember!.id);
    await admin.from('enrollments').insert({ student_id: activeMember!.id, cohort_id: matCohortId, status: 'ACTIVE' });

    const { error } = await anon.rpc('trilho_public_checkin', {
      p_cohort_code: matCohortCode,
      p_token: publicToken,
      p_student_id: activeMember!.id,
      p_phone_suffix: '0000',
    });
    expect(error?.message).toBe('NAO_FOI_POSSIVEL_VALIDAR');
  });

  it('TESTE 18 — check-in público com dados corretos registra presença uma única vez', async () => {
    const sessionId = fixtures.classSessionIds[1]!;
    const { data: activeMember } = await admin
      .from('members')
      .select('id')
      .eq('tel', '11977776666')
      .single();

    const first = await anon.rpc('trilho_public_checkin', {
      p_cohort_code: matCohortCode,
      p_token: publicToken,
      p_student_id: activeMember!.id,
      p_phone_suffix: '6666',
    });
    expect(first.error).toBeNull();
    expect(first.data?.[0]?.presences).toBeGreaterThanOrEqual(1);

    const { data: attendance } = await admin
      .from('attendance')
      .select('status, source')
      .eq('class_session_id', sessionId)
      .eq('student_id', activeMember!.id)
      .single();
    expect(attendance?.status).toBe('PRESENTE');
    expect(attendance?.source).toBe('PUBLIC_CHECKIN');

    const second = await anon.rpc('trilho_public_checkin', {
      p_cohort_code: matCohortCode,
      p_token: publicToken,
      p_student_id: activeMember!.id,
      p_phone_suffix: '6666',
    });
    expect(second.error?.message).toBe('PRESENCA_JA_REGISTRADA');
  });
});
