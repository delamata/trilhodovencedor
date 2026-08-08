-- =====================================================================
-- Trilho do Vencedor — correção: coluna ambígua em trilho_checkin_attendance
-- =====================================================================
-- Bug encontrado pelos testes de integração (tests/integration/critical-rules.test.ts,
-- TESTE 3): a função `trilho_checkin_attendance` declara
-- `returns table (class_id uuid, ...)`, o que cria um parâmetro OUT
-- chamado `class_id` visível em toda a função. A checagem de presença
-- duplicada usava `class_id` sem qualificar dentro de uma consulta em
-- `attendance`, e o Postgres não sabia se isso era a coluna
-- `attendance.class_id` ou o parâmetro OUT — erro 42702 "column
-- reference is ambiguous". Corrige qualificando as colunas.
-- ---------------------------------------------------------------------
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

  if exists (
    select 1 from attendance
    where attendance.class_id = v_session.class_id and attendance.student_id = v_member_id
  ) then
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
