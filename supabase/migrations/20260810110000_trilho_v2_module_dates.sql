-- =====================================================================
-- Trilho do Vencedor v2 — inclui a data de cada aula do módulo na
-- listagem de módulos disponíveis pra professor escolher
-- =====================================================================
-- Postgres não deixa CREATE OR REPLACE mudar o formato de RETURNS
-- TABLE, então precisa dropar antes de recriar com as colunas de data.
-- =====================================================================

drop function if exists trilho_public_list_teachable_modules();

create or replace function trilho_public_list_teachable_modules()
returns table (
  cohort_id uuid, cohort_code text, cohort_name text, course_name text,
  module_number integer,
  lesson1_code text, lesson1_title text, lesson1_date date,
  lesson2_code text, lesson2_title text, lesson2_date date,
  taken_by_member_id uuid, taken_by_name text
)
language sql security definer stable as $$
  select
    c.id, c.code, c.name, co.name,
    lt1.module_number,
    lt1.lesson_code, lt1.title, cs1.class_date,
    lt2.lesson_code, lt2.title, cs2.class_date,
    mt.teacher_id, m.nome
  from cohorts c
  join courses co on co.id = c.course_id
  join lesson_templates lt1 on lt1.course_id = c.course_id and lt1.lesson_number = 1
  join lesson_templates lt2 on lt2.course_id = c.course_id and lt2.module_number = lt1.module_number and lt2.lesson_number = 2
  left join class_sessions cs1 on cs1.cohort_id = c.id and cs1.lesson_template_id = lt1.id and cs1.status <> 'CANCELLED'
  left join class_sessions cs2 on cs2.cohort_id = c.id and cs2.lesson_template_id = lt2.id and cs2.status <> 'CANCELLED'
  left join module_teachers mt on mt.cohort_id = c.id and mt.module_number = lt1.module_number
  left join members m on m.id = mt.teacher_id
  where c.status in ('PLANNED', 'ACTIVE')
  order by co.name, c.code, lt1.module_number;
$$;

grant execute on function trilho_public_list_teachable_modules() to anon, authenticated;
