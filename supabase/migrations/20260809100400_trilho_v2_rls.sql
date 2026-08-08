-- =====================================================================
-- Trilho do Vencedor v2 — Row Level Security
-- =====================================================================
-- Importante: o check-in público NUNCA lê/escreve tabela diretamente
-- pelo cliente (nem com a chave anon) — ele só chama as 3 funções
-- SECURITY DEFINER (trilho_public_get_status/search_students/checkin),
-- que rodam com privilégio próprio e fazem toda validação por dentro.
-- Por isso "anon" só recebe GRANT EXECUTE nessas 3 funções, nunca
-- SELECT/INSERT direto em cohorts/class_sessions/members/enrollments/
-- attendance. Isso é o que impede alguém de listar turmas, alunos ou
-- aulas só com a anon key.
-- =====================================================================

alter table cohorts enable row level security;
alter table lesson_templates enable row level security;
alter table class_sessions enable row level security;
alter table teacher_cohorts enable row level security;
alter table enrollments enable row level security;
alter table attendance enable row level security;
alter table attendance_history enable row level security;
alter table public_checkin_attempts enable row level security;

-- ---------------------------------------------------------------------
-- cohorts
-- ---------------------------------------------------------------------
create policy "cohorts_select_scope" on cohorts
  for select to authenticated
  using (
    trilho_is_admin()
    or trilho_is_teacher_of_cohort(id)
    or exists (select 1 from enrollments e where e.cohort_id = cohorts.id and e.student_id = trilho_member_id())
  );

create policy "cohorts_write_admin" on cohorts
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- lesson_templates: leitura para todo autenticado (é conteúdo
-- acadêmico, não dado sensível de aluno); escrita só admin.
-- ---------------------------------------------------------------------
create policy "lesson_templates_select_all" on lesson_templates
  for select to authenticated using (true);

create policy "lesson_templates_write_admin" on lesson_templates
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- class_sessions
-- ---------------------------------------------------------------------
create policy "class_sessions_select_scope" on class_sessions
  for select to authenticated
  using (
    trilho_is_admin()
    or trilho_is_teacher_of_cohort(cohort_id)
    or exists (
      select 1 from enrollments e
      where e.cohort_id = class_sessions.cohort_id and e.student_id = trilho_member_id() and e.status = 'ACTIVE'
    )
  );

create policy "class_sessions_insert_admin" on class_sessions
  for insert to authenticated with check (trilho_is_admin());

create policy "class_sessions_update_scope" on class_sessions
  for update to authenticated
  using (trilho_is_admin() or trilho_is_teacher_of_cohort(cohort_id))
  with check (trilho_is_admin() or trilho_is_teacher_of_cohort(cohort_id));

create policy "class_sessions_delete_admin" on class_sessions
  for delete to authenticated using (trilho_is_admin());

-- ---------------------------------------------------------------------
-- teacher_cohorts
-- ---------------------------------------------------------------------
create policy "teacher_cohorts_select_all" on teacher_cohorts
  for select to authenticated using (true);

create policy "teacher_cohorts_write_admin" on teacher_cohorts
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- enrollments: escrita direta pelo cliente é bloqueada por padrão —
-- toda mudança de matrícula passa pelas funções trilho_* (matricular,
-- desistência, finalização/promoção), nunca por UPDATE solto.
-- ---------------------------------------------------------------------
create policy "enrollments_select_scope" on enrollments
  for select to authenticated
  using (
    trilho_is_admin()
    or trilho_is_teacher_of_cohort(cohort_id)
    or student_id = trilho_member_id()
  );

-- ---------------------------------------------------------------------
-- attendance / attendance_history: sem policy de insert/update para o
-- cliente — só as funções SECURITY DEFINER escrevem (inclusive o
-- check-in público, que roda com privilégio próprio).
-- ---------------------------------------------------------------------
create policy "attendance_select_scope" on attendance
  for select to authenticated
  using (
    trilho_is_admin()
    or exists (
      select 1 from class_sessions cs where cs.id = attendance.class_session_id and trilho_is_teacher_of_cohort(cs.cohort_id)
    )
    or student_id = trilho_member_id()
  );

create policy "attendance_history_select_scope" on attendance_history
  for select to authenticated
  using (
    trilho_is_admin()
    or exists (
      select 1 from attendance a
      join class_sessions cs on cs.id = a.class_session_id
      where a.id = attendance_history.attendance_id and trilho_is_teacher_of_cohort(cs.cohort_id)
    )
  );

-- ---------------------------------------------------------------------
-- public_checkin_attempts: só admin lê (auditoria de abuso); nunca
-- gravado por INSERT direto do cliente, só pelas funções públicas.
-- ---------------------------------------------------------------------
create policy "public_checkin_attempts_select_admin" on public_checkin_attempts
  for select to authenticated using (trilho_is_admin());

-- ---------------------------------------------------------------------
-- Execução das funções — authenticated (painel admin/professor)
-- ---------------------------------------------------------------------
grant execute on function trilho_is_teacher_of_cohort(uuid) to authenticated;
grant execute on function trilho_can_manage_cohort(uuid) to authenticated;
grant execute on function trilho_active_enrollment() to authenticated;
grant execute on function trilho_add_module(uuid, text, text, text) to authenticated;
grant execute on function trilho_update_lesson_template(uuid, text, text) to authenticated;
grant execute on function trilho_create_cohort(uuid, text, text, date, date, uuid) to authenticated;
grant execute on function trilho_update_cohort(uuid, text, date, date, uuid) to authenticated;
grant execute on function trilho_activate_cohort(uuid) to authenticated;
grant execute on function trilho_cancel_cohort(uuid) to authenticated;
grant execute on function trilho_regenerate_public_token(uuid) to authenticated;
grant execute on function trilho_set_public_attendance_enabled(uuid, boolean) to authenticated;
grant execute on function trilho_create_class_session(uuid, uuid, date, time, time, text) to authenticated;
grant execute on function trilho_cancel_class_session(uuid, text) to authenticated;
grant execute on function trilho_generate_ctl_calendar(uuid, boolean) to authenticated;
grant execute on function trilho_open_class_session(uuid) to authenticated;
grant execute on function trilho_close_class_session(uuid) to authenticated;
grant execute on function trilho_mark_attendance(uuid, uuid, text, text) to authenticated;
grant execute on function trilho_enroll_student(uuid, uuid) to authenticated;
grant execute on function trilho_end_enrollment(uuid, text) to authenticated;
grant execute on function trilho_mark_dropout(uuid, date, text, text) to authenticated;
grant execute on function trilho_enroll_eligible_students(uuid, uuid[]) to authenticated;
grant execute on function trilho_finalize_cohort(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Execução — anon (check-in público, sem login). Somente estas 3.
-- ---------------------------------------------------------------------
grant execute on function trilho_public_get_status(text, text) to anon;
grant execute on function trilho_public_search_students(text, text, text, text) to anon;
grant execute on function trilho_public_checkin(text, text, uuid, text, text) to anon;

grant execute on function trilho_public_get_status(text, text) to authenticated;
grant execute on function trilho_public_search_students(text, text, text, text) to authenticated;
grant execute on function trilho_public_checkin(text, text, uuid, text, text) to authenticated;
