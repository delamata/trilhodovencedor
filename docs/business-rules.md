# Regras de negócio — Trilho do Vencedor (v2)

Este documento é a referência canônica das regras de negócio críticas do
sistema, numeradas **BR-001 a BR-015**. Cada regra aponta para onde ela é
**imposta de verdade** (quase sempre no banco, dentro de uma função
`SECURITY DEFINER` ou de uma constraint) e onde ela é **testada**.

Regra geral do projeto: a UI pode ajudar a não errar, mas nunca é a única
linha de defesa — qualquer regra crítica também é validada no Postgres, para
que nem um bug no frontend, nem uma chamada direta à API, consigam burlá-la.

---

### BR-001 — Um aluno tem no máximo uma matrícula ativa por vez

Um `member` só pode ter **uma** linha em `enrollments` com `status = 'ACTIVE'`
a qualquer momento, não importa em qual turma ou curso.

- **Imposto por**: índice único parcial `enrollments_one_active_per_student`
  (`supabase/migrations/20260809100200_trilho_v2_restructure.sql`) — funciona
  mesmo se alguém tentar inserir direto no banco, ignorando a aplicação.
- **Testado por**: `tests/integration/critical-rules.test.ts` (TESTE 3).

### BR-002 — Curso ≠ Turma

Um **Curso** (`courses`, ex.: Maturidade, CTL) define o conteúdo acadêmico
(módulos e aulas) e as regras gerais (limite de faltas). Uma **Turma**
(`cohorts`) é uma oferta concreta desse curso, com data de início/fim,
alunos matriculados e aulas agendadas. Todas as turmas do mesmo curso
compartilham automaticamente a mesma estrutura de módulos/aulas
(`lesson_templates`) — nunca é preciso duplicar aula ao criar turma nova.

- **Imposto por**: `lesson_templates.course_id` (não tem `cohort_id`);
  `class_sessions.cohort_id` + `class_sessions.lesson_template_id` conectam
  "quando" com "o quê".
- **Testado por**: `tests/unit/lesson-code.test.ts`, build/typecheck do
  schema (`src/types/database.ts`).

### BR-003 — Dia da semana é sempre calculado, nunca digitado

Nenhuma tela pede "dia da semana" como campo — ele é sempre derivado da data
(`class_date`) via `formatWeekday()`/`getWeekdayIndex()`
(`src/lib/domain/weekday.ts`), com o mesmo critério do Postgres
(`extract(dow from data)`, 0 = domingo). Nunca se compara nome de dia como
string.

- **Imposto por**: `src/lib/domain/weekday.ts` (parsing local, sem `new
  Date(isoString)` direto — evita bug de fuso horário).
- **Testado por**: `tests/unit/weekday.test.ts`.

### BR-004 — Todo módulo tem exatamente 2 aulas, criadas juntas

Não existe módulo com 1 ou 3 aulas. As duas aulas (`lesson_number` 1 e 2) são
sempre criadas atomicamente, na mesma transação.

- **Imposto por**: `trilho_add_module()` (cria as duas linhas de
  `lesson_templates` numa transação) + `check (lesson_number in (1, 2))`
  (`supabase/migrations/20260809100100_trilho_v2_lesson_templates.sql`).
- **Testado por**: fluxo de UI em `src/features/courses/course-structure-panel.tsx`
  (o formulário sempre pede os 2 títulos antes de habilitar o botão).

### BR-005/BR-006 — Código de aula é gerado, nunca digitado

O código de cada aula segue sempre o formato
`{PREFIXO_DO_CURSO}{módulo com 2 dígitos}-{aula com 2 dígitos}` (ex.:
`MA01-01`, `CT03-02`), gerado automaticamente — o admin nunca digita um
código manualmente.

- **Imposto por**: `generateLessonCode()` (`src/lib/domain/lesson-code.ts`)
  no frontend e a mesma fórmula em SQL dentro de `trilho_add_module()`
  (`v_prefix || lpad(v_module::text, 2, '0') || '-0' || v_lesson_number`).
- **Testado por**: `tests/unit/lesson-code.test.ts` (TESTE 1-4 da
  especificação original).

### BR-007 — Maturidade e CTL têm calendários de aula independentes

Não existe geração automática de aulas de CTL a partir do Maturidade (nem de
nenhum outro curso a partir de outro). Toda turma — de Maturidade, de CTL,
ou de qualquer curso futuro — tem seu calendário de aulas agendado
manualmente pelo admin, uma a uma, do mesmo jeito
(`trilho_create_class_session`). `cohorts.next_ctl_cohort_id` continua
existindo, mas serve **só** para a promoção automática (BR-009) — não tem
mais nenhum efeito sobre agendamento de aula.

- **Imposto por**: não existe mais `trilho_generate_ctl_calendar()` — a
  função foi removida em
  `supabase/migrations/20260809100700_trilho_v2_decouple_ctl_calendar.sql`.
  `trilho_create_class_session()` não faz nenhuma checagem cruzada entre
  cursos.
- **Testado por**: `tests/integration/critical-rules.test.ts` (TESTE 4,
  criação de aula genérica, igual para qualquer curso/turma).

### BR-008 — Código e posição da aula são únicos dentro do curso

Não pode haver dois `lesson_templates` do mesmo curso com o mesmo
`lesson_code`, nem dois com o mesmo par `(module_number, lesson_number)`.

- **Imposto por**: `unique (course_id, module_number, lesson_number)` e
  `unique (course_id, lesson_code)` em `lesson_templates`.
- **Testado por**: constraint de banco — qualquer tentativa de violar
  retorna erro `23505` (unique_violation).

### BR-009 — Promoção automática de Maturidade aprovado para o CTL

Ao finalizar uma turma de Maturidade, todo aluno **aprovado**
(`academic_result = 'APPROVED'`) é matriculado automaticamente na turma de
CTL apontada por `next_ctl_cohort_id`, **se ela existir e o aluno ainda não
tiver outra matrícula ativa**.

- **Imposto por**: `trilho_finalize_cohort()`
  (`supabase/migrations/20260809100300_trilho_v2_functions.sql`).
- **Testado por**: `tests/integration/critical-rules.test.ts` (cenário de
  finalização, cobrindo `promoted_count`).

### BR-010 — Fila de elegíveis quando não há turma de CTL definida

Se, no momento da finalização, a turma de Maturidade não tem
`next_ctl_cohort_id` definido (ou o aluno não pôde ser promovido
automaticamente), o aluno aprovado fica disponível na **fila de
elegíveis** (`/turmas/fila`) — aprovado no Maturidade, sem matrícula ativa —
para ser matriculado manualmente numa turma de CTL depois, em lote.

- **Imposto por**: `listEligibleQueueAction()`
  (`src/features/cohorts/actions.ts`, consulta `trilho_student_summary`
  filtrando aprovados sem matrícula ativa) + `trilho_enroll_eligible_students()`
  para matricular em lote.
- **Testado por**: fluxo de UI em `src/features/cohorts/eligible-queue-panel.tsx`.

### BR-011 — Desistência para a contagem de falta

A partir da data de desistência (`enrollments.status = 'DROPPED_OUT'`), o
aluno para de ser considerado matriculado ativo — `trilho_close_class_session()`
só lança falta automática para quem está `ACTIVE`, e `trilho_mark_attendance()`
recusa (`ALUNO_SEM_MATRICULA_NA_TURMA`) marcar presença/falta para quem já
desistiu.

- **Imposto por**: `trilho_mark_dropout()` +
  as checagens `status = 'ACTIVE'` em `trilho_close_class_session()` e
  `trilho_mark_attendance()`.
- **Testado por**: `tests/integration/critical-rules.test.ts` (TESTE 11-12).

### BR-012 — Desistente não é aprovado nem promovido

Um aluno `DROPPED_OUT` nunca entra no cálculo de aprovação/reprovação de
`trilho_finalize_cohort()` (o loop só considera `status = 'ACTIVE'`) e,
portanto, nunca é promovido automaticamente nem aparece na fila de
elegíveis.

- **Imposto por**: `trilho_finalize_cohort()` (filtro `e.status = 'ACTIVE'`
  no cursor de matrículas a avaliar).
- **Testado por**: revisão de código da função + relatório de desistências
  (`/relatorios` → "Desistências").

### BR-013 — Check-in de presença nunca exige login

Desde a v2, **não existe mais** fluxo de presença autenticado. O aluno
confirma presença por um link público e permanente por turma
(`/presenca/[turma]?t=TOKEN`), se identificando por nome (busca) + últimos 4
dígitos do telefone cadastrado — sem e-mail, sem senha, sem sessão.

- **Imposto por**: `/presenca/[turma]/page.tsx` fica fora do grupo de rotas
  `(app)` (que exige login) e a lista `PUBLIC_PATHS` em
  `src/lib/supabase/middleware.ts` inclui `/presenca`. No banco, só 3
  funções (`trilho_public_get_status`, `trilho_public_search_students`,
  `trilho_public_checkin`) têm `grant execute ... to anon` — nenhuma tabela
  tem grant direto para `anon`.
- **Testado por**: `tests/e2e/auth.spec.ts` ("/presenca/[turma] NUNCA exige
  login"), `tests/e2e/public-checkin.spec.ts`,
  `tests/integration/critical-rules.test.ts` (TESTE 15-18).

### BR-014 — O painel administrativo/professor sempre exige login

A exceção do BR-013 é só para o check-in do aluno. Toda rota de gestão
(`/dashboard`, `/turmas`, `/alunos`, `/cursos`, `/aulas/[id]`, `/relatorios`,
`/configuracoes`) continua exigindo sessão autenticada — e, dentro dela, o
papel correto (ADMIN, ou PROFESSOR vinculado àquela turma).

- **Imposto por**: `src/app/(app)/layout.tsx` (redireciona pra `/login` sem
  sessão) + checagem de `user.isAdmin`/`user.teacherCohortIds` em cada
  página + RLS no banco (nada depende só da UI esconder o link).
- **Testado por**: `tests/e2e/auth.spec.ts` ("Proteção de rotas").

### BR-015 — Erro de check-in público nunca revela qual dado errou

Se o nome selecionado ou o sufixo de telefone não confere, a resposta é
**sempre** a mesma mensagem genérica (`NAO_FOI_POSSIVEL_VALIDAR` → "Não foi
possível confirmar sua presença...") — nunca "aluno não encontrado" vs.
"telefone incorreto" separadamente, o que vazaria quem está ou não
matriculado na turma para alguém só com o link público.

- **Imposto por**: `trilho_public_checkin()` usa o mesmo `raise exception
  'NAO_FOI_POSSIVEL_VALIDAR'` tanto para aluno inexistente quanto para
  telefone incorreto quanto para matrícula não ativa/desistente.
- **Testado por**: `tests/integration/critical-rules.test.ts` (TESTE 17).

---

## Outras proteções relevantes (não numeradas como BR, mas críticas)

- **Uma chamada aberta por turma**: índice único parcial
  `class_sessions_one_open_per_cohort` — impossível ter duas aulas com
  `status = 'ATTENDANCE_OPEN'` na mesma turma ao mesmo tempo.
- **Rate limiting do check-in público**: `public_checkin_attempts` (tabela,
  não memória — necessário porque a Vercel é serverless/stateless) limita
  buscas por nome (30/5min) e tentativas de check-in (15/5min) por turma+IP
  (hash do IP, nunca o IP em texto puro).
- **Token do link público nunca é lido em texto puro**: só o hash
  (`sha256`) fica salvo em `cohorts.public_attendance_token_hash`; o texto
  puro só existe no retorno de `trilho_regenerate_public_token()`, uma
  única vez.
