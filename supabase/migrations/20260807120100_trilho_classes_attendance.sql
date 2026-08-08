-- =====================================================================
-- Trilho do Vencedor — Calendário de Aulas e Presença
-- =====================================================================

-- ---------------------------------------------------------------------
-- classes ("Aula")
-- ---------------------------------------------------------------------
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete restrict,
  class_number integer not null check (class_number > 0),
  title text not null,
  class_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'ATTENDANCE_OPEN', 'COMPLETED', 'CANCELLED')),
  notes text,
  attendance_open_at timestamptz,
  attendance_close_at timestamptz,
  -- Se esta aula de CTL foi gerada automaticamente a partir de uma aula
  -- de Maturidade numa terça-feira, aponta para a aula de origem.
  generated_from_class_id uuid references classes(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists classes_course_idx on classes (course_id);
create index if not exists classes_date_idx on classes (class_date);
create index if not exists classes_status_idx on classes (status);
create unique index if not exists classes_course_number_idx on classes (course_id, class_number);

drop trigger if exists classes_set_updated_at on classes;
create trigger classes_set_updated_at
  before update on classes
  for each row execute function trilho_set_updated_at();

-- ---------------------------------------------------------------------
-- attendance_sessions ("chamada" aberta pelo professor/admin)
-- Só pode existir UMA sessão aberta (closed_at is null) por aula.
-- Código/token nunca são armazenados em texto puro — só o hash.
-- ---------------------------------------------------------------------
create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  token_hash text not null,
  short_code_hash text not null,
  opened_by uuid references auth.users(id),
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists attendance_sessions_class_idx on attendance_sessions (class_id);
create unique index if not exists attendance_sessions_one_open_per_class
  on attendance_sessions (class_id)
  where (closed_at is null);

-- ---------------------------------------------------------------------
-- attendance: um registro por (aula, aluno). UNIQUE evita check-in
-- duplicado mesmo sob concorrência.
-- ---------------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references members(id) on delete restrict,
  status text not null
    check (status in ('PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO')),
  source text not null
    check (source in ('STUDENT_CHECKIN', 'TEACHER', 'ADMIN', 'SYSTEM')),
  checked_in_at timestamptz,
  created_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists attendance_class_idx on attendance (class_id);
create index if not exists attendance_student_idx on attendance (student_id);
create index if not exists attendance_status_idx on attendance (status);

drop trigger if exists attendance_set_updated_at on attendance;
create trigger attendance_set_updated_at
  before update on attendance
  for each row execute function trilho_set_updated_at();

-- ---------------------------------------------------------------------
-- attendance_history: nunca apagamos/sobrescrevemos silenciosamente uma
-- mudança de status de presença — tudo fica registrado aqui.
-- ---------------------------------------------------------------------
create table if not exists attendance_history (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  reason text,
  changed_at timestamptz not null default now()
);

create index if not exists attendance_history_attendance_idx on attendance_history (attendance_id);
