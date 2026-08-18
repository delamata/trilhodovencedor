-- =====================================================================
-- Trilho do Vencedor v2 — professor por MÓDULO (não mais por turma
-- inteira) + cadastro público de professor NOVO
-- =====================================================================
-- Substitui a escolha "vou lecionar esta turma inteira" por "vou
-- lecionar o módulo N desta turma" — cada módulo só pode ter UM
-- professor (índice único). `teacher_cohorts` continua existindo (dá
-- acesso de professor à turma inteira quando logado — RLS/
-- trilho_is_teacher_of_cohort), mas agora é preenchida como
-- consequência de assumir pelo menos um módulo daquela turma, não mais
-- escolhida diretamente no cadastro público.
-- =====================================================================

create table if not exists module_teachers (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  module_number integer not null check (module_number > 0),
  teacher_id uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- REGRA CRÍTICA: um módulo, numa turma, tem no máximo um professor.
  unique (cohort_id, module_number)
);

create index if not exists module_teachers_teacher_idx on module_teachers (teacher_id);

alter table module_teachers enable row level security;

create policy "module_teachers_select_all" on module_teachers
  for select to authenticated using (true);

create policy "module_teachers_write_admin" on module_teachers
  for all to authenticated
  using (trilho_is_admin())
  with check (trilho_is_admin());

grant select, insert, delete on module_teachers to authenticated;

-- ---------------------------------------------------------------------
-- Cadastro público de professor NOVO (member ainda não existe).
-- ---------------------------------------------------------------------
create or replace function trilho_public_list_celulas()
returns table (celula text)
language sql security definer stable as $$
  select ch.celula from celula_hierarquia ch order by ch.celula;
$$;

create or replace function trilho_public_create_member(
  p_nome text, p_tel text, p_celula text, p_ip text default null
) returns table (member_id uuid, display_name text)
language plpgsql security definer as $$
declare
  v_ip_hash text;
  v_id uuid;
begin
  if length(trim(coalesce(p_nome, ''))) < 3 then
    raise exception 'NOME_MUITO_CURTO';
  end if;
  if length(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g')) < 8 then
    raise exception 'TELEFONE_INVALIDO';
  end if;
  if length(trim(coalesce(p_celula, ''))) < 1 then
    raise exception 'CELULA_OBRIGATORIA';
  end if;

  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_teacher_attempts
    where ip_hash = v_ip_hash and kind = 'REGISTER' and created_at > now() - interval '5 minutes'
  ) >= 15 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_teacher_attempts (ip_hash, kind) values (v_ip_hash, 'REGISTER');

  insert into members (nome, tel, celula, tipo, posicao, active)
  values (trim(p_nome), trim(p_tel), trim(p_celula), 'Adultos', 'Visitante', true)
  returning id into v_id;

  perform trilho_log_audit('PUBLIC_CREATE_MEMBER', 'member', v_id, jsonb_build_object('nome', p_nome));

  return query select v_id, trim(p_nome);
end;
$$;

-- ---------------------------------------------------------------------
-- Módulos disponíveis pra escolher, com quem já pegou cada um (se
-- alguém já pegou). Substitui trilho_public_list_teachable_cohorts —
-- a unidade de escolha agora é o módulo, não a turma inteira.
-- ---------------------------------------------------------------------
drop function if exists trilho_public_list_teachable_cohorts();

create or replace function trilho_public_list_teachable_modules()
returns table (
  cohort_id uuid, cohort_code text, cohort_name text, course_name text,
  module_number integer, lesson1_code text, lesson1_title text,
  lesson2_code text, lesson2_title text,
  taken_by_member_id uuid, taken_by_name text
)
language sql security definer stable as $$
  select
    c.id, c.code, c.name, co.name,
    lt1.module_number, lt1.lesson_code, lt1.title, lt2.lesson_code, lt2.title,
    mt.teacher_id, m.nome
  from cohorts c
  join courses co on co.id = c.course_id
  join lesson_templates lt1 on lt1.course_id = c.course_id and lt1.lesson_number = 1
  join lesson_templates lt2 on lt2.course_id = c.course_id and lt2.module_number = lt1.module_number and lt2.lesson_number = 2
  left join module_teachers mt on mt.cohort_id = c.id and mt.module_number = lt1.module_number
  left join members m on m.id = mt.teacher_id
  where c.status in ('PLANNED', 'ACTIVE')
  order by co.name, c.code, lt1.module_number;
$$;

-- ---------------------------------------------------------------------
-- Confirma identidade (telefone) e reivindica os módulos escolhidos.
-- Cada módulo é tratado individualmente: se já foi pego por OUTRO
-- professor entre a listagem e o envio (corrida), essa linha volta
-- como JA_OCUPADO em vez de derrubar as outras — nunca falha tudo por
-- causa de uma linha.
-- ---------------------------------------------------------------------
drop function if exists trilho_public_register_teacher(uuid, text, uuid[], text);

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
      select teacher_id into v_existing_teacher from module_teachers
      where cohort_id = v_cohort_id and module_number = v_module_number;
      cohort_id := v_cohort_id; module_number := v_module_number; cohort_name := v_cohort_name;
      status := case when v_existing_teacher = p_member_id then 'JA_ERA_SEU' else 'JA_OCUPADO' end;
    end;

    return next;
  end loop;

  insert into teacher_cohorts (teacher_id, cohort_id)
  select distinct p_member_id, cid from unnest(p_cohort_ids) as cid
  on conflict (teacher_id, cohort_id) do nothing;

  perform trilho_log_audit('PUBLIC_REGISTER_TEACHER_MODULES', 'member', p_member_id,
    jsonb_build_object('cohort_ids', p_cohort_ids, 'module_numbers', p_module_numbers));
end;
$$;

grant execute on function trilho_public_list_celulas() to anon, authenticated;
grant execute on function trilho_public_create_member(text, text, text, text) to anon, authenticated;
grant execute on function trilho_public_list_teachable_modules() to anon, authenticated;
grant execute on function trilho_public_register_teacher_modules(uuid, text, uuid[], integer[], text) to anon, authenticated;
