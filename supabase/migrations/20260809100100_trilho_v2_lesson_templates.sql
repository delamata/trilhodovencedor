-- =====================================================================
-- Trilho do Vencedor v2 — lesson_templates ("Estrutura do curso")
-- =====================================================================
-- Conteúdo acadêmico (módulo + aula + código + título), independente
-- de quando/em qual turma ela é ministrada — isso é class_sessions
-- (próxima migration). BR-004/BR-005/BR-006/BR-008.
-- ---------------------------------------------------------------------
create table if not exists lesson_templates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  module_number integer not null check (module_number > 0),
  -- BR-004: todo módulo tem exatamente 2 aulas. O check abaixo impede
  -- um 3º número; a garantia de que 1 e 2 sempre existem AOS PARES é
  -- feita na função trilho_add_module() (cria as duas juntas, na
  -- mesma transação), não só por este check.
  lesson_number integer not null check (lesson_number in (1, 2)),
  lesson_code text not null,
  title text not null,
  description text,
  display_order integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (course_id, module_number, lesson_number),
  unique (course_id, lesson_code)
);

create index if not exists lesson_templates_course_idx on lesson_templates (course_id);

drop trigger if exists lesson_templates_set_updated_at on lesson_templates;
create trigger lesson_templates_set_updated_at
  before update on lesson_templates
  for each row execute function trilho_set_updated_at();

comment on table lesson_templates is 'Conteúdo acadêmico (módulo/aula/código/título) de um curso — "Estrutura do curso" na UI. BR-004/BR-005/BR-006.';
comment on column lesson_templates.lesson_code is 'Gerado por generateLessonCode() (src/lib/domain/lesson-code.ts), nunca digitado manualmente. Ex.: MA01-01, CT03-02.';
