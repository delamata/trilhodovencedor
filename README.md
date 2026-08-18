# Controle de Presença — Trilho do Vencedor

Aplicação web para gestão de **cursos**, **turmas**, módulos/aulas e controle
de presença dos cursos do Trilho do Vencedor — **Maturidade** e **CTL**.

- **Curso** (Maturidade, CTL) define o conteúdo acadêmico (módulos/aulas) e
  as regras gerais (limite de faltas). **Turma** (`cohort`) é uma oferta
  concreta desse curso — com data, alunos matriculados e aulas agendadas.
  Ver [`docs/business-rules.md`](docs/business-rules.md) (BR-002) para o
  detalhe da distinção.
- Alunos confirmam presença **sem precisar de login**, por um link público e
  permanente por turma (`/presenca/[turma]?t=TOKEN`), buscando o próprio
  nome e confirmando com os últimos 4 dígitos do telefone.
- Professores também se cadastram **sem login**, em `/professores` — buscam
  o próprio nome (ou criam um cadastro de membro novo, na hora), confirmam
  pelos 4 últimos dígitos do telefone e escolhem **quais módulos** vão
  lecionar (não a turma inteira) — cada módulo só pode ter um professor.
  Pra de fato abrir chamada e ver a turma, aí sim precisam de um login
  (concedido pela administração). O admin acompanha o resumo módulo →
  professor de cada turma em `/turmas/[id]` e pode compartilhar no WhatsApp.
- Administradores criam turmas, definem a estrutura de módulos/aulas de cada
  curso e agendam o calendário de cada turma manualmente — Maturidade e CTL
  têm calendários totalmente independentes. Também registram desistência,
  finalizam turmas (aprovação automática por limite de faltas + promoção
  para o CTL) e acompanham tudo em dashboards e relatórios.

## Sumário

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Regras de negócio](#regras-de-negócio)
- [Relação com o app Oikos](#relação-com-o-app-oikos)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Supabase](#configuração-do-supabase)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Execução local](#execução-local)
- [Migrations](#migrations)
- [Seed](#seed)
- [Fluxo de uso — turmas e aulas](#fluxo-de-uso--turmas-e-aulas)
- [Check-in de presença sem login](#check-in-de-presença-sem-login)
- [Testes](#testes)
- [Build](#build)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Segurança](#segurança)
- [Evolução futura](#evolução-futura)

## Arquitetura

- **Frontend**: Next.js (App Router) renderizado no servidor por padrão;
  interatividade pontual em Client Components. Formulários com React Hook
  Form + Zod. UI com shadcn/ui (Tailwind, base em `@base-ui/react`).
- **Backend**: Server Actions e Route Handlers do próprio Next.js — sem API
  separada. Toda regra de negócio crítica (matrícula única ativa, uma
  chamada aberta por turma, código de aula gerado, aprovação/promoção,
  check-in público sem revelar qual dado errou) é imposta **no banco**,
  dentro de funções PostgreSQL `SECURITY DEFINER` (`trilho_*`) — ver
  `supabase/migrations/20260809100300_trilho_v2_functions.sql` e
  [`docs/business-rules.md`](docs/business-rules.md).
- **Banco/Auth**: Supabase (Postgres + Auth + Row Level Security). O
  check-in público de presença roda com o role `anon` (sem sessão) mas só
  tem `GRANT EXECUTE` em 3 funções (`trilho_public_get_status`,
  `trilho_public_search_students`, `trilho_public_checkin`) — nenhuma
  tabela tem grant direto para `anon`. O painel administrativo/professor
  continua exigindo login em todas as rotas.

## Tecnologias

Next.js · TypeScript (strict) · Tailwind CSS · shadcn/ui · React Hook Form ·
Zod · Supabase (Postgres, Auth, RLS) · Recharts · Vitest · Playwright ·
ESLint · Prettier · exceljs (exportação XLSX) · qrcode.react.

## Regras de negócio

As 15 regras críticas do sistema (BR-001 a BR-015) — matrícula única ativa,
geração de código de aula, calendários independentes por turma, promoção
automática, fila de elegíveis, desistência, check-in sem login e seu
tratamento de erro genérico — estão documentadas com onde são impostas e
onde são testadas em [`docs/business-rules.md`](docs/business-rules.md).

## Relação com o app Oikos

Este projeto é um **repositório separado** do app Oikos
(`Dashboard de Membros — Videira SCS / Rede Oikos`), mas usa **o mesmo
projeto Supabase**. As tabelas novas deste projeto (`courses`, `cohorts`,
`lesson_templates`, `class_sessions`, `teacher_cohorts`, `enrollments`,
`attendance`, `attendance_history`, `audit_logs`,
`public_checkin_attempts`, a view `trilho_student_summary`/
`trilho_dropout_report` e as funções `trilho_*`) são **aditivas** — nenhuma
migration deste projeto altera ou remove nada do Oikos.

Este app reaproveita, só leitura/vínculo:

- `members` — cadastro da pessoa (é o "aluno"/"professor" aqui também);
- `profiles` — liga `auth.users` → `members`. `profiles.is_admin` já
  existente no Oikos é o mesmo flag usado para o papel ADMIN aqui.

Papéis (ADMIN/PROFESSOR/ALUNO) são **derivados**, nunca armazenados numa
tabela de papéis:

| Papel | Como é definido |
|---|---|
| ADMIN | `profiles.is_admin = true` |
| PROFESSOR | linha em `teacher_cohorts` para a turma |
| ALUNO | matrícula `ACTIVE` em `enrollments` (mas o check-in em si **não** depende de estar logado como aluno — ver [Check-in de presença sem login](#check-in-de-presença-sem-login)) |

## Pré-requisitos

- Node.js 20+
- Uma conta no [Supabase](https://supabase.com) — recomendado usar o **mesmo
  projeto** já usado pelo Oikos (ver seção anterior), mas também funciona com
  um projeto novo/isolado.

## Instalação

```bash
npm install
cp .env.example .env.local
```

## Configuração do Supabase

1. Em **Settings → API**, copie **Project URL**, a chave **anon public** e a
   chave **service_role** para o `.env.local` (ver [Variáveis de
   ambiente](#variáveis-de-ambiente)).
2. Rode as [migrations](#migrations) e o [seed](#seed) dos cursos.
3. Se o seu login já é admin no app Oikos (`profiles.is_admin = true`), você
   já é admin aqui também — nenhuma ação extra. Caso contrário, no SQL
   Editor:
   ```sql
   update profiles set is_admin = true where user_id = 'SEU-USER-UID-AQUI';
   ```
   (pegue o `User UID` em **Authentication → Users**).
4. Alunos/professores são cadastrados pelo ADMIN dentro do próprio app (tela
   da turma → Matricular aluno, ou importação em lote) — não existe
   cadastro público de conta. Cada matrícula nova de aluno **não** precisa
   mais de convite de login (o check-in é sem login); professores/admins
   continuam recebendo convite por e-mail (Supabase Admin API) quando
   cadastrados pela primeira vez.

## Variáveis de ambiente

Veja [`​.env.example`](.env.example) — nunca cole valores reais nesse
arquivo, só em `.env.local` (que já está no `.gitignore`).

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public (pública por design; a segurança vem do RLS + grants por função) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role — **secreta**, só usada em código de servidor |
| `NEXT_PUBLIC_APP_TIMEZONE` | `America/Sao_Paulo` (não altere) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do app (usada para montar o link de presença `/presenca/[turma]?t=...` e os links de convite/redefinição de senha) |

## Execução local

```bash
npm run dev
```

Abra http://localhost:3000.

## Migrations

Rode, **nesta ordem**, no SQL Editor do projeto Supabase (ou via Supabase
CLI, se preferir):

```
supabase/migrations/20260807120000_trilho_courses_enrollments.sql
supabase/migrations/20260807120100_trilho_classes_attendance.sql
supabase/migrations/20260807120200_trilho_audit_logs.sql
supabase/migrations/20260807120300_trilho_functions.sql
supabase/migrations/20260807120350_trilho_views.sql
supabase/migrations/20260807120400_trilho_rls.sql
supabase/migrations/20260808090000_trilho_members_select_policy.sql
supabase/migrations/20260808100000_trilho_fix_checkin_ambiguous_column.sql
supabase/migrations/20260809100000_trilho_v2_courses_cohorts.sql
supabase/migrations/20260809100100_trilho_v2_lesson_templates.sql
supabase/migrations/20260809100200_trilho_v2_restructure.sql
supabase/migrations/20260809100300_trilho_v2_functions.sql
supabase/migrations/20260809100400_trilho_v2_rls.sql
supabase/migrations/20260809100500_trilho_v2_views.sql
supabase/migrations/20260809100600_trilho_v2_fix_members_policy.sql
supabase/migrations/20260809100700_trilho_v2_decouple_ctl_calendar.sql
supabase/migrations/20260809100800_trilho_v2_delete_cohort.sql
supabase/migrations/20260809100900_trilho_v2_edit_delete_class_session.sql
supabase/migrations/20260810090000_trilho_v2_public_teacher_registration.sql
supabase/migrations/20260810100000_trilho_v2_module_teachers.sql
```

As migrations `20260807*`/`20260808*` criam o schema v1 (curso-cêntrico); as
`20260809_v2_*` evoluem para o modelo Curso vs Turma — **rode todas em
ordem, mesmo num projeto novo**, porque a v2 depende de estruturas criadas
na v1 (ex.: `trilho_log_audit`, `trilho_set_updated_at`) e a
`20260809100200_trilho_v2_restructure.sql` **substitui** (dropa e recria)
as tabelas `classes`/`enrollments`/`attendance*`/`teacher_courses` da v1 —
ela verifica que estão vazias antes de dropar, mas **leia o comentário no
topo do arquivo antes de rodar num projeto com dados reais**.

Todos os arquivos são majoritariamente idempotentes (`create table if not
exists`, `create or replace function`) — seguro rodar de novo se precisar
corrigir algo no meio, exceto a migration de restructure (que não deve ser
rodada duas vezes num banco que já tem dados de produção).

**Para conferir que aplicou certo**: em **Table Editor** devem aparecer
`courses`, `cohorts`, `lesson_templates`, `class_sessions`,
`teacher_cohorts`, `enrollments`, `attendance`, `attendance_history`,
`audit_logs`, `public_checkin_attempts`.

## Seed

```sql
-- supabase/seed/01_courses.sql, no SQL Editor
```

Cria/atualiza os cursos `MATURIDADE` e `CTL` com seus prefixos de código de
aula (`MA`/`CT`).

### Dados fake de desenvolvimento

```bash
npm run seed
```

Cria (idempotente), no mesmo projeto Supabase configurado em `.env.local`:

- os cursos MATURIDADE/CTL;
- 2 módulos (4 aulas) de estrutura acadêmica para cada curso;
- 1 turma `ACTIVE` de cada curso (`MAT-DEV-1`, `CTL-DEV-1`), com a turma de
  Maturidade já apontando a de CTL como próxima turma de promoção;
- 1 ADMIN, 1 PROFESSOR (vinculado às duas turmas) e 5 alunos de cada curso,
  todos com a senha fixa `trilho-dev-2026` (só para dev local).

Roda `supabase/seed/run.ts`.

> ⚠️ Como este projeto compartilha o Supabase do Oikos, `npm run seed` cria
> pessoas/logins **de verdade** nesse banco. Só rode contra um projeto que
> seja realmente de desenvolvimento/teste.

## Fluxo de uso — turmas e aulas

1. **Curso** (`/cursos/[id]`): configure limite de faltas e cadastre a
   estrutura acadêmica em módulos — cada módulo cria automaticamente as 2
   aulas com código gerado (`MA01-01`, `MA01-02`, ...).
2. **Turma** (`/turmas/nova` → `/turmas/[id]`): crie uma turma vinculada ao
   curso, com data de início/fim. Vincule professores, matricule alunos
   (existentes ou novos) e agende aulas escolhendo qual aula do módulo será
   dada em qual data/horário — o dia da semana aparece calculado
   automaticamente.
3. **CTL**: numa turma de Maturidade, defina "Turma de CTL" (próxima turma
   para onde os aprovados são promovidos automaticamente ao finalizar). O
   calendário de aulas da turma de CTL é independente do Maturidade — agende
   as aulas dela do mesmo jeito do passo 2.
4. **Chamada**: na tela da aula (`/aulas/[id]`), "Abrir chamada" libera o
   check-in público para aquela turma; "Encerrar chamada" marca falta
   automática (`FALTA`, origem `SYSTEM`) para quem não confirmou.
5. **Desistência**: no roster da turma, "Desistência" marca o aluno como
   `DROPPED_OUT` — ele para de contar falta a partir dali e não é elegível
   para promoção.
6. **Finalizar turma**: calcula aprovação/reprovação de cada matrícula ativa
   pelo limite de faltas do curso e, se a turma tiver uma turma de CTL
   vinculada, promove automaticamente os aprovados. Quem não tem turma de
   CTL vinculada na hora fica na **fila de elegíveis** (`/turmas/fila`) para
   matrícula manual em lote depois.

## Check-in de presença sem login

Desde a v2, **o aluno nunca faz login para confirmar presença**. O fluxo é:

1. Na turma (`/turmas/[id]`), o admin gera o link de presença — um link
   permanente por turma (`/presenca/[codigo-da-turma]?t=TOKEN`), mostrado
   (com QR Code) **uma única vez** no momento em que é gerado, porque só o
   hash do token fica salvo no banco.
2. Esse link é compartilhado com a turma (WhatsApp, mural, etc.) e pode ser
   reaproveitado em toda aula, sem precisar de um código novo a cada vez —
   o que muda de uma aula para outra é só o `status = 'ATTENDANCE_OPEN'` da
   aula do dia.
3. O aluno abre o link, digita o próprio nome (busca entre os matriculados
   ativos daquela turma), confirma quem é com os **últimos 4 dígitos do seu
   telefone** cadastrado, e pronto — presença registrada.
4. Qualquer erro (nome não encontrado, telefone não confere, matrícula não
   ativa, chamada não aberta) mostra **a mesma mensagem genérica**, para
   nunca revelar a alguém com só o link público quem está ou não
   matriculado (BR-015).

O painel administrativo/professor continua **sempre** exigindo login — essa
mudança afeta só a experiência do aluno confirmando presença.

## Testes

```bash
npm run lint
npm run typecheck
npm run test          # testes unitários (lógica pura) — rápido, sem rede
npm run test:e2e       # Playwright — login, proteção de rotas, check-in público
```

### Testes de integração das regras críticas

```bash
npm run test:integration
```

16 cenários (TESTE 1-16) cobrindo matrícula, chamada única aberta por turma,
falta automática ao encerrar chamada, desistência e o fluxo completo de
check-in público — chamando as **funções reais do banco** (`trilho_*`), com
aluno e admin de teste autenticados de verdade e um client `anon` real para
o check-in público — não são mocks.

> ⚠️ Só rodam se `.env.local` tiver credenciais reais do Supabase (com as
> migrations v2 já aplicadas e `npm run seed` já rodado ao menos uma vez,
> para existir estrutura acadêmica), e criam/apagam dados de teste de
> verdade nesse projeto (sempre prefixados com `TESTE_AUTOMATIZADO_TRILHO`,
> sempre limpos ao final). Por isso **não** fazem parte do `npm test` padrão
> nem do CI do GitHub Actions — rode manualmente, de propósito, quando
> quiser validar contra o banco real.

## Build

```bash
npm run build
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente (mesmas do `.env.local`, com os valores
   reais) em **Project Settings → Environment Variables**.
3. Ajuste `NEXT_PUBLIC_SITE_URL` para a URL pública final (ex.:
   `https://trilhodovencedor-sandy.vercel.app`) — ela é usada para montar o
   link de presença (`/presenca/[turma]?t=...`) mostrado no QR Code e os
   links de convite/redefinição de senha.
4. Em **Authentication → URL Configuration** no Supabase, adicione essa
   mesma URL (e `/redefinir-senha`) na lista de Redirect URLs permitidas.
5. Deploy. As migrations/seed continuam sendo aplicadas manualmente no SQL
   Editor do Supabase — não fazem parte do processo de deploy da Vercel.

## Estrutura de pastas

```
src/
  app/
    (app)/            rotas autenticadas (sidebar desktop + nav inferior mobile)
      dashboard/ alunos/ cursos/ turmas/ aulas/ relatorios/ configuracoes/ perfil/
    presenca/[turma]/  check-in público SEM login — fora do grupo (app) de propósito
    professores/       cadastro público de professor SEM login — idem
    login/ esqueci-senha/ redefinir-senha/   rotas públicas de auth
    api/relatorios/[type]/                   download de relatórios (CSV/XLSX)
  components/
    ui/               shadcn/ui (gerados, evite editar à mão)
    layout/            sidebar, bottom nav, header, nav-items
    shared/            StatusBadge, StudentStatusBadge, AttendanceStatusBadge,
                        CourseBadge, AbsenceProgress, ClassCard, ConfirmDialog,
                        QRCodePanel, MemberCombobox, MetricCard, PaginationBar,
                        EmptyState, PageHeader
  features/            lógica por domínio (actions.ts + componentes)
    auth/ courses/ cohorts/ class-sessions/ enrollments/ students/
    public-checkin/ public-teacher-registration/ dashboard/ reports/
  lib/
    supabase/          clients (browser, server, admin, middleware)
    auth/              resolução do usuário logado e papel
    domain/            regras puras e testáveis (situação, código de aula,
                        dia da semana, roster, métricas)
    export/            construtores de CSV/XLSX
  types/database.ts    tipos do schema Supabase (escrito à mão — ver comentário no arquivo)
  validations/         schemas Zod
  data/seeds/           notas de referência (calendário não é mais importado em lote deste arquivo)
supabase/
  migrations/           SQL aditivo, roda no mesmo projeto do Oikos
  seed/                 seed dos cursos + script de dados fake de dev
docs/
  business-rules.md     as 15 regras de negócio críticas, numeradas (BR-001 a BR-015)
tests/
  unit/                 Vitest, lógica pura, sem rede
  integration/           Vitest contra o Supabase real (opt-in)
  e2e/                   Playwright
```

## Segurança

- RLS habilitado em todas as tabelas novas. `attendance`,
  `attendance_history`, `enrollments` e `public_checkin_attempts` **não têm
  policy de escrita para o cliente** — só as funções `SECURITY DEFINER`
  gravam nelas, depois de validar tudo.
- Check-in público: o role `anon` só tem `GRANT EXECUTE` em 3 funções
  (`trilho_public_get_status`, `trilho_public_search_students`,
  `trilho_public_checkin`) — **nenhuma tabela** tem grant direto para
  `anon`. Toda validação (link válido, turma ativa, chamada aberta, aluno
  identificado, matrícula ativa, sem duplicidade) acontece dentro dessas
  funções, no banco.
- Token do link de presença nunca é guardado em texto puro — só o hash
  (`sha256`). O texto puro existe apenas no retorno da chamada que gera o
  link, uma única vez.
- Rate limiting do check-in público é feito no banco (`public_checkin_attempts`,
  por turma + hash do IP), não em memória — necessário porque o ambiente de
  produção (Vercel) é serverless/stateless.
- O "aluno" de uma operação autenticada é **sempre** resolvido a partir da
  sessão (`auth.uid()` → `profiles.member_id`), nunca de um ID enviado pelo
  cliente; no check-in público (sem sessão), o aluno é resolvido só depois
  de nome + telefone conferirem, dentro da própria função `SECURITY DEFINER`.
- Duas matrículas `ACTIVE` para o mesmo aluno são impossíveis mesmo
  ignorando a aplicação — há um índice único parcial no Postgres
  (`enrollments_one_active_per_student`), assim como uma chamada aberta por
  turma (`class_sessions_one_open_per_cohort`).

## Evolução futura

- Notificação push quando a chamada de uma turma é aberta.
- Login por magic link (a estrutura de auth já comporta, só falta habilitar)
  para o painel administrativo/professor.
- Status `ATRASO` já existe no banco e nos componentes, mas ainda não tem um
  fluxo de UI dedicado além da marcação manual.
- Edição de datas de aulas já criadas (hoje só cancelar + criar de novo).
