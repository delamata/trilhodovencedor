-- =====================================================================
-- Trilho do Vencedor v2 — funções de domínio (SECURITY DEFINER)
-- =====================================================================
-- Substitui as funções trilho_* da v1 (curso-cêntricas) por versões
-- turma-cêntricas (cohort). trilho_member_id/trilho_is_admin/
-- trilho_log_audit são reaproveitadas sem mudança.
-- =====================================================================

-- trilho_active_enrollment() muda de forma de retorno (ganha
-- cohort_id) — Postgres não permite CREATE OR REPLACE mudar o
-- shape de RETURNS TABLE, então precisa dropar antes de recriar.
drop function if exists trilho_active_enrollment();

-- ---------------------------------------------------------------------
-- Escopo (professor agora é por TURMA, não por curso — seção 44)
-- ---------------------------------------------------------------------
create or replace function trilho_is_teacher_of_cohort(p_cohort_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from teacher_cohorts
    where cohort_id = p_cohort_id and teacher_id = trilho_member_id()
  );
$$;

create or replace function trilho_can_manage_cohort(p_cohort_id uuid)
returns boolean
language sql security definer stable as $$
  select trilho_is_admin() or trilho_is_teacher_of_cohort(p_cohort_id);
$$;

create or replace function trilho_active_enrollment()
returns table (enrollment_id uuid, cohort_id uuid, course_id uuid)
language sql security definer stable as $$
  select e.id, e.cohort_id, c.course_id
  from enrollments e
  join cohorts c on c.id = e.cohort_id
  where e.student_id = trilho_member_id() and e.status = 'ACTIVE'
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- Estrutura acadêmica: módulos/aulas (lesson_templates)
-- ---------------------------------------------------------------------
-- BR-004: cria as duas aulas do módulo juntas, na mesma transação —
-- é assim que garantimos "todo módulo tem exatamente 2 aulas" sem
-- depender só de disciplina no frontend.
create or replace function trilho_add_module(
  p_course_id uuid, p_lesson1_title text, p_lesson2_title text, p_description text default null
) returns table (lesson1_id uuid, lesson2_id uuid, lesson1_code text, lesson2_code text)
language plpgsql security definer as $$
declare
  v_prefix text;
  v_module integer;
  v_order integer;
  v_code1 text;
  v_code2 text;
  v_id1 uuid;
  v_id2 uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select lesson_code_prefix into v_prefix from courses where id = p_course_id;
  if v_prefix is null then
    raise exception 'CURSO_NAO_ENCONTRADO';
  end if;

  select coalesce(max(module_number), 0) + 1, coalesce(max(display_order), 0)
  into v_module, v_order
  from lesson_templates where course_id = p_course_id;

  -- BR-005/BR-006: MA{modulo}-{aula} / CT{modulo}-{aula}, sempre 2 dígitos.
  v_code1 := v_prefix || lpad(v_module::text, 2, '0') || '-01';
  v_code2 := v_prefix || lpad(v_module::text, 2, '0') || '-02';

  insert into lesson_templates (course_id, module_number, lesson_number, lesson_code, title, description, display_order)
  values (p_course_id, v_module, 1, v_code1, p_lesson1_title, p_description, v_order + 1)
  returning id into v_id1;

  insert into lesson_templates (course_id, module_number, lesson_number, lesson_code, title, description, display_order)
  values (p_course_id, v_module, 2, v_code2, p_lesson2_title, p_description, v_order + 2)
  returning id into v_id2;

  perform trilho_log_audit('CREATE_MODULE', 'course', p_course_id,
    jsonb_build_object('module_number', v_module, 'codes', jsonb_build_array(v_code1, v_code2)));

  return query select v_id1, v_id2, v_code1, v_code2;
end;
$$;

-- Só título/descrição são editáveis (seção 38: não deixar quebrar
-- fácil a sequência/código/regra de duas aulas por módulo).
create or replace function trilho_update_lesson_template(p_id uuid, p_title text, p_description text default null)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  update lesson_templates set title = p_title, description = p_description where id = p_id;
  if not found then
    raise exception 'AULA_MODELO_NAO_ENCONTRADA';
  end if;
  perform trilho_log_audit('UPDATE_LESSON_TEMPLATE', 'lesson_template', p_id, jsonb_build_object('title', p_title));
end;
$$;

-- ---------------------------------------------------------------------
-- Turmas (cohorts)
-- ---------------------------------------------------------------------
create or replace function trilho_create_cohort(
  p_course_id uuid, p_code text, p_name text, p_start_date date, p_end_date date,
  p_previous_cohort_id uuid default null
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  insert into cohorts (course_id, code, name, start_date, end_date, previous_cohort_id, status, created_by)
  values (p_course_id, p_code, p_name, p_start_date, p_end_date, p_previous_cohort_id, 'PLANNED', auth.uid())
  returning id into v_id;

  perform trilho_log_audit('CREATE_COHORT', 'cohort', v_id, jsonb_build_object('course_id', p_course_id, 'code', p_code));
  return v_id;
end;
$$;

create or replace function trilho_update_cohort(
  p_id uuid, p_name text, p_start_date date, p_end_date date, p_next_ctl_cohort_id uuid default null
) returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  update cohorts
  set name = p_name, start_date = p_start_date, end_date = p_end_date, next_ctl_cohort_id = p_next_ctl_cohort_id
  where id = p_id;
  if not found then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;
  perform trilho_log_audit('UPDATE_COHORT', 'cohort', p_id, jsonb_build_object('next_ctl_cohort_id', p_next_ctl_cohort_id));
end;
$$;

create or replace function trilho_activate_cohort(p_id uuid)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  update cohorts set status = 'ACTIVE' where id = p_id and status = 'PLANNED';
  if not found then
    raise exception 'TURMA_NAO_ENCONTRADA_OU_JA_ATIVA';
  end if;
  perform trilho_log_audit('ACTIVATE_COHORT', 'cohort', p_id, '{}'::jsonb);
end;
$$;

create or replace function trilho_cancel_cohort(p_id uuid)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  update cohorts set status = 'CANCELLED' where id = p_id and status in ('PLANNED', 'ACTIVE');
  if not found then
    raise exception 'TURMA_NAO_ENCONTRADA_OU_JA_ENCERRADA';
  end if;
  perform trilho_log_audit('CANCEL_COHORT', 'cohort', p_id, '{}'::jsonb);
end;
$$;

-- Regenera o link público (seção 20). Só o hash fica no banco — o
-- token em texto puro só existe neste retorno, uma vez.
create or replace function trilho_regenerate_public_token(p_cohort_id uuid)
returns table (token text)
language plpgsql security definer as $$
declare
  v_token text;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  update cohorts
  set public_attendance_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
      public_attendance_token_created_at = now(),
      public_attendance_enabled = true
  where id = p_cohort_id;

  if not found then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;

  perform trilho_log_audit('REGENERATE_PUBLIC_TOKEN', 'cohort', p_cohort_id, '{}'::jsonb);
  return query select v_token;
end;
$$;

create or replace function trilho_set_public_attendance_enabled(p_cohort_id uuid, p_enabled boolean)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  update cohorts set public_attendance_enabled = p_enabled where id = p_cohort_id;
  if not found then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;
  perform trilho_log_audit('SET_PUBLIC_ATTENDANCE_ENABLED', 'cohort', p_cohort_id, jsonb_build_object('enabled', p_enabled));
end;
$$;

-- ---------------------------------------------------------------------
-- class_sessions ("Aula")
-- ---------------------------------------------------------------------
create or replace function trilho_create_class_session(
  p_cohort_id uuid, p_lesson_template_id uuid, p_class_date date, p_start_time time, p_end_time time,
  p_notes text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  insert into class_sessions (cohort_id, lesson_template_id, class_date, start_time, end_time, notes, created_by)
  values (p_cohort_id, p_lesson_template_id, p_class_date, p_start_time, p_end_time, p_notes, auth.uid())
  returning id into v_id;

  perform trilho_log_audit('CREATE_CLASS_SESSION', 'class_session', v_id, jsonb_build_object('cohort_id', p_cohort_id));
  return v_id;
end;
$$;

create or replace function trilho_cancel_class_session(p_class_session_id uuid, p_reason text default null)
returns void
language plpgsql security definer as $$
declare
  v_status text;
begin
  select status into v_status from class_sessions where id = p_class_session_id for update;
  if v_status is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if v_status = 'ATTENDANCE_OPEN' then
    raise exception 'ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR';
  end if;

  update class_sessions set status = 'CANCELLED', notes = coalesce(p_reason, notes) where id = p_class_session_id;
  perform trilho_log_audit('CANCEL_CLASS_SESSION', 'class_session', p_class_session_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- BR-007: CTL só nas terças que também têm aula de Maturidade.
-- p_commit=false só retorna a prévia (seção 9, item 8: "permitir
-- revisão antes de salvar"), sem gravar nada; p_commit=true grava.
-- Mesma função nos dois casos para nunca a lógica de matching divergir
-- entre "o que eu mostro" e "o que eu gravo".
create or replace function trilho_generate_ctl_calendar(p_ctl_cohort_id uuid, p_commit boolean default false)
returns table (
  class_date date, start_time time, end_time time,
  lesson_code text, lesson_title text, already_exists boolean
)
language plpgsql security definer as $$
declare
  v_ctl_course_id uuid;
  v_source_cohort_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select course_id into v_ctl_course_id from cohorts where id = p_ctl_cohort_id;
  if v_ctl_course_id is null then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;

  select id into v_source_cohort_id from cohorts where next_ctl_cohort_id = p_ctl_cohort_id;
  if v_source_cohort_id is null then
    raise exception 'TURMA_MATURIDADE_RELACIONADA_NAO_ENCONTRADA';
  end if;

  -- Pareia, POR POSIÇÃO, as terças do Maturidade (em ordem de data) com
  -- os lesson_templates do CTL (em ordem de módulo/aula): a 1ª terça
  -- recebe CT01-01, a 2ª CT01-02, etc. Determinístico — rodar de novo
  -- sempre encontra a mesma associação, o que é o que faz
  -- already_exists funcionar como conferência de idempotência.
  create temporary table _ctl_calendar_preview on commit drop as
  select
    tuesdays.class_date, tuesdays.start_time, tuesdays.end_time,
    lessons.id as lesson_id, lessons.lesson_code, lessons.title as lesson_title,
    exists (
      select 1 from class_sessions cs2
      where cs2.cohort_id = p_ctl_cohort_id and cs2.lesson_template_id = lessons.id
    ) as already_exists
  from (
    select row_number() over (order by cs.class_date) as rn, cs.class_date, cs.start_time, cs.end_time
    from class_sessions cs
    where cs.cohort_id = v_source_cohort_id
      and cs.status <> 'CANCELLED'
      -- 0=domingo ... 2=terça-feira. Nunca comparar nome do dia como
      -- string (seção 53) — sempre extract(dow from data).
      and extract(dow from cs.class_date) = 2
  ) tuesdays
  join (
    select row_number() over (order by lt.module_number, lt.lesson_number) as rn,
      lt.id, lt.lesson_code, lt.title
    from lesson_templates lt
    where lt.course_id = v_ctl_course_id and lt.active
  ) lessons on lessons.rn = tuesdays.rn;

  if p_commit then
    insert into class_sessions (cohort_id, lesson_template_id, class_date, start_time, end_time, created_by)
    select p_ctl_cohort_id, p.lesson_id, p.class_date, p.start_time, p.end_time, auth.uid()
    from _ctl_calendar_preview p
    where not p.already_exists;

    perform trilho_log_audit('GENERATE_CTL_CALENDAR', 'cohort', p_ctl_cohort_id,
      jsonb_build_object('source_cohort_id', v_source_cohort_id));
  end if;

  return query
    select p.class_date, p.start_time, p.end_time, p.lesson_code, p.lesson_title, p.already_exists
    from _ctl_calendar_preview p
    order by p.class_date;
end;
$$;

-- ---------------------------------------------------------------------
-- Chamada (abrir/fechar) — sem token por aula: quem dá acesso é o link
-- permanente da turma (cohorts.public_attendance_token_hash).
-- ---------------------------------------------------------------------
create or replace function trilho_open_class_session(p_class_session_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_status text;
begin
  select cohort_id, status into v_cohort_id, v_status from class_sessions where id = p_class_session_id for update;
  if v_cohort_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;
  if not trilho_can_manage_cohort(v_cohort_id) then
    raise exception 'SEM_PERMISSAO';
  end if;
  if v_status = 'CANCELLED' then
    raise exception 'AULA_CANCELADA';
  end if;
  if v_status = 'COMPLETED' then
    raise exception 'AULA_JA_FINALIZADA';
  end if;

  -- seção 27: no máximo uma chamada aberta por TURMA (o índice único
  -- parcial class_sessions_one_open_per_cohort é quem garante isso de
  -- verdade; esta checagem só dá a mensagem amigável antes de tentar).
  if exists (select 1 from class_sessions where cohort_id = v_cohort_id and status = 'ATTENDANCE_OPEN') then
    raise exception 'CHAMADA_JA_ABERTA';
  end if;

  update class_sessions set status = 'ATTENDANCE_OPEN', attendance_opened_at = now() where id = p_class_session_id;
  perform trilho_log_audit('OPEN_ATTENDANCE', 'class_session', p_class_session_id, '{}'::jsonb);
end;
$$;

create or replace function trilho_close_class_session(p_class_session_id uuid)
returns table (marked_present integer, marked_absent integer)
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_present integer;
  v_absent integer;
begin
  select cohort_id into v_cohort_id from class_sessions where id = p_class_session_id for update;
  if v_cohort_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;
  if not trilho_can_manage_cohort(v_cohort_id) then
    raise exception 'SEM_PERMISSAO';
  end if;
  if not exists (select 1 from class_sessions where id = p_class_session_id and status = 'ATTENDANCE_OPEN') then
    raise exception 'CHAMADA_NAO_ABERTA';
  end if;

  insert into attendance (class_session_id, student_id, status, source, created_by)
  select p_class_session_id, e.student_id, 'FALTA', 'SYSTEM', auth.uid()
  from enrollments e
  where e.cohort_id = v_cohort_id
    and e.status = 'ACTIVE'
    and not exists (
      select 1 from attendance a where a.class_session_id = p_class_session_id and a.student_id = e.student_id
    );

  get diagnostics v_absent = row_count;

  select count(*) into v_present from attendance where class_session_id = p_class_session_id and status = 'PRESENTE';

  update class_sessions set status = 'COMPLETED', attendance_closed_at = now() where id = p_class_session_id;

  perform trilho_log_audit('CLOSE_ATTENDANCE', 'class_session', p_class_session_id,
    jsonb_build_object('marked_present', v_present, 'marked_absent', v_absent));

  return query select v_present, v_absent;
end;
$$;

create or replace function trilho_mark_attendance(
  p_class_session_id uuid, p_student_id uuid, p_status text, p_reason text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_existing record;
  v_id uuid;
  v_source text;
begin
  if p_status not in ('PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select cohort_id into v_cohort_id from class_sessions where id = p_class_session_id;
  if v_cohort_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;
  if not trilho_can_manage_cohort(v_cohort_id) then
    raise exception 'SEM_PERMISSAO';
  end if;

  if not exists (
    select 1 from enrollments where student_id = p_student_id and cohort_id = v_cohort_id and status = 'ACTIVE'
  ) then
    raise exception 'ALUNO_SEM_MATRICULA_NA_TURMA';
  end if;

  v_source := case when trilho_is_admin() then 'ADMIN' else 'TEACHER' end;

  select * into v_existing from attendance where class_session_id = p_class_session_id and student_id = p_student_id for update;

  if v_existing.id is null then
    insert into attendance (class_session_id, student_id, status, source, checked_in_at, created_by, notes)
    values (p_class_session_id, p_student_id, p_status, v_source,
      case when p_status = 'PRESENTE' then now() else null end, auth.uid(), p_reason)
    returning id into v_id;

    perform trilho_log_audit('MARK_ATTENDANCE', 'attendance', v_id,
      jsonb_build_object('class_session_id', p_class_session_id, 'student_id', p_student_id, 'status', p_status));
  else
    v_id := v_existing.id;
    if v_existing.status <> p_status then
      insert into attendance_history (attendance_id, old_status, new_status, changed_by, reason)
      values (v_existing.id, v_existing.status, p_status, auth.uid(), p_reason);

      update attendance set status = p_status, notes = coalesce(p_reason, notes) where id = v_existing.id;

      perform trilho_log_audit('UPDATE_ATTENDANCE_STATUS', 'attendance', v_id,
        jsonb_build_object('old_status', v_existing.status, 'new_status', p_status, 'reason', p_reason));
    end if;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Matrícula
-- ---------------------------------------------------------------------
create or replace function trilho_enroll_student(p_student_id uuid, p_cohort_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if exists (select 1 from enrollments where student_id = p_student_id and status = 'ACTIVE') then
    raise exception 'ALUNO_JA_POSSUI_MATRICULA_ATIVA';
  end if;

  insert into enrollments (student_id, cohort_id, status, created_by)
  values (p_student_id, p_cohort_id, 'ACTIVE', auth.uid())
  returning id into v_id;

  perform trilho_log_audit('ENROLL', 'enrollment', v_id, jsonb_build_object('student_id', p_student_id, 'cohort_id', p_cohort_id));
  return v_id;
end;
$$;

create or replace function trilho_end_enrollment(p_enrollment_id uuid, p_status text)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if p_status <> 'CANCELLED' then
    raise exception 'STATUS_INVALIDO';
  end if;

  update enrollments set status = p_status where id = p_enrollment_id and status = 'ACTIVE';
  if not found then
    raise exception 'MATRICULA_NAO_ENCONTRADA_OU_JA_ENCERRADA';
  end if;

  perform trilho_log_audit('END_ENROLLMENT', 'enrollment', p_enrollment_id, jsonb_build_object('reason', p_status));
end;
$$;

-- BR-011/BR-012: desistente não recebe mais falta e não é promovido.
create or replace function trilho_mark_dropout(
  p_enrollment_id uuid, p_dropped_out_at date, p_reason text default null, p_notes text default null
) returns void
language plpgsql security definer as $$
declare
  v_status text;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select status into v_status from enrollments where id = p_enrollment_id for update;
  if v_status is null then
    raise exception 'MATRICULA_NAO_ENCONTRADA';
  end if;
  if v_status <> 'ACTIVE' then
    raise exception 'MATRICULA_NAO_ESTA_ATIVA';
  end if;

  update enrollments
  set status = 'DROPPED_OUT', dropped_out_at = p_dropped_out_at, dropout_reason = p_reason, dropout_notes = p_notes
  where id = p_enrollment_id;

  perform trilho_log_audit('MARK_DROPOUT', 'enrollment', p_enrollment_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- Seção 17: matricula em lote quem está na fila de elegíveis (aprovados
-- no Maturidade sem turma CTL na época da finalização).
create or replace function trilho_enroll_eligible_students(p_ctl_cohort_id uuid, p_student_ids uuid[])
returns integer
language plpgsql security definer as $$
declare
  v_count integer := 0;
  v_student_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  foreach v_student_id in array p_student_ids loop
    if not exists (select 1 from enrollments where student_id = v_student_id and status = 'ACTIVE') then
      insert into enrollments (student_id, cohort_id, status, created_by)
      values (v_student_id, p_ctl_cohort_id, 'ACTIVE', auth.uid());
      v_count := v_count + 1;
      perform trilho_log_audit('ENROLL_ELIGIBLE_CTL', 'enrollment', v_student_id,
        jsonb_build_object('ctl_cohort_id', p_ctl_cohort_id));
    end if;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Finalização da turma: aprova/reprova todo mundo e promove os
-- aprovados de Maturidade pra next_ctl_cohort_id (seção 13-16).
-- ---------------------------------------------------------------------
create or replace function trilho_finalize_cohort(p_cohort_id uuid)
returns table (approved_count integer, not_approved_count integer, dropped_out_count integer, promoted_count integer)
language plpgsql security definer as $$
declare
  v_course_id uuid;
  v_status text;
  v_next_ctl_cohort_id uuid;
  v_max_absences integer;
  v_justified_counts boolean;
  v_rec record;
  v_counted_absences integer;
  v_approved integer := 0;
  v_not_approved integer := 0;
  v_dropped integer := 0;
  v_promoted integer := 0;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select course_id, status, next_ctl_cohort_id into v_course_id, v_status, v_next_ctl_cohort_id
  from cohorts where id = p_cohort_id for update;

  if v_course_id is null then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;
  if v_status = 'FINISHED' then
    raise exception 'TURMA_JA_FINALIZADA';
  end if;

  select max_absences, justified_absence_counts_towards_limit into v_max_absences, v_justified_counts
  from courses where id = v_course_id;

  for v_rec in
    select e.id as enrollment_id, e.student_id
    from enrollments e
    where e.cohort_id = p_cohort_id and e.status = 'ACTIVE'
  loop
    select
      count(a.id) filter (where a.status = 'FALTA')
      + case when v_justified_counts then count(a.id) filter (where a.status = 'FALTA_JUSTIFICADA') else 0 end
    into v_counted_absences
    from class_sessions cs
    left join attendance a on a.class_session_id = cs.id and a.student_id = v_rec.student_id
    where cs.cohort_id = p_cohort_id and cs.status <> 'CANCELLED';

    if v_counted_absences <= v_max_absences then
      update enrollments
      set status = 'COMPLETED', academic_result = 'APPROVED', completed_at = (now() at time zone 'America/Sao_Paulo')::date
      where id = v_rec.enrollment_id;
      v_approved := v_approved + 1;

      -- BR-009: aprovado é elegível automaticamente; só cria a
      -- matrícula no CTL se já existir turma relacionada definida.
      if v_next_ctl_cohort_id is not null
        and not exists (select 1 from enrollments where student_id = v_rec.student_id and status = 'ACTIVE')
      then
        insert into enrollments (student_id, cohort_id, status, created_by)
        values (v_rec.student_id, v_next_ctl_cohort_id, 'ACTIVE', auth.uid());
        v_promoted := v_promoted + 1;
        perform trilho_log_audit('AUTO_PROMOTE_CTL', 'enrollment', v_rec.enrollment_id,
          jsonb_build_object('student_id', v_rec.student_id, 'ctl_cohort_id', v_next_ctl_cohort_id));
      end if;
    else
      update enrollments
      set status = 'COMPLETED', academic_result = 'NOT_APPROVED', completed_at = (now() at time zone 'America/Sao_Paulo')::date
      where id = v_rec.enrollment_id;
      v_not_approved := v_not_approved + 1;
    end if;
  end loop;

  select count(*) into v_dropped from enrollments where cohort_id = p_cohort_id and status = 'DROPPED_OUT';

  update cohorts set status = 'FINISHED' where id = p_cohort_id;

  perform trilho_log_audit('FINALIZE_COHORT', 'cohort', p_cohort_id,
    jsonb_build_object('approved', v_approved, 'not_approved', v_not_approved, 'dropped_out', v_dropped, 'promoted', v_promoted));

  return query select v_approved, v_not_approved, v_dropped, v_promoted;
end;
$$;

-- ---------------------------------------------------------------------
-- Check-in PÚBLICO (sem login — seção 19-28). Chamadas via role
-- "anon". Nunca revelar SE foi o nome ou o telefone que não bateu —
-- sempre o mesmo erro genérico (seção 25).
-- ---------------------------------------------------------------------
create or replace function trilho_public_get_status(p_cohort_code text, p_token text)
returns table (
  cohort_id uuid, course_name text, cohort_name text, has_open_session boolean,
  class_session_id uuid, lesson_code text, lesson_title text, class_date date, start_time time,
  next_class_date date
)
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_enabled boolean;
  v_hash text;
  v_course_name text;
  v_cohort_name text;
  v_open record;
  v_next_date date;
begin
  select c.id, c.public_attendance_enabled, c.public_attendance_token_hash, co.name, c.name
  into v_cohort_id, v_enabled, v_hash, v_course_name, v_cohort_name
  from cohorts c join courses co on co.id = c.course_id
  where c.code = p_cohort_code;

  if v_cohort_id is null or not coalesce(v_enabled, false) or v_hash is null
    or v_hash <> encode(digest(p_token, 'sha256'), 'hex')
  then
    raise exception 'LINK_INVALIDO';
  end if;

  select cs.id, lt.lesson_code, lt.title, cs.class_date, cs.start_time
  into v_open
  from class_sessions cs
  join lesson_templates lt on lt.id = cs.lesson_template_id
  where cs.cohort_id = v_cohort_id and cs.status = 'ATTENDANCE_OPEN'
  limit 1;

  if v_open.id is null then
    select min(cs.class_date) into v_next_date
    from class_sessions cs
    where cs.cohort_id = v_cohort_id and cs.status = 'SCHEDULED'
      and cs.class_date >= (now() at time zone 'America/Sao_Paulo')::date;
  end if;

  return query
    select v_cohort_id, v_course_name, v_cohort_name, (v_open.id is not null),
      v_open.id, v_open.lesson_code, v_open.title, v_open.class_date, v_open.start_time, v_next_date;
end;
$$;

-- Busca por nome (passo 1 da identificação leve — seção 22). Só entre
-- alunos com matrícula ATIVA NESTA turma; nunca devolve telefone.
create or replace function trilho_public_search_students(
  p_cohort_code text, p_token text, p_name_query text, p_ip text default null
) returns table (student_id uuid, display_name text)
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_enabled boolean;
  v_hash text;
  v_ip_hash text;
begin
  select c.id, c.public_attendance_enabled, c.public_attendance_token_hash
  into v_cohort_id, v_enabled, v_hash
  from cohorts c where c.code = p_cohort_code;

  if v_cohort_id is null or not coalesce(v_enabled, false) or v_hash is null
    or v_hash <> encode(digest(p_token, 'sha256'), 'hex')
  then
    raise exception 'LINK_INVALIDO';
  end if;

  if length(trim(coalesce(p_name_query, ''))) < 3 then
    raise exception 'NOME_MUITO_CURTO';
  end if;

  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_checkin_attempts
    where cohort_id = v_cohort_id and ip_hash = v_ip_hash and kind = 'SEARCH' and created_at > now() - interval '5 minutes'
  ) >= 30 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_checkin_attempts (cohort_id, ip_hash, kind) values (v_cohort_id, v_ip_hash, 'SEARCH');

  return query
    select m.id, m.nome
    from members m
    join enrollments e on e.student_id = m.id
    where e.cohort_id = v_cohort_id
      and e.status = 'ACTIVE'
      and m.nome ilike '%' || trim(p_name_query) || '%'
    order by m.nome
    limit 6;
end;
$$;

-- Passo 2: confirma com os 4 últimos dígitos do telefone e registra a
-- presença, tudo na mesma transação. Cobre as 13 validações da seção
-- 24.
create or replace function trilho_public_checkin(
  p_cohort_code text, p_token text, p_student_id uuid, p_phone_suffix text, p_ip text default null
) returns table (
  class_session_id uuid, course_name text, cohort_name text, lesson_code text, lesson_title text, class_date date,
  presences integer, absences integer, justified_absences integer, max_absences integer,
  absences_remaining integer, attendance_pct numeric
)
language plpgsql security definer as $$
declare
  v_cohort_id uuid;
  v_enabled boolean;
  v_hash text;
  v_course_name text;
  v_cohort_name text;
  v_max_absences integer;
  v_justified_counts boolean;
  v_ip_hash text;
  v_member record;
  v_enrollment record;
  v_open record;
  v_presences integer;
  v_absences integer;
  v_justified integer;
begin
  -- 1/2. link/token válidos e habilitados
  select c.id, c.public_attendance_enabled, c.public_attendance_token_hash, co.name, c.name, co.max_absences, co.justified_absence_counts_towards_limit
  into v_cohort_id, v_enabled, v_hash, v_course_name, v_cohort_name, v_max_absences, v_justified_counts
  from cohorts c join courses co on co.id = c.course_id
  where c.code = p_cohort_code;

  if v_cohort_id is null or not coalesce(v_enabled, false) or v_hash is null
    or v_hash <> encode(digest(p_token, 'sha256'), 'hex')
  then
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;

  -- rate limit (seção 25)
  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_checkin_attempts
    where cohort_id = v_cohort_id and ip_hash = v_ip_hash and kind = 'CHECKIN' and created_at > now() - interval '5 minutes'
  ) >= 15 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_checkin_attempts (cohort_id, ip_hash, kind) values (v_cohort_id, v_ip_hash, 'CHECKIN');

  -- 3. aula pertence à turma / 7. aluno identificado existe
  select id, nome, tel into v_member from members where id = p_student_id;
  if v_member.id is null then
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;

  if v_member.tel is null or right(regexp_replace(v_member.tel, '\D', '', 'g'), 4) <> trim(p_phone_suffix) then
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;

  -- 8/9. matrícula ativa e pertence exatamente a esta turma
  select id, status into v_enrollment from enrollments where student_id = p_student_id and cohort_id = v_cohort_id;
  if v_enrollment.id is null or v_enrollment.status <> 'ACTIVE' then
    -- cobre também "10. aluno não é desistente" (desistente não tem status ACTIVE)
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;

  -- 4. turma ativa
  if not exists (select 1 from cohorts where id = v_cohort_id and status = 'ACTIVE') then
    raise exception 'TURMA_NAO_ESTA_ATIVA';
  end if;

  -- 5/6/12/13. chamada aberta, aula não cancelada, não expirada (não há expiração própria — a chamada é o próprio status)
  select cs.id, lt.lesson_code, lt.title, cs.class_date
  into v_open
  from class_sessions cs
  join lesson_templates lt on lt.id = cs.lesson_template_id
  where cs.cohort_id = v_cohort_id and cs.status = 'ATTENDANCE_OPEN'
  limit 1;

  if v_open.id is null then
    raise exception 'CHAMADA_NAO_ABERTA';
  end if;

  -- 11. presença duplicada
  if exists (select 1 from attendance where class_session_id = v_open.id and student_id = p_student_id) then
    raise exception 'PRESENCA_JA_REGISTRADA';
  end if;

  insert into attendance (class_session_id, student_id, status, source, checked_in_at, created_by)
  values (v_open.id, p_student_id, 'PRESENTE', 'PUBLIC_CHECKIN', now(), null);

  perform trilho_log_audit('PUBLIC_CHECKIN', 'attendance', v_open.id, jsonb_build_object('student_id', p_student_id));

  -- seção 29: recalcula com base só em aulas realizadas/não canceladas até hoje
  select
    count(a.id) filter (where a.status = 'PRESENTE'),
    count(a.id) filter (where a.status = 'FALTA'),
    count(a.id) filter (where a.status = 'FALTA_JUSTIFICADA')
  into v_presences, v_absences, v_justified
  from class_sessions cs
  left join attendance a on a.class_session_id = cs.id and a.student_id = p_student_id
  where cs.cohort_id = v_cohort_id and cs.status <> 'CANCELLED'
    and cs.class_date <= (now() at time zone 'America/Sao_Paulo')::date;

  return query select
    v_open.id, v_course_name, v_cohort_name, v_open.lesson_code, v_open.title, v_open.class_date,
    v_presences, v_absences, v_justified, v_max_absences,
    (v_max_absences - (v_absences + case when v_justified_counts then v_justified else 0 end))::integer,
    case when (v_presences + v_absences + v_justified) > 0
      then round(v_presences::numeric / (v_presences + v_absences + v_justified) * 100, 1)
      else 0::numeric
    end;
end;
$$;
