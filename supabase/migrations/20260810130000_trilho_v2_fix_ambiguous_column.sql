-- =====================================================================
-- Corrige bug em trilho_public_register_teacher_modules: TODA tentativa
-- de cadastro dava "Não foi possível concluir a operação" porque a
-- função tem uma coluna de retorno chamada `cohort_id` (OUT parameter),
-- e:
--   1) a query que descobre quem já pegou um módulo ocupado
--      referenciava `cohort_id`/`module_number` sem qualificar a
--      tabela — ambíguo com o OUT parameter de mesmo nome;
--   2) a cláusula `on conflict (teacher_id, cohort_id)` no insert de
--      teacher_cohorts também é ambígua pelo mesmo motivo — confirmado
--      isolando o bug numa função de teste (o `insert ... values`
--      sozinho não dá erro, só quando tem `on conflict (colunas...)`
--      junto). Troquei pra `on conflict on constraint
--      teacher_cohorts_pkey`, que não referencia nomes de coluna soltos.
-- Postgres rejeitava com "column reference \"cohort_id\" is ambiguous"
-- (42702) sempre que alguém tentava se cadastrar num módulo. Nenhuma
-- mudança de assinatura, então CREATE OR REPLACE basta.
-- =====================================================================

create or replace function trilho_public_register_teacher_modules(
  p_member_id uuid, p_phone_suffix text, p_cohort_ids uuid[], p_module_numbers integer[],
  p_ip text default null
) returns table (cohort_id uuid, module_number integer, cohort_name text, status text)
language plpgsql security definer as $$
declare
  v_ip_hash text;
  v_member record;
  v_cohort_id uuid;
  v_module_number integer;
  v_cohort_name text;
  v_existing_teacher uuid;
  i integer;
begin
  if p_cohort_ids is null or array_length(p_cohort_ids, 1) is null
     or array_length(p_cohort_ids, 1) <> array_length(p_module_numbers, 1)
  then
    raise exception 'NENHUM_MODULO_SELECIONADO';
  end if;

  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_teacher_attempts
    where ip_hash = v_ip_hash and kind = 'REGISTER' and created_at > now() - interval '5 minutes'
  ) >= 15 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_teacher_attempts (ip_hash, kind) values (v_ip_hash, 'REGISTER');

  select id, nome, tel into v_member from members where id = p_member_id and active = true;
  if v_member.id is null then
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;
  if v_member.tel is null or right(regexp_replace(v_member.tel, '\D', '', 'g'), 4) <> trim(p_phone_suffix) then
    raise exception 'NAO_FOI_POSSIVEL_VALIDAR';
  end if;

  for i in 1..array_length(p_cohort_ids, 1) loop
    v_cohort_id := p_cohort_ids[i];
    v_module_number := p_module_numbers[i];

    select c.name into v_cohort_name from cohorts c where c.id = v_cohort_id and c.status in ('PLANNED', 'ACTIVE');
    if v_cohort_name is null then
      cohort_id := v_cohort_id; module_number := v_module_number; cohort_name := null; status := 'TURMA_INVALIDA';
      return next;
      continue;
    end if;

    if not exists (
      select 1 from lesson_templates lt join cohorts c on c.course_id = lt.course_id
      where c.id = v_cohort_id and lt.module_number = v_module_number
    ) then
      cohort_id := v_cohort_id; module_number := v_module_number; cohort_name := v_cohort_name; status := 'MODULO_INVALIDO';
      return next;
      continue;
    end if;

    begin
      insert into module_teachers (cohort_id, module_number, teacher_id) values (v_cohort_id, v_module_number, p_member_id);
      cohort_id := v_cohort_id; module_number := v_module_number; cohort_name := v_cohort_name; status := 'REGISTRADO';
    exception when unique_violation then
      select mt.teacher_id into v_existing_teacher from module_teachers mt
      where mt.cohort_id = v_cohort_id and mt.module_number = v_module_number;
      cohort_id := v_cohort_id; module_number := v_module_number; cohort_name := v_cohort_name;
      status := case when v_existing_teacher = p_member_id then 'JA_ERA_SEU' else 'JA_OCUPADO' end;
    end;

    return next;
  end loop;

  insert into teacher_cohorts (teacher_id, cohort_id)
  select distinct p_member_id, cid from unnest(p_cohort_ids) as cid
  on conflict on constraint teacher_cohorts_pkey do nothing;

  perform trilho_log_audit('PUBLIC_REGISTER_TEACHER_MODULES', 'member', p_member_id,
    jsonb_build_object('cohort_ids', p_cohort_ids, 'module_numbers', p_module_numbers));
end;
$$;

grant execute on function trilho_public_register_teacher_modules(uuid, text, uuid[], integer[], text) to anon, authenticated;
