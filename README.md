# Controle de Presença — Trilho do Vencedor

Aplicação web para gestão de alunos, cursos, calendário de aulas e controle de
presença (via QR Code/link ou código) dos cursos do Trilho do Vencedor —
inicialmente **Maturidade** e **CTL**.

- Alunos consultam suas aulas e registram presença pelo celular.
- Professores abrem/fecham a chamada de cada aula.
- Administradores cadastram/matriculam alunos, gerenciam o calendário e
  acompanham presença, faltas e limites em dashboards e relatórios.

## Sumário

- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Relação com o app Oikos](#relação-com-o-app-oikos)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do Supabase](#configuração-do-supabase)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Execução local](#execução-local)
- [Migrations](#migrations)
- [Seed](#seed)
- [Como cadastrar as datas das aulas](#como-cadastrar-as-datas-das-aulas)
- [Testes](#testes)
- [Build](#build)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Segurança](#segurança)
- [Evolução futura](#evolução-futura)

## Arquitetura

- **Frontend**: Next.js (App Router) renderizado no servidor por padrão;
  interatividade pontual em Client Components. Formulários com React Hook
  Form + Zod. UI com shadcn/ui (Tailwind).
- **Backend**: Server Actions e Route Handlers do próprio Next.js — sem API
  separada. Toda regra de negócio crítica (matrícula única ativa, presença só
  na aula certa, chamada aberta, sem duplicidade, limites de falta) é imposta
  **no banco**, dentro de funções PostgreSQL `SECURITY DEFINER`
  (`trilho_*`), não só no frontend/backend — ver
  `supabase/migrations/20260807120300_trilho_functions.sql`.
- **Banco/Auth**: Supabase (Postgres + Auth + Row Level Security). O check-in
  de presença, abertura/fechamento de chamada, matrícula e correção de
  presença passam por RPCs; o cliente nunca escreve direto nas tabelas
  sensíveis (`attendance`, `attendance_sessions`, `audit_logs` — bloqueado
  por RLS de propósito).

## Tecnologias

Next.js · TypeScript (strict) · Tailwind CSS · shadcn/ui · React Hook Form ·
Zod · Supabase (Postgres, Auth, RLS) · Recharts · Vitest · Playwright ·
ESLint · Prettier · exceljs (exportação XLSX).

## Relação com o app Oikos

Este projeto é um **repositório separado** do app Oikos
(`Dashboard de Membros — Videira SCS / Rede Oikos`), mas usa **o mesmo
projeto Supabase**. As tabelas novas deste projeto
(`courses`, `enrollments`, `teacher_courses`, `classes`,
`attendance_sessions`, `attendance`, `attendance_history`, `audit_logs`, a
view `trilho_student_summary` e as funções `trilho_*`) são **aditivas** —
nenhuma migration deste projeto altera ou remove nada do Oikos.

Este app reaproveita, só leitura/vínculo:

- `members` — cadastro da pessoa (é o "aluno"/"professor" aqui também);
- `profiles` — liga `auth.users` → `members`. `profiles.is_admin` já
  existente no Oikos é o mesmo flag usado para o papel ADMIN aqui.

Papéis (ADMIN/PROFESSOR/ALUNO) são **derivados**, nunca armazenados numa
tabela de papéis:

| Papel | Como é definido |
|---|---|
| ADMIN | `profiles.is_admin = true` |
| PROFESSOR | linha em `teacher_courses` para o curso |
| ALUNO | matrícula `ACTIVE` em `enrollments` |

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
   de curso → Matricular aluno, ou importação em lote em `/alunos`) — não
   existe cadastro público. Cada matrícula nova envia um convite de login por
   e-mail (Supabase Admin API), do mesmo jeito que o Oikos já convida
   líderes.

## Variáveis de ambiente

Veja [`​.env.example`](.env.example) — nunca cole valores reais nesse
arquivo, só em `.env.local` (que já está no `.gitignore`).

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public (pública por design; a segurança vem do RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role — **secreta**, só usada em código de servidor |
| `NEXT_PUBLIC_APP_TIMEZONE` | `America/Sao_Paulo` (não altere) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do app (usada para montar o link de convite/redefinição de senha e o link de presença) |

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
```

Todos os arquivos são idempotentes (`create table if not exists`, `create or
replace function`, `drop policy if exists` antes de recriar) — seguro rodar
de novo se precisar corrigir algo no meio.

**Para conferir que aplicou certo**: em **Table Editor** devem aparecer
`courses`, `enrollments`, `teacher_courses`, `classes`,
`attendance_sessions`, `attendance`, `attendance_history`, `audit_logs`.

## Seed

```sql
-- supabase/seed/01_courses.sql, no SQL Editor
insert into courses (code, name, max_absences, justified_absence_counts_towards_limit, active)
values
  ('MATURIDADE', 'Maturidade', 7, false, true),
  ('CTL', 'CTL', 6, false, true)
on conflict (code) do update set
  name = excluded.name,
  max_absences = excluded.max_absences,
  justified_absence_counts_towards_limit = excluded.justified_absence_counts_towards_limit,
  active = excluded.active;
```

### Usuários fake de desenvolvimento

```bash
npm run seed
```

Cria (idempotente) 1 ADMIN, 1 PROFESSOR e 5 alunos de cada curso, todos com a
senha fixa `trilho-dev-2026` (só para dev local). Roda `supabase/seed/run.ts`.

> ⚠️ Como este projeto compartilha o Supabase do Oikos, `npm run seed` cria
> pessoas/logins **de verdade** nesse banco. Só rode contra um projeto que
> seja realmente de desenvolvimento/teste.

## Como cadastrar as datas das aulas

**Nenhuma data de aula é inventada** — nem no código, nem nos seeds.

- **Pelo painel** (recomendado): logado como ADMIN, vá em `/calendario` →
  "Nova aula". Se a data cair numa terça-feira e o curso for Maturidade,
  aparece a opção "Criar também a aula correspondente do CTL" — marque para
  gerar as duas de uma vez.
- **Em lote**: no mesmo painel, "Importar calendário" aceita colar várias
  linhas (`numero,titulo,data,horario_inicio,horario_fim,criar_ctl`).
- **Arquivo de seed do Maturidade**: [`src/data/seeds/maturidade-calendar.ts`](src/data/seeds/maturidade-calendar.ts)
  começa **vazio**, de propósito, com instruções no próprio arquivo. Quando
  tiver o calendário real da administração, preencha o array e use o botão
  "Carregar de maturidade-calendar.ts" dentro do diálogo de importação em
  lote.
- Aulas de **CTL só existem** geradas a partir de uma aula de Maturidade que
  caia numa terça-feira (automático ao criar, ou o botão "Gerar aula de CTL"
  numa aula de Maturidade de terça que ainda não tem CTL gerado).

## Testes

```bash
npm run lint
npm run typecheck
npm run test          # 32 testes unitários (lógica pura) — rápido, sem rede
npm run test:e2e       # Playwright — fluxo de login e proteção de rotas
```

### Testes de integração das regras críticas

```bash
npm run test:integration
```

Cobre os cenários da especificação (matrícula única, presença só no curso
certo, sem duplicidade, chamada encerrada, aula cancelada não gera falta)
chamando as **funções reais do banco** (`trilho_*`), com um aluno e um admin
de teste autenticados de verdade — não são mocks.

> ⚠️ Só rodam se `.env.local` tiver credenciais reais do Supabase, e criam/
> apagam dados de teste de verdade nesse projeto (sempre prefixados com
> `TESTE_AUTOMATIZADO_TRILHO`, sempre limpos ao final). Por isso **não** fazem
> parte do `npm test` padrão nem do CI do GitHub Actions — rode manualmente,
> de propósito, quando quiser validar contra o banco real.

Os testes 6–9 da especificação (limite atingido/excedido em 7 e 8 faltas no
Maturidade, 6 e 7 no CTL) são lógica pura e já ficam em
`tests/unit/situacao.test.ts`, sem precisar de banco.

## Build

```bash
npm run build
```

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente (mesmas do `.env.local`, com os valores
   reais) em **Project Settings → Environment Variables**.
3. Ajuste `NEXT_PUBLIC_SITE_URL` para a URL pública final (ex.:
   `https://trilho-do-vencedor.vercel.app`) — ela é usada para montar os
   links de convite/redefinição de senha e o link de presença enviado no
   QR Code.
4. Em **Authentication → URL Configuration** no Supabase, adicione essa
   mesma URL (e `/redefinir-senha`) na lista de Redirect URLs permitidas.
5. Deploy. As migrations/seed continuam sendo aplicadas manualmente no SQL
   Editor do Supabase — não fazem parte do processo de deploy da Vercel.

## Estrutura de pastas

```
src/
  app/
    (app)/            rotas autenticadas (sidebar desktop + nav inferior mobile)
      dashboard/ alunos/ cursos/ calendario/ aulas/ presenca/ relatorios/ configuracoes/ perfil/
    login/ esqueci-senha/ redefinir-senha/   rotas públicas de auth
    api/relatorios/[type]/                   download de relatórios (CSV/XLSX)
  components/
    ui/               shadcn/ui (gerados, evite editar à mão)
    layout/            sidebar, bottom nav, header
    shared/            StatusBadge, StudentStatusBadge, AttendanceStatusBadge,
                        CourseBadge, AbsenceProgress, ClassCard, ConfirmDialog,
                        QRCodePanel, MemberCombobox, MetricCard, PaginationBar,
                        EmptyState, PageHeader
  features/            lógica por domínio (actions.ts + componentes)
    auth/ courses/ enrollments/ classes/ attendance/ students/ dashboard/ reports/
  lib/
    supabase/          clients (browser, server, admin, middleware)
    auth/              resolução do usuário logado e papel
    domain/            regras puras e testáveis (situação, calendário, roster, métricas)
    export/            construtores de CSV/XLSX
  types/database.ts    tipos do schema Supabase (escrito à mão — ver comentário no arquivo)
  validations/         schemas Zod
  data/seeds/           dados de seed versionados (calendário do Maturidade)
supabase/
  migrations/           SQL aditivo, roda no mesmo projeto do Oikos
  seed/                 seed dos cursos + script de usuários de dev
tests/
  unit/                 Vitest, lógica pura, sem rede
  integration/           Vitest contra o Supabase real (opt-in)
  e2e/                   Playwright
```

## Segurança

- RLS habilitado em todas as tabelas novas. `attendance`,
  `attendance_sessions` e `audit_logs` **não têm policy de escrita para o
  cliente** — só as funções `SECURITY DEFINER` gravam nelas, depois de
  validar tudo (matrícula ativa, curso certo, chamada aberta, sem
  duplicidade — seção 7 da especificação).
- Código/token da chamada nunca são guardados em texto puro — só o hash
  (`sha256`). O texto puro existe apenas no retorno da chamada que abre a
  chamada, uma única vez.
- O "aluno" de uma operação é **sempre** resolvido a partir da sessão
  (`auth.uid()` → `profiles.member_id`), nunca de um ID enviado pelo
  cliente.
- Duas matrículas `ACTIVE` para o mesmo aluno são impossíveis mesmo
  ignorando a aplicação — há um índice único parcial no Postgres
  (`enrollments_one_active_per_student`).

## Evolução futura

- Notificação push (arquitetura já preparada — ver seção 24 da spec).
- Login por magic link (a estrutura de auth já comporta, só falta habilitar).
- Status `ATRASO` já existe no banco e nos componentes, mas ainda não tem um
  fluxo de UI dedicado além da marcação manual.
- Testes E2E mais profundos do fluxo de check-in via QR Code (hoje cobertos
  pelos testes de integração no nível de banco; um teste Playwright
  ponta-a-ponta exigiria um ambiente com dados semeados dedicados).
