-- =====================================================================
-- Trilho do Vencedor v2 — editar/excluir aula (class_session)
-- =====================================================================
-- Só permite editar/excluir aulas SCHEDULED (nunca depois que a chamada
-- abriu ou a aula foi concluída — nesse ponto ela já tem presença real
-- lançada). Excluir também aceita CANCELLED (limpar um erro de
-- agendamento). attendance cascadeia sozinha a partir de class_sessions
-- ("on delete cascade"), mas na prática uma aula SCHEDULED/CANCELLED
-- nunca tem presença lançada — a chamada só existe depois de abrir.
-- =====================================================================

create or replace function trilho_update_class_session(
  p_class_session_id uuid, p_lesson_template_id uuid, p_class_date date,
  p_start_time time, p_end_time time, p_notes text default null
) returns void
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
  if v_status <> 'SCHEDULED' then
    raise exception 'AULA_NAO_PODE_SER_EDITADA';
  end if;

  update class_sessions
  set lesson_template_id = p_lesson_template_id,
      class_date = p_class_date,
      start_time = p_start_time,
      end_time = p_end_time,
      notes = p_notes
  where id = p_class_session_id;

  perform trilho_log_audit('UPDATE_CLASS_SESSION', 'class_session', p_class_session_id,
    jsonb_build_object('class_date', p_class_date, 'lesson_template_id', p_lesson_template_id));
end;
$$;

grant execute on function trilho_update_class_session(uuid, uuid, date, time, time, text) to authenticated;

create or replace function trilho_delete_class_session(p_class_session_id uuid)
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
  if v_status not in ('SCHEDULED', 'CANCELLED') then
    raise exception 'AULA_NAO_PODE_SER_EXCLUIDA';
  end if;

  perform trilho_log_audit('DELETE_CLASS_SESSION', 'class_session', p_class_session_id, jsonb_build_object('status', v_status));

  delete from class_sessions where id = p_class_session_id;
end;
$$;

grant execute on function trilho_delete_class_session(uuid) to authenticated;
