-- =====================================================================
-- Trilho do Vencedor v2 — excluir turma (limpeza de turmas antigas)
-- =====================================================================
-- Só permite excluir turmas FINISHED ou CANCELLED — nunca uma turma
-- PLANNED/ACTIVE (evita apagar por engano algo em uso). class_sessions
-- e enrollments referenciam cohorts com "on delete restrict", então
-- precisam ser apagados manualmente antes; attendance/attendance_history
-- cascadeiam a partir de class_sessions, teacher_cohorts e
-- public_checkin_attempts cascadeiam a partir de cohorts diretamente, e
-- previous_cohort_id/next_ctl_cohort_id de OUTRAS turmas que apontem
-- pra esta viram null automaticamente ("on delete set null").
-- =====================================================================

create or replace function trilho_delete_cohort(p_cohort_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_status text;
begin
  if not trilho_is_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  select status into v_status from cohorts where id = p_cohort_id for update;
  if v_status is null then
    raise exception 'TURMA_NAO_ENCONTRADA';
  end if;
  if v_status not in ('FINISHED', 'CANCELLED') then
    raise exception 'TURMA_NAO_PODE_SER_EXCLUIDA';
  end if;

  delete from class_sessions where cohort_id = p_cohort_id;
  delete from enrollments where cohort_id = p_cohort_id;

  perform trilho_log_audit('DELETE_COHORT', 'cohort', p_cohort_id, jsonb_build_object('status', v_status));

  delete from cohorts where id = p_cohort_id;
end;
$$;

grant execute on function trilho_delete_cohort(uuid) to authenticated;
