-- =====================================================================
-- Trilho do Vencedor v2 — reestrutura classes/attendance/enrollments
-- em torno de TURMA (cohort), não mais CURSO diretamente.
-- =====================================================================
-- As 6 tabelas abaixo (classes, attendance, attendance_sessions,
-- attendance_history, enrollments, teacher_courses) estão VAZIAS em
-- produção neste momento (confirmado antes de escrever esta migration
-- — nenhuma turma/aula/matrícula real foi criada ainda pelo painel).
-- Por isso são recriadas do zero na nova forma, em vez de um ALTER
-- TABLE incremental — mais simples e o resultado final é idêntico.
-- Se isto for aplicado depois de já existir dado real, NÃO rode como
-- está: adapte para ALTER TABLE + backfill antes do drop.
--
-- attendance_sessions é APOSENTADA: no modelo antigo, cada aula tinha
-- seu próprio código/QR de curta duração. No modelo novo (seção 19-28
-- da spec de evolução), o aluno acessa por um link PERMANENTE da
-- turma (cohorts.public_attendance_token_hash); "chamada aberta" vira
-- só um status em class_sessions (attendance_opened_at/
-- attendance_closed_at), sem precisar de token por aula.
-- =====================================================================

drop table if exists attendance_history;
drop table if exists attendance;
drop table if exists attendance_sessions;
drop table if exists classes;
drop table if exists enrollments;
drop table if exists teacher_courses;

-- ---------------------------------------------------------------------
-- class_sessions ("Aula"): quando um lesson_template é ministrado numa turma.
-- ---------------------------------------------------------------------
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete restrict,
  lesson_template_id uuid not null references lesson_templates(id) on delete restrict,
  class_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'ATTENDANCE_OPEN', 'COMPLETED', 'CANCELLED')),
  attendance_opened_at timestamptz,
  attendance_closed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (cohort_id, lesson_template_id),
  check (end_time > start_time)
);

create index class_sessions_cohort_idx on class_sessions (cohort_id);
create index class_sessions_date_idx on class_sessions (class_date);
create index class_sessions_status_idx on class_sessions (status);

-- BR não numerada explícita, mas seção 27: no máximo UMA aula com
-- chamada aberta POR TURMA (não só por aula) — o índice único parcial
-- é o que garante isso no banco, não só a checagem na função.
create unique index class_sessions_one_open_per_cohort
  on class_sessions (cohort_id)
  where (status = 'ATTENDANCE_OPEN');

drop trigger if exists class_sessions_set_updated_at on class_sessions;
create trigger class_sessions_set_updated_at
  before update on class_sessions
  for each row execute function trilho_set_updated_at();

comment on table class_sessions is '"Aula" — quando um lesson_template acontece numa turma. Chamada e presença giram em torno desta tabela.';

-- ---------------------------------------------------------------------
-- teacher_cohorts: professores autorizados por TURMA (não mais só por curso —
-- seção 44: "Professor: somente turmas autorizadas").
-- ---------------------------------------------------------------------
create table teacher_cohorts (
  teacher_id uuid not null references members(id) on delete cascade,
  cohort_id uuid not null references cohorts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, cohort_id)
);

-- ---------------------------------------------------------------------
-- enrollments: aluno matriculado numa TURMA (não mais direto num curso).
-- status/academic_result separados (decisão de arquitetura — ver
-- docs/business-rules.md): mais simples que estados combinados, e
-- deixa claro que "desistente" e "não aprovado" são fatos diferentes
-- (um é abandono no meio, outro é resultado ao final).
-- ---------------------------------------------------------------------
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references members(id) on delete restrict,
  cohort_id uuid not null references cohorts(id) on delete restrict,

  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'COMPLETED', 'DROPPED_OUT', 'CANCELLED')),
  academic_result text not null default 'PENDING'
    check (academic_result in ('PENDING', 'APPROVED', 'NOT_APPROVED')),

  enrolled_at date not null default (now() at time zone 'America/Sao_Paulo')::date,
  completed_at date,

  dropped_out_at date,
  dropout_reason text,
  dropout_notes text,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (status <> 'DROPPED_OUT' or dropped_out_at is not null),
  check (
    (status = 'COMPLETED' and academic_result in ('APPROVED', 'NOT_APPROVED'))
    or (status <> 'COMPLETED')
  )
);

create index enrollments_student_idx on enrollments (student_id);
create index enrollments_cohort_idx on enrollments (cohort_id);
create index enrollments_status_idx on enrollments (status);

-- REGRA CRÍTICA inalterada (BR-001): no máximo uma matrícula ACTIVE
-- por aluno, agora entre TODAS as turmas (de qualquer curso).
create unique index enrollments_one_active_per_student
  on enrollments (student_id)
  where (status = 'ACTIVE');

drop trigger if exists enrollments_set_updated_at on enrollments;
create trigger enrollments_set_updated_at
  before update on enrollments
  for each row execute function trilho_set_updated_at();

-- ---------------------------------------------------------------------
-- attendance: presença por (aula, aluno). created_by agora aceita nulo
-- — check-in público não tem sessão autenticada (seção 19).
-- ---------------------------------------------------------------------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references members(id) on delete restrict,
  status text not null
    check (status in ('PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO')),
  source text not null
    check (source in ('STUDENT_CHECKIN', 'PUBLIC_CHECKIN', 'TEACHER', 'ADMIN', 'SYSTEM')),
  checked_in_at timestamptz,
  created_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (class_session_id, student_id)
);

create index attendance_class_session_idx on attendance (class_session_id);
create index attendance_student_idx on attendance (student_id);
create index attendance_status_idx on attendance (status);

drop trigger if exists attendance_set_updated_at on attendance;
create trigger attendance_set_updated_at
  before update on attendance
  for each row execute function trilho_set_updated_at();

-- ---------------------------------------------------------------------
-- attendance_history: histórico de mudança de status — inalterado.
-- ---------------------------------------------------------------------
create table attendance_history (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  reason text,
  changed_at timestamptz not null default now()
);

create index attendance_history_attendance_idx on attendance_history (attendance_id);

-- ---------------------------------------------------------------------
-- public_checkin_attempts: rate limiting do endpoint público (seção
-- 25), gravado no banco (não em memória do processo — a Vercel é
-- serverless/stateless, então rate limit em memória não seria
-- confiável entre invocações/regiões).
-- ---------------------------------------------------------------------
create table public_checkin_attempts (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references cohorts(id) on delete cascade,
  ip_hash text not null,
  kind text not null check (kind in ('SEARCH', 'CHECKIN')),
  created_at timestamptz not null default now()
);

create index public_checkin_attempts_lookup_idx
  on public_checkin_attempts (cohort_id, ip_hash, kind, created_at desc);

comment on table public_checkin_attempts is 'Rate limiting do check-in público — nunca guarda nome/telefone digitado, só IP em hash.';
