-- Seed dos cursos iniciais. Idempotente (pode rodar mais de uma vez).
-- Rode uma vez no SQL Editor do projeto Supabase, depois das migrations.

insert into courses (code, name, lesson_code_prefix, max_absences, justified_absence_counts_towards_limit, active)
values
  ('MATURIDADE', 'Maturidade', 'MA', 7, false, true),
  ('CTL', 'CTL', 'CT', 6, false, true)
on conflict (code) do update set
  name = excluded.name,
  lesson_code_prefix = excluded.lesson_code_prefix,
  max_absences = excluded.max_absences,
  justified_absence_counts_towards_limit = excluded.justified_absence_counts_towards_limit,
  active = excluded.active;
