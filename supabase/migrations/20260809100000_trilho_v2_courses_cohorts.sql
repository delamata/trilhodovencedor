-- =====================================================================
-- Trilho do Vencedor v2 — Curso != Turma
-- =====================================================================
-- Evolução do modelo: CURSO (modelo acadêmico: Maturidade, CTL) deixa
-- de se matricular/agendar aulas diretamente. Quem recebe matrícula e
-- calendário agora é a TURMA (cohort) — uma edição específica de um
-- curso (ex.: "Maturidade 2026"). Ver docs/business-rules.md.
--
-- ADITIVA ao Oikos, como sempre. Verificado antes de escrever esta
-- migration: courses tem só as 2 linhas do seed; enrollments, classes,
-- attendance, attendance_sessions, teacher_courses estão vazias em
-- produção — por isso as próximas migrations desta série podem
-- reestruturar essas tabelas livremente (recriar em vez de fazer ALTER
-- incremental complicado), sem risco de perda de dado real. Se este
-- projeto já estiver em uso com dados reais quando você aplicar isto,
-- pare e adapte para ALTER TABLE incremental antes de rodar.
-- =====================================================================

alter table courses add column if not exists lesson_code_prefix text;

update courses set lesson_code_prefix = 'MA' where code = 'MATURIDADE' and lesson_code_prefix is null;
update courses set lesson_code_prefix = 'CT' where code = 'CTL' and lesson_code_prefix is null;

-- Qualquer curso futuro precisa definir o prefixo (usado por
-- generateLessonCode() — ver src/lib/domain/lesson-code.ts).
alter table courses alter column lesson_code_prefix set not null;
alter table courses add constraint courses_lesson_code_prefix_format check (lesson_code_prefix ~ '^[A-Z]{2,4}$');

-- ---------------------------------------------------------------------
-- cohorts ("Turma"): edição específica de um curso.
-- ---------------------------------------------------------------------
create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete restrict,
  code text not null unique,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'PLANNED'
    check (status in ('PLANNED', 'ACTIVE', 'FINISHED', 'CANCELLED')),

  -- "turma anterior" (mesma edição do curso). "Próxima turma" é
  -- derivada por busca reversa (quem tem previous_cohort_id = esta),
  -- não duplicada aqui — decisão de arquitetura para não manter dois
  -- ponteiros que podem ficar inconsistentes entre si.
  previous_cohort_id uuid references cohorts(id) on delete set null,

  -- Só usado em turmas de MATURIDADE: para qual turma de CTL os
  -- aprovados serão promovidos automaticamente ao finalizar (seção
  -- 16). A mesma turma de CTL também é a origem do calendário gerado
  -- a partir das terças (seção 9) — é a mesma relação, um só campo.
  next_ctl_cohort_id uuid references cohorts(id) on delete set null,

  -- Link público de presença (seção 20). Token nunca em texto puro.
  public_attendance_enabled boolean not null default false,
  public_attendance_token_hash text,
  public_attendance_token_created_at timestamptz,
  attendance_identification_mode text not null default 'NAME_PHONE_SUFFIX'
    check (attendance_identification_mode in ('NAME_PHONE_SUFFIX', 'STUDENT_PIN')),

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date),
  check (next_ctl_cohort_id is null or next_ctl_cohort_id <> id),
  check (previous_cohort_id is null or previous_cohort_id <> id)
);

create index if not exists cohorts_course_idx on cohorts (course_id);
create index if not exists cohorts_status_idx on cohorts (status);

drop trigger if exists cohorts_set_updated_at on cohorts;
create trigger cohorts_set_updated_at
  before update on cohorts
  for each row execute function trilho_set_updated_at();

comment on table cohorts is '"Turma" — edição específica de um curso (ex.: Maturidade 2026). Ver docs/business-rules.md.';
comment on column cohorts.next_ctl_cohort_id is 'BR-009: turma de CTL para a qual aprovados desta turma de Maturidade são promovidos automaticamente. Também é a origem do calendário do CTL (BR-007).';
