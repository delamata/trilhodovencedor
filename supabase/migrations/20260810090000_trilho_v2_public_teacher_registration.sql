-- =====================================================================
-- Trilho do Vencedor v2 — cadastro público de professor (sem login)
-- =====================================================================
-- Mesmo espírito do check-in público de aluno (seção BR-013/BR-015):
-- o professor se identifica por nome (busca) + confirmação pelos 4
-- últimos dígitos do telefone cadastrado em `members` — nunca por
-- login/senha — e escolhe em quais turmas vai lecionar. Isso só grava
-- em `teacher_cohorts` (a mesma tabela que o painel admin já usa em
-- "Professores" — nenhuma tabela nova de professores).
--
-- Como qualquer fluxo público, roda com o role "anon": só 3 funções
-- SECURITY DEFINER têm GRANT EXECUTE pra "anon" — nenhuma tabela tem
-- grant direto.
-- =====================================================================

create table if not exists public_teacher_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  kind text not null check (kind in ('SEARCH', 'REGISTER')),
  created_at timestamptz not null default now()
);

create index if not exists public_teacher_attempts_ip_kind_idx
  on public_teacher_attempts (ip_hash, kind, created_at desc);

alter table public_teacher_attempts enable row level security;

create policy "public_teacher_attempts_select_admin" on public_teacher_attempts
  for select to authenticated using (trilho_is_admin());

-- ---------------------------------------------------------------------
-- Busca por nome entre TODOS os membros ativos (não só matriculados
-- numa turma — um professor pode não ter nenhuma matrícula como
-- aluno). Nunca devolve telefone.
-- ---------------------------------------------------------------------
create or replace function trilho_public_search_members(p_name_query text, p_ip text default null)
returns table (member_id uuid, display_name text)
language plpgsql security definer as $$
declare
  v_ip_hash text;
begin
  if length(trim(coalesce(p_name_query, ''))) < 3 then
    raise exception 'NOME_MUITO_CURTO';
  end if;

  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_teacher_attempts
    where ip_hash = v_ip_hash and kind = 'SEARCH' and created_at > now() - interval '5 minutes'
  ) >= 30 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_teacher_attempts (ip_hash, kind) values (v_ip_hash, 'SEARCH');

  return query
    select m.id, m.nome
    from members m
    where m.active = true
      and m.nome ilike '%' || trim(p_name_query) || '%'
    order by m.nome
    limit 8;
end;
$$;

-- ---------------------------------------------------------------------
-- Turmas abertas pra escolha (só PLANNED/ACTIVE — não faz sentido
-- lecionar uma turma finalizada/cancelada).
-- ---------------------------------------------------------------------
create or replace function trilho_public_list_teachable_cohorts()
returns table (cohort_id uuid, cohort_code text, cohort_name text, course_name text)
language sql security definer stable as $$
  select c.id, c.code, c.name, co.name
  from cohorts c
  join courses co on co.id = c.course_id
  where c.status in ('PLANNED', 'ACTIVE')
  order by co.name, c.code;
$$;

-- ---------------------------------------------------------------------
-- Confirma identidade (telefone) e grava teacher_cohorts pras turmas
-- escolhidas. Erro sempre genérico (BR-015): nunca revela se foi o
-- membro ou o telefone que não bateu.
-- ---------------------------------------------------------------------
create or replace function trilho_public_register_teacher(
  p_member_id uuid, p_phone_suffix text, p_cohort_ids uuid[], p_ip text default null
) returns table (cohort_id uuid, cohort_name text, already_registered boolean)
language plpgsql security definer as $$
declare
  v_ip_hash text;
  v_member record;
begin
  if p_cohort_ids is null or array_length(p_cohort_ids, 1) is null then
    raise exception 'NENHUMA_TURMA_SELECIONADA';
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

  create temporary table _teacher_reg_result on commit drop as
  select c.id as cohort_id, c.name as cohort_name,
    exists (
      select 1 from teacher_cohorts tc where tc.teacher_id = p_member_id and tc.cohort_id = c.id
    ) as already_registered
  from cohorts c
  where c.id = any(p_cohort_ids) and c.status in ('PLANNED', 'ACTIVE');

  insert into teacher_cohorts (teacher_id, cohort_id)
  select p_member_id, r.cohort_id from _teacher_reg_result r
  where not r.already_registered
  on conflict (teacher_id, cohort_id) do nothing;

  perform trilho_log_audit('PUBLIC_REGISTER_TEACHER', 'member', p_member_id,
    jsonb_build_object('cohort_ids', p_cohort_ids));

  return query select r.cohort_id, r.cohort_name, r.already_registered from _teacher_reg_result r;
end;
$$;

grant execute on function trilho_public_search_members(text, text) to anon, authenticated;
grant execute on function trilho_public_list_teachable_cohorts() to anon, authenticated;
grant execute on function trilho_public_register_teacher(uuid, text, uuid[], text) to anon, authenticated;
