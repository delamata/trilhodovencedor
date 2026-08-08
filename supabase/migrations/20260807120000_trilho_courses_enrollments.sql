-- =====================================================================
-- Trilho do Vencedor — Cursos e Matrículas
-- =====================================================================
-- Migration ADITIVA: roda no MESMO projeto Supabase do app Oikos.
-- Não altera nenhuma tabela existente (members, profiles, cultos,
-- presencas_culto, movimentacoes, celula_hierarquia). Reaproveita:
--   - members  → cadastro da pessoa (usado como "aluno"/"professor")
--   - profiles → liga auth.users -> members (is_admin já existe lá)
--
-- Papéis do sistema de curso são DERIVADOS, não armazenados:
--   ADMIN     = profiles.is_admin = true
--   PROFESSOR = existe linha em teacher_courses para o curso
--   ALUNO     = existe matrícula ACTIVE em enrollments
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_absences integer not null check (max_absences >= 0),
  justified_absence_counts_towards_limit boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table courses is 'Configuração dos cursos do Trilho do Vencedor (Maturidade, CTL, ...).';
comment on column courses.max_absences is 'Limite de faltas do curso. Não hardcode este número na aplicação.';
comment on column courses.justified_absence_counts_towards_limit is
  'Se true, FALTA_JUSTIFICADA conta para o limite de faltas. Padrão: false.';

-- ---------------------------------------------------------------------
-- enrollments: histórico de matrículas. Regra crítica: no máximo UMA
-- matrícula ACTIVE por aluno, em qualquer curso (garantido por índice
-- único parcial abaixo — não confiar só no backend/frontend).
-- ---------------------------------------------------------------------
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references members(id) on delete restrict,
  course_id uuid not null references courses(id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED', 'TRANSFERRED')),
  enrolled_at date not null default (now() at time zone 'America/Sao_Paulo')::date,
  ended_at date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enrollments_student_idx on enrollments (student_id);
create index if not exists enrollments_course_idx on enrollments (course_id);
create index if not exists enrollments_status_idx on enrollments (status);

-- REGRA CRÍTICA (garantida pelo banco): um aluno nunca pode ter duas
-- matrículas ACTIVE simultâneas, nem no mesmo curso nem em cursos
-- diferentes (ex.: Maturidade e CTL ao mesmo tempo).
create unique index if not exists enrollments_one_active_per_student
  on enrollments (student_id)
  where (status = 'ACTIVE');

-- ---------------------------------------------------------------------
-- teacher_courses: professores autorizados por curso
-- ---------------------------------------------------------------------
create table if not exists teacher_courses (
  teacher_id uuid not null references members(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, course_id)
);

-- ---------------------------------------------------------------------
-- updated_at automático (função própria do Trilho, não reaproveita a
-- set_updated_at() do Oikos para manter fronteira clara entre os apps)
-- ---------------------------------------------------------------------
create or replace function trilho_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists courses_set_updated_at on courses;
create trigger courses_set_updated_at
  before update on courses
  for each row execute function trilho_set_updated_at();

drop trigger if exists enrollments_set_updated_at on enrollments;
create trigger enrollments_set_updated_at
  before update on enrollments
  for each row execute function trilho_set_updated_at();
