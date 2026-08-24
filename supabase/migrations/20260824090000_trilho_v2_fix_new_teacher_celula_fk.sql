-- =====================================================================
-- Corrige "Não foi possível concluir a operação" em TODO cadastro de
-- professor novo (fluxo "Sou novo" em /professores).
--
-- trilho_public_create_member gravava celula = 'Liderança' fixo desde
-- 20260810120000_trilho_v2_teacher_no_celula.sql (quando removemos a
-- escolha de célula do formulário). members.celula tem uma foreign key
-- pra celula_hierarquia(celula) — tabela compartilhada com o Oikos —
-- e 'Liderança' não é (e talvez nunca tenha sido) uma célula real lá.
-- Toda tentativa de cadastro batia em
--   "insert or update on table members violates foreign key
--    constraint members_celula_fkey — Key (celula)=(Liderança) is not
--    present in table celula_hierarquia"
-- que o cliente traduzia pra mensagem genérica.
--
-- members.celula é NULLABLE (confirmado via information_schema), então
-- a correção é simplesmente não gravar um valor fixo: professor que se
-- cadastra sozinho (só discipulador+, BR-017) não pertence a uma
-- célula específica pra fins deste cadastro — fica null, sem violar a
-- FK. Nenhuma mudança de assinatura, CREATE OR REPLACE basta.
-- =====================================================================

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
  values (trim(p_nome), trim(p_tel), null, 'Adultos', 'Discipulador', true)
  returning id into v_id;

  perform trilho_log_audit('PUBLIC_CREATE_MEMBER', 'member', v_id, jsonb_build_object('nome', p_nome));

  return query select v_id, trim(p_nome);
end;
$$;

grant execute on function trilho_public_create_member(text, text, text) to anon, authenticated;
