-- =====================================================================
-- Trilho do Vencedor — Funções de domínio (SECURITY DEFINER)
-- =====================================================================
-- Todas as regras críticas (matrícula única ativa, presença só na aula
-- certa, chamada aberta, sem duplicidade, etc.) são impostas AQUI, no
-- banco, dentro de transações — não só no frontend/backend Next.js.
-- As rotas do Next.js chamam estas funções via supabase.rpc(); nunca
-- fazem INSERT/UPDATE direto nas tabelas sensíveis (isso é bloqueado
-- pelo RLS em 20260807120400_trilho_rls.sql).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Identidade / papel do usuário logado
-- ---------------------------------------------------------------------
create or replace function trilho_member_id()
returns uuid
language sql security definer stable as $$
  select member_id from profiles where user_id = auth.uid();
$$;

create or replace function trilho_is_admin()
returns boolean
language sql security definer stable as $$
  select coalesce((select is_admin from profiles where user_id = auth.uid()), false);
$$;

create or replace function trilho_is_teacher_of(p_course_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from teacher_courses
    where course_id = p_course_id and teacher_id = trilho_member_id()
  );
$$;

create or replace function trilho_can_manage_course(p_course_id uuid)
returns boolean
language sql security definer stable as $$
  select trilho_is_admin() or trilho_is_teacher_of(p_course_id);
$$;

create or replace function trilho_active_enrollment()
returns table (enrollment_id uuid, course_id uuid)
language sql security definer stable as $$
  select id, course_id from enrollments
  where student_id = trilho_member_id() and status = 'ACTIVE'
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------
create or replace function trilho_log_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer as $$
begin
  insert into audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------
-- Matrícula
-- ---------------------------------------------------------------------
create or replace function trilho_enroll_student(p_student_id uuid, p_course_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_enrollment_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  if exists (select 1 from enrollments where student_id = p_student_id and status = 'ACTIVE') then
    raise exception 'ALUNO_JA_POSSUI_MATRICULA_ATIVA';
  end if;

  insert into enrollments (student_id, course_id, status, created_by)
  values (p_student_id, p_course_id, 'ACTIVE', auth.uid())
  returning id into v_enrollment_id;

  perform trilho_log_audit('ENROLL', 'enrollment', v_enrollment_id,
    jsonb_build_object('student_id', p_student_id, 'course_id', p_course_id));

  return v_enrollment_id;
end;
$$;

-- Encerra a matrícula ativa atual (se houver) e cria uma nova. Usado
-- para trocar o aluno de curso ou para reabrir matrícula. A troca é
-- atômica: nunca existe um instante com duas matrículas ACTIVE.
create or replace function trilho_change_enrollment(
  p_student_id uuid, p_new_course_id uuid, p_end_status text default 'TRANSFERRED'
) returns uuid
language plpgsql security definer as $$
declare
  v_old record;
  v_new_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  if p_end_status not in ('COMPLETED', 'CANCELLED', 'TRANSFERRED') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select * into v_old from enrollments
  where student_id = p_student_id and status = 'ACTIVE'
  for update;

  if v_old.id is not null then
    update enrollments
    set status = p_end_status, ended_at = (now() at time zone 'America/Sao_Paulo')::date
    where id = v_old.id;

    perform trilho_log_audit('END_ENROLLMENT', 'enrollment', v_old.id,
      jsonb_build_object('reason', p_end_status));
  end if;

  insert into enrollments (student_id, course_id, status, created_by)
  values (p_student_id, p_new_course_id, 'ACTIVE', auth.uid())
  returning id into v_new_id;

  perform trilho_log_audit('ENROLL', 'enrollment', v_new_id,
    jsonb_build_object('student_id', p_student_id, 'course_id', p_new_course_id));

  return v_new_id;
end;
$$;

create or replace function trilho_end_enrollment(p_enrollment_id uuid, p_status text)
returns void
language plpgsql security definer as $$
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  if p_status not in ('COMPLETED', 'CANCELLED', 'TRANSFERRED') then
    raise exception 'STATUS_INVALIDO';
  end if;

  update enrollments
  set status = p_status, ended_at = (now() at time zone 'America/Sao_Paulo')::date
  where id = p_enrollment_id and status = 'ACTIVE';

  if not found then
    raise exception 'MATRICULA_NAO_ENCONTRADA_OU_JA_ENCERRADA';
  end if;

  perform trilho_log_audit('END_ENROLLMENT', 'enrollment', p_enrollment_id,
    jsonb_build_object('reason', p_status));
end;
$$;

-- ---------------------------------------------------------------------
-- Calendário — criação de aula, com geração automática opcional da
-- aula correspondente de CTL quando a data cai numa terça-feira.
-- ---------------------------------------------------------------------
create or replace function trilho_generate_ctl_from_class(
  p_maturidade_class_id uuid,
  p_ctl_class_number integer default null,
  p_ctl_title text default null,
  p_ctl_start_time time default null,
  p_ctl_end_time time default null
) returns uuid
language plpgsql security definer as $$
declare
  v_mat record;
  v_ctl_course_id uuid;
  v_new_id uuid;
  v_next_number integer;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select * into v_mat from classes where id = p_maturidade_class_id;
  if v_mat.id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;

  -- 0 = domingo ... 2 = terça-feira
  if extract(dow from v_mat.class_date) <> 2 then
    raise exception 'CTL_SOMENTE_EM_TERCA';
  end if;

  if exists (select 1 from classes where generated_from_class_id = p_maturidade_class_id) then
    raise exception 'CTL_JA_GERADO_PARA_ESTA_AULA';
  end if;

  select id into v_ctl_course_id from courses where code = 'CTL';
  if v_ctl_course_id is null then
    raise exception 'CURSO_CTL_NAO_CONFIGURADO';
  end if;

  select coalesce(max(class_number), 0) + 1 into v_next_number
  from classes where course_id = v_ctl_course_id;

  insert into classes (
    course_id, class_number, title, class_date, start_time, end_time,
    generated_from_class_id, created_by
  ) values (
    v_ctl_course_id,
    coalesce(p_ctl_class_number, v_next_number),
    coalesce(p_ctl_title, v_mat.title),
    v_mat.class_date,
    coalesce(p_ctl_start_time, v_mat.start_time),
    coalesce(p_ctl_end_time, v_mat.end_time),
    p_maturidade_class_id,
    auth.uid()
  ) returning id into v_new_id;

  perform trilho_log_audit('CREATE_CLASS', 'class', v_new_id,
    jsonb_build_object('generated_from_class_id', p_maturidade_class_id));

  return v_new_id;
end;
$$;

create or replace function trilho_create_class(
  p_course_id uuid,
  p_class_number integer,
  p_title text,
  p_class_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null,
  p_also_create_ctl boolean default false,
  p_ctl_class_number integer default null,
  p_ctl_title text default null,
  p_ctl_start_time time default null,
  p_ctl_end_time time default null
) returns uuid
language plpgsql security definer as $$
declare
  v_class_id uuid;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  insert into classes (course_id, class_number, title, class_date, start_time, end_time, notes, created_by)
  values (p_course_id, p_class_number, p_title, p_class_date, p_start_time, p_end_time, p_notes, auth.uid())
  returning id into v_class_id;

  perform trilho_log_audit('CREATE_CLASS', 'class', v_class_id,
    jsonb_build_object('course_id', p_course_id, 'class_date', p_class_date));

  if p_also_create_ctl then
    perform trilho_generate_ctl_from_class(
      v_class_id, p_ctl_class_number, p_ctl_title, p_ctl_start_time, p_ctl_end_time
    );
  end if;

  return v_class_id;
end;
$$;

create or replace function trilho_cancel_class(p_class_id uuid, p_reason text default null)
returns void
language plpgsql security definer as $$
declare
  v_course_id uuid;
  v_status text;
begin
  select course_id, status into v_course_id, v_status from classes where id = p_class_id for update;
  if v_course_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;

  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  if v_status = 'ATTENDANCE_OPEN' then
    raise exception 'ENCERRE_A_CHAMADA_ANTES_DE_CANCELAR';
  end if;

  update classes
  set status = 'CANCELLED', notes = coalesce(p_reason, notes)
  where id = p_class_id;

  perform trilho_log_audit('CANCEL_CLASS', 'class', p_class_id, jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------
-- Presença — abrir / fechar chamada
-- ---------------------------------------------------------------------
create or replace function trilho_open_attendance_session(
  p_class_id uuid, p_duration_minutes integer default 90
) returns table (session_id uuid, short_code text, token text, expires_at timestamptz)
language plpgsql security definer as $$
declare
  v_course_id uuid;
  v_status text;
  v_code text;
  v_token text;
  v_session_id uuid;
  v_expires timestamptz;
begin
  select course_id, status into v_course_id, v_status from classes where id = p_class_id for update;
  if v_course_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;

  if not trilho_can_manage_course(v_course_id) then
    raise exception 'SEM_PERMISSAO';
  end if;

  if v_status = 'CANCELLED' then
    raise exception 'AULA_CANCELADA';
  end if;

  if v_status = 'COMPLETED' then
    raise exception 'AULA_JA_FINALIZADA';
  end if;

  if exists (select 1 from attendance_sessions where class_id = p_class_id and closed_at is null) then
    raise exception 'CHAMADA_JA_ABERTA';
  end if;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + make_interval(mins => greatest(p_duration_minutes, 1));

  insert into attendance_sessions (class_id, token_hash, short_code_hash, opened_by, expires_at)
  values (
    p_class_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(),
    v_expires
  ) returning id into v_session_id;

  update classes
  set status = 'ATTENDANCE_OPEN', attendance_open_at = now()
  where id = p_class_id;

  perform trilho_log_audit('OPEN_ATTENDANCE', 'class', p_class_id,
    jsonb_build_object('session_id', v_session_id));

  return query select v_session_id, v_code, v_token, v_expires;
end;
$$;

create or replace function trilho_close_attendance_session(p_class_id uuid)
returns table (marked_present integer, marked_absent integer)
language plpgsql security definer as $$
declare
  v_course_id uuid;
  v_session_id uuid;
  v_present integer := 0;
  v_absent integer := 0;
begin
  select course_id into v_course_id from classes where id = p_class_id for update;
  if v_course_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;

  if not trilho_can_manage_course(v_course_id) then
    raise exception 'SEM_PERMISSAO';
  end if;

  select id into v_session_id from attendance_sessions
  where class_id = p_class_id and closed_at is null
  for update;

  if v_session_id is null then
    raise exception 'CHAMADA_NAO_ABERTA';
  end if;

  update attendance_sessions set closed_at = now(), closed_by = auth.uid() where id = v_session_id;

  -- Alunos ativos do curso sem registro de presença nesta aula viram FALTA.
  insert into attendance (class_id, student_id, status, source, created_by)
  select p_class_id, e.student_id, 'FALTA', 'SYSTEM', auth.uid()
  from enrollments e
  where e.course_id = v_course_id
    and e.status = 'ACTIVE'
    and not exists (
      select 1 from attendance a where a.class_id = p_class_id and a.student_id = e.student_id
    );

  get diagnostics v_absent = row_count;

  select count(*) into v_present from attendance
  where class_id = p_class_id and status = 'PRESENTE';

  update classes
  set status = 'COMPLETED', attendance_close_at = now()
  where id = p_class_id;

  perform trilho_log_audit('CLOSE_ATTENDANCE', 'class', p_class_id,
    jsonb_build_object('session_id', v_session_id, 'marked_absent', v_absent, 'marked_present', v_present));

  return query select v_present, v_absent;
end;
$$;

-- Check-in do aluno: aceita tanto o código curto digitado quanto o
-- token do QR Code (ambos batem contra o hash salvo). Todas as 8
-- validações da seção 7 da spec acontecem aqui dentro, na mesma
-- transação do INSERT.
create or replace function trilho_checkin_attendance(p_value text)
returns table (class_id uuid, course_code text, course_name text, class_title text, class_number integer)
language plpgsql security definer as $$
declare
  v_member_id uuid;
  v_hash text;
  v_session record;
  v_enrollment record;
begin
  v_member_id := trilho_member_id();
  if v_member_id is null then
    raise exception 'ALUNO_NAO_IDENTIFICADO';
  end if;

  v_hash := encode(digest(trim(p_value), 'sha256'), 'hex');

  select s.id, s.class_id, s.closed_at, s.expires_at, c.course_id, c.class_date, c.title, c.class_number
  into v_session
  from attendance_sessions s
  join classes c on c.id = s.class_id
  where (s.token_hash = v_hash or s.short_code_hash = v_hash)
  order by s.opened_at desc
  limit 1;

  if v_session.id is null then
    raise exception 'CODIGO_INVALIDO';
  end if;

  if v_session.closed_at is not null then
    raise exception 'CHAMADA_ENCERRADA';
  end if;

  if v_session.expires_at < now() then
    raise exception 'CODIGO_EXPIRADO';
  end if;

  select e.id, e.course_id into v_enrollment
  from enrollments e
  where e.student_id = v_member_id and e.status = 'ACTIVE';

  if v_enrollment.id is null then
    raise exception 'SEM_MATRICULA_ATIVA';
  end if;

  if v_enrollment.course_id <> v_session.course_id then
    raise exception 'CURSO_DIFERENTE';
  end if;

  if v_session.class_date <> (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'AULA_NAO_E_HOJE';
  end if;

  if exists (select 1 from attendance where class_id = v_session.class_id and student_id = v_member_id) then
    raise exception 'PRESENCA_JA_REGISTRADA';
  end if;

  insert into attendance (class_id, student_id, status, source, checked_in_at, created_by)
  values (v_session.class_id, v_member_id, 'PRESENTE', 'STUDENT_CHECKIN', now(), auth.uid());

  perform trilho_log_audit('CHECKIN', 'attendance', v_session.class_id,
    jsonb_build_object('student_id', v_member_id));

  return query
    select v_session.class_id, co.code, co.name, v_session.title, v_session.class_number
    from courses co where co.id = v_session.course_id;
end;
$$;

-- Registro/edição manual de presença (professor/admin), e também usada
-- para justificar falta (p_status = 'FALTA_JUSTIFICADA'). Sempre grava
-- histórico quando o status muda.
create or replace function trilho_mark_attendance(
  p_class_id uuid, p_student_id uuid, p_status text, p_reason text default null
) returns uuid
language plpgsql security definer as $$
declare
  v_course_id uuid;
  v_existing record;
  v_id uuid;
  v_source text;
begin
  if p_status not in ('PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 'ATRASO') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select course_id into v_course_id from classes where id = p_class_id;
  if v_course_id is null then
    raise exception 'AULA_NAO_ENCONTRADA';
  end if;

  if not trilho_can_manage_course(v_course_id) then
    raise exception 'SEM_PERMISSAO';
  end if;

  if not exists (
    select 1 from enrollments
    where student_id = p_student_id and course_id = v_course_id and status = 'ACTIVE'
  ) then
    raise exception 'ALUNO_SEM_MATRICULA_NO_CURSO';
  end if;

  v_source := case when trilho_is_admin() then 'ADMIN' else 'TEACHER' end;

  select * into v_existing from attendance
  where class_id = p_class_id and student_id = p_student_id
  for update;

  if v_existing.id is null then
    insert into attendance (class_id, student_id, status, source, checked_in_at, created_by, notes)
    values (
      p_class_id, p_student_id, p_status, v_source,
      case when p_status = 'PRESENTE' then now() else null end,
      auth.uid(), p_reason
    ) returning id into v_id;

    perform trilho_log_audit('MARK_ATTENDANCE', 'attendance', v_id,
      jsonb_build_object('class_id', p_class_id, 'student_id', p_student_id, 'status', p_status));
  else
    v_id := v_existing.id;

    if v_existing.status <> p_status then
      insert into attendance_history (attendance_id, old_status, new_status, changed_by, reason)
      values (v_existing.id, v_existing.status, p_status, auth.uid(), p_reason);

      update attendance
      set status = p_status, notes = coalesce(p_reason, notes)
      where id = v_existing.id;

      perform trilho_log_audit('UPDATE_ATTENDANCE_STATUS', 'attendance', v_id,
        jsonb_build_object('old_status', v_existing.status, 'new_status', p_status, 'reason', p_reason));
    end if;
  end if;

  return v_id;
end;
$$;
