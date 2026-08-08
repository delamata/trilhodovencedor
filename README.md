# Controle de Presença — Trilho do Vencedor

Aplicação web para gestão de alunos, cursos (Maturidade e CTL), calendário
de aulas e controle de presença por QR Code/código, para os cursos do
Trilho do Vencedor.

> **Status:** Fase 1 de 5 concluída (setup, banco de dados e
> autenticação). As demais fases — matrícula/calendário, presença por QR
> Code, dashboards/relatórios, testes/CI/PWA — ainda serão implementadas.
> Este README será substituído por uma versão completa ao final do
> projeto (instruções de deploy, seed do calendário, etc.).

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui ·
React Hook Form · Zod · Supabase (Postgres + Auth + RLS) · Vitest ·
Playwright.

## Relação com o app Oikos

Este projeto é um repositório **separado** do app Oikos
(`C:\Users\andre\Oikos`), mas usa **o mesmo projeto Supabase**. As
tabelas novas (`courses`, `enrollments`, `teacher_courses`, `classes`,
`attendance_sessions`, `attendance`, `attendance_history`, `audit_logs`)
são aditivas — nenhuma tabela do Oikos é alterada. Este app reaproveita
`members` (cadastro de pessoas) e `profiles` (login → pessoa) que já
existem no banco do Oikos.

## Pré-requisitos

- Node.js 20+ e npm
- Um projeto Supabase (o mesmo já usado pelo Oikos, ou um novo — veja
  acima)

## Instalação

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com os dados do projeto Supabase (Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Banco de dados (migrations)

Rode, nesta ordem, o conteúdo de cada arquivo em `supabase/migrations/`
no SQL Editor do projeto Supabase (ou via Supabase CLI):

1. `20260807120000_trilho_courses_enrollments.sql`
2. `20260807120100_trilho_classes_attendance.sql`
3. `20260807120200_trilho_audit_logs.sql`
4. `20260807120300_trilho_functions.sql`
5. `20260807120350_trilho_views.sql`
6. `20260807120400_trilho_rls.sql`

Depois, rode o seed dos cursos (`supabase/seed/01_courses.sql`) uma vez.

## Executando localmente

```bash
npm run dev
```

Abra http://localhost:3000.

## Qualidade

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Estrutura de pastas

```
src/
  app/            rotas (App Router) — (app)/ agrupa as rotas autenticadas
  components/     ui/ (shadcn) e layout/shared reutilizáveis
  features/       lógica por domínio (auth, ...)
  lib/            supabase (clients), auth, domain (regras), format
  types/          tipos do banco (Database)
  validations/    schemas Zod
  data/seeds/     dados de seed versionados (ex.: calendário do Maturidade)
supabase/
  migrations/     SQL aditivo, roda no mesmo projeto do Oikos
  seed/           seeds (cursos, etc.)
```
