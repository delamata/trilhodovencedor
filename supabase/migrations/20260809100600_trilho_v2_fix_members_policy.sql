-- =====================================================================
-- Trilho do Vencedor v2 — corrige policy de members quebrada pela
-- reestruturação
-- =====================================================================
-- A policy "trilho_members_select_scope" (Fase 2,
-- 20260808090000_trilho_members_select_policy.sql) chamava
-- trilho_is_teacher_of(course_id), que por sua vez lia a tabela
-- teacher_courses — ambas não existem mais depois de
-- 20260809100200_trilho_v2_restructure.sql. Sem este fix, qualquer
-- SELECT em members por um professor (não-admin) daria erro em tempo
-- de execução ("relation teacher_courses does not exist").
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
        and trilho_is_teacher_of_cohort(e.cohort_id)
    )
  );

-- Funções da v1 que ficaram órfãs (nada mais as chama) e quebradas
-- (referenciam teacher_courses/classes/attendance_sessions/course_id,
-- que não existem mais) — removidas para não sobrar função "fantasma"
-- que erra se alguém chamar por engano. As que tinham a MESMA
-- assinatura na v2 (mesmo nome + mesmos tipos de parâmetro) já foram
-- substituídas por CREATE OR REPLACE na migration anterior; só as que
-- mudaram de nome ou ficaram sem equivalente precisam de DROP aqui.
drop function if exists trilho_is_teacher_of(uuid);
drop function if exists trilho_can_manage_course(uuid);
drop function if exists trilho_change_enrollment(uuid, uuid, text);
drop function if exists trilho_create_class(uuid, integer, text, date, time, time, text, boolean, integer, text, time, time);
drop function if exists trilho_generate_ctl_from_class(uuid, integer, text, time, time);
drop function if exists trilho_cancel_class(uuid, text);
drop function if exists trilho_open_attendance_session(uuid, integer);
drop function if exists trilho_close_attendance_session(uuid);
drop function if exists trilho_checkin_attendance(text);
