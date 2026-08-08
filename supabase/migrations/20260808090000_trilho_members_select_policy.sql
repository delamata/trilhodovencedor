-- =====================================================================
-- Trilho do Vencedor — policy adicional de leitura em members
-- =====================================================================
-- ADITIVA: não remove nem altera a policy "members_select_scope" já
-- criada pelo Oikos (supabase/add_rbac.sql) — policies permissivas do
-- Postgres se combinam com OR, então isto só AMPLIA quem consegue ler
-- `members`, nunca restringe o que o Oikos já permite.
--
-- Por quê: um professor do Trilho pode não ser líder/admin no Oikos, e
-- por isso pode não estar dentro do escopo de célula de
-- pode_ver_celula(). Sem esta policy, ele não conseguiria ver o NOME
-- dos próprios alunos (ex.: na lista de presentes da aula, Fase 3).
-- Alunos também precisam ver o próprio nome (ex.: "Olá, {nome}" no
-- dashboard).
-- ---------------------------------------------------------------------
drop policy if exists "trilho_members_select_scope" on members;
create policy "trilho_members_select_scope" on members
  for select
  using (
    trilho_is_admin()
    or members.id = trilho_member_id()
    or exists (
      select 1 from enrollments e
      where e.student_id = members.id
        and e.status = 'ACTIVE'
        and trilho_is_teacher_of(e.course_id)
    )
  );
