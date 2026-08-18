-- =====================================================================
-- Trilho do Vencedor v2 — cadastro de professor novo não pede célula
-- =====================================================================
-- Só discipuladores pra cima se cadastram como professor em
-- /professores — pedir célula ali é fricção desnecessária. members.celula
-- continua NOT NULL (coluna do Oikos, não mexemos nisso), então
-- gravamos um valor fixo só pra satisfazer a constraint; quem cuida da
-- célula de verdade desse membro é o cadastro no Oikos, não este fluxo.
-- =====================================================================

drop function if exists trilho_public_create_member(text, text, text, text);
drop function if exists trilho_public_list_celulas();

create or replace function trilho_public_create_member(
  p_nome text, p_tel text, p_ip text default null
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

  v_ip_hash := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  if (
    select count(*) from public_teacher_attempts
    where ip_hash = v_ip_hash and kind = 'REGISTER' and created_at > now() - interval '5 minutes'
  ) >= 15 then
    raise exception 'MUITAS_TENTATIVAS';
  end if;
  insert into public_teacher_attempts (ip_hash, kind) values (v_ip_hash, 'REGISTER');

  insert into members (nome, tel, celula, tipo, posicao, active)
  values (trim(p_nome), trim(p_tel), 'Liderança', 'Adultos', 'Discipulador', true)
  returning id into v_id;

  perform trilho_log_audit('PUBLIC_CREATE_MEMBER', 'member', v_id, jsonb_build_object('nome', p_nome));

  return query select v_id, trim(p_nome);
end;
$$;

grant execute on function trilho_public_create_member(text, text, text) to anon, authenticated;
