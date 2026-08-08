-- =====================================================================
-- Trilho do Vencedor — Row Level Security
-- =====================================================================
-- Nunca confiar em IDs enviados pelo frontend: o "aluno" é sempre
-- resolvido a partir de auth.uid() -> profiles.member_id
-- (trilho_member_id()), nunca de um campo enviado pelo cliente.
--
-- Escrita de attendance/attendance_sessions/audit_logs pelo cliente é
-- BLOQUEADA por RLS de propósito — essas tabelas só são alteradas
-- pelas funções SECURITY DEFINER (que rodam com privilégio próprio e
-- fazem as validações de negócio antes de escrever). Isso impede que
-- alguém chame supabase.from('attendance').insert(...) diretamente
-- para forjar uma presença.
-- =====================================================================

alter table courses enable row level security;
alter table enrollments enable row level security;
alter table teacher_courses enable row level security;
alter table classes enable row level security;
alter table attendance_sessions enable row level security;
alter table attendance enable row level security;
alter table attendance_history enable row level security;
alter table audit_logs enable row level security;

-- ---------------------------------------------------------------------
-- courses: todo autenticado lê; só admin escreve.
-- ---------------------------------------------------------------------
drop policy if exists "courses_select_all" on courses;
create policy "courses_select_all" on courses
  for select to authenticated using (true);

drop policy if exists "courses_write_admin" on courses;
create policy "courses_write_admin" on courses
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- enrollments: admin vê tudo; professor vê as do(s) seu(s) curso(s);
-- aluno vê só a própria. Escrita direta (fora das funções RPC) só
-- admin — matrícula é operação administrativa.
-- ---------------------------------------------------------------------
drop policy if exists "enrollments_select_scope" on enrollments;
create policy "enrollments_select_scope" on enrollments
  for select to authenticated
  using (
    trilho_is_admin()
    or trilho_is_teacher_of(course_id)
    or student_id = trilho_member_id()
  );

drop policy if exists "enrollments_write_admin" on enrollments;
create policy "enrollments_write_admin" on enrollments
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- teacher_courses: todo autenticado lê (para saber quem leciona o quê);
-- só admin escreve.
-- ---------------------------------------------------------------------
drop policy if exists "teacher_courses_select_all" on teacher_courses;
create policy "teacher_courses_select_all" on teacher_courses
  for select to authenticated using (true);

drop policy if exists "teacher_courses_write_admin" on teacher_courses;
create policy "teacher_courses_write_admin" on teacher_courses
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

-- ---------------------------------------------------------------------
-- classes: admin vê tudo; professor vê as do seu curso; aluno vê as do
-- curso da própria matrícula ativa. Escrita direta só admin (criação/
-- cancelamento passam pelas funções RPC); status também pode ser
-- alterado por professor do curso (abrir/fechar chamada passa pela
-- função RPC, que já confere isso — a policy aqui é defesa adicional).
-- ---------------------------------------------------------------------
drop policy if exists "classes_select_scope" on classes;
create policy "classes_select_scope" on classes
  for select to authenticated
  using (
    trilho_is_admin()
    or trilho_is_teacher_of(course_id)
    or exists (
      select 1 from enrollments e
      where e.course_id = classes.course_id
        and e.student_id = trilho_member_id()
        and e.status = 'ACTIVE'
    )
  );

drop policy if exists "classes_insert_admin" on classes;
create policy "classes_insert_admin" on classes
  for insert to authenticated
  with check (trilho_is_admin());

drop policy if exists "classes_update_scope" on classes;
create policy "classes_update_scope" on classes
  for update to authenticated
  using (trilho_is_admin() or trilho_is_teacher_of(course_id))
  with check (trilho_is_admin() or trilho_is_teacher_of(course_id));

drop policy if exists "classes_delete_admin" on classes;
create policy "classes_delete_admin" on classes
  for delete to authenticated
  using (trilho_is_admin());

-- ---------------------------------------------------------------------
-- attendance_sessions: só admin/professor do curso enxergam (contém os
-- hashes do código/token). Aluno nunca lê esta tabela diretamente —
-- ele só interage via a função trilho_checkin_attendance(). Escrita
-- bloqueada por RLS (só as funções RPC escrevem).
-- ---------------------------------------------------------------------
drop policy if exists "attendance_sessions_select_scope" on attendance_sessions;
create policy "attendance_sessions_select_scope" on attendance_sessions
  for select to authenticated
  using (
    trilho_is_admin()
    or exists (
      select 1 from classes c
      where c.id = attendance_sessions.class_id and trilho_is_teacher_of(c.course_id)
    )
  );

-- Nenhuma policy de insert/update/delete: bloqueado por padrão para o
-- cliente. Só as funções SECURITY DEFINER escrevem nesta tabela.

-- ---------------------------------------------------------------------
-- attendance: admin vê tudo; professor vê as do seu curso; aluno vê só
-- as próprias. Escrita direta pelo cliente é BLOQUEADA — check-in
-- passa por trilho_checkin_attendance(), correções por
-- trilho_mark_attendance(), fechamento em massa por
-- trilho_close_attendance_session(). Isso é o que garante que um aluno
-- nunca consiga forjar presença em outro curso manipulando a URL.
-- ---------------------------------------------------------------------
drop policy if exists "attendance_select_scope" on attendance;
create policy "attendance_select_scope" on attendance
  for select to authenticated
  using (
    trilho_is_admin()
    or exists (
      select 1 from classes c
      where c.id = attendance.class_id and trilho_is_teacher_of(c.course_id)
    )
    or student_id = trilho_member_id()
  );

-- ---------------------------------------------------------------------
-- attendance_history: leitura para admin/professor do curso da
-- respectiva aula. Escrita bloqueada (só via função RPC).
-- ---------------------------------------------------------------------
drop policy if exists "attendance_history_select_scope" on attendance_history;
create policy "attendance_history_select_scope" on attendance_history
  for select to authenticated
  using (
    trilho_is_admin()
    or exists (
      select 1 from attendance a
      join classes c on c.id = a.class_id
      where a.id = attendance_history.attendance_id and trilho_is_teacher_of(c.course_id)
    )
  );

-- ---------------------------------------------------------------------
-- audit_logs: só admin lê. Escrita bloqueada (só via trilho_log_audit()).
-- ---------------------------------------------------------------------
drop policy if exists "audit_logs_select_admin" on audit_logs;
create policy "audit_logs_select_admin" on audit_logs
  for select to authenticated
  using (trilho_is_admin());

-- ---------------------------------------------------------------------
-- Permissões de execução das funções RPC para o papel "authenticated"
-- ---------------------------------------------------------------------
grant execute on function trilho_member_id() to authenticated;
grant execute on function trilho_is_admin() to authenticated;
grant execute on function trilho_is_teacher_of(uuid) to authenticated;
grant execute on function trilho_can_manage_course(uuid) to authenticated;
grant execute on function trilho_active_enrollment() to authenticated;
grant execute on function trilho_enroll_student(uuid, uuid) to authenticated;
grant execute on function trilho_change_enrollment(uuid, uuid, text) to authenticated;
grant execute on function trilho_end_enrollment(uuid, text) to authenticated;
grant execute on function trilho_create_class(uuid, integer, text, date, time, time, text, boolean, integer, text, time, time) to authenticated;
grant execute on function trilho_generate_ctl_from_class(uuid, integer, text, time, time) to authenticated;
grant execute on function trilho_cancel_class(uuid, text) to authenticated;
grant execute on function trilho_open_attendance_session(uuid, integer) to authenticated;
grant execute on function trilho_close_attendance_session(uuid) to authenticated;
grant execute on function trilho_checkin_attendance(text) to authenticated;
grant execute on function trilho_mark_attendance(uuid, uuid, text, text) to authenticated;

grant select on trilho_student_summary to authenticated;
