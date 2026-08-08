-- =====================================================================
-- Trilho do Vencedor v2 — trilho_student_summary reconstruída em torno
-- de TURMA. Fica mais simples que a v1: como a matrícula agora aponta
-- direto pra uma cohort (não mais pra um curso + intervalo de datas),
-- o join com class_sessions é só por cohort_id — sem precisar filtrar
-- por data de matrícula/desligamento.
-- =====================================================================
create or replace view trilho_student_summary
with (security_invoker = true) as
select
  e.id as enrollment_id,
  e.student_id,
  e.cohort_id,
  co.id as course_id,
  co.code as course_code,
  co.name as course_name,
  ch.code as cohort_code,
  ch.name as cohort_name,
  co.max_absences,
  co.justified_absence_counts_towards_limit,
  e.status as enrollment_status,
  e.academic_result,
  e.enrolled_at,
  e.completed_at,
  e.dropped_out_at,
  count(a.id) as classes_recorded,
  count(a.id) filter (where a.status = 'PRESENTE') as presences,
  count(a.id) filter (where a.status = 'FALTA') as absences,
  count(a.id) filter (where a.status = 'FALTA_JUSTIFICADA') as justified_absences,
  count(a.id) filter (where a.status = 'ATRASO') as late_count,
  (
    count(a.id) filter (where a.status = 'FALTA')
    + case when co.justified_absence_counts_towards_limit
        then count(a.id) filter (where a.status = 'FALTA_JUSTIFICADA')
        else 0 end
  )::integer as counted_absences,
  (
    co.max_absences - (
      count(a.id) filter (where a.status = 'FALTA')
      + case when co.justified_absence_counts_towards_limit
          then count(a.id) filter (where a.status = 'FALTA_JUSTIFICADA')
          else 0 end
    )
  )::integer as absences_remaining
from enrollments e
join cohorts ch on ch.id = e.cohort_id
join courses co on co.id = ch.course_id
left join class_sessions cs on cs.cohort_id = e.cohort_id and cs.status <> 'CANCELLED'
left join attendance a on a.class_session_id = cs.id and a.student_id = e.student_id
group by e.id, ch.id, co.id;

comment on view trilho_student_summary is
  'Resumo de presença/falta por matrícula (agora por turma). absences_remaining < 0 = limite excedido.';

grant select on trilho_student_summary to authenticated;

-- ---------------------------------------------------------------------
-- trilho_dropout_report: relatório de desistências (seção 12).
-- ---------------------------------------------------------------------
create or replace view trilho_dropout_report
with (security_invoker = true) as
select
  e.id as enrollment_id,
  e.student_id,
  m.nome as student_name,
  co.code as course_code,
  co.name as course_name,
  ch.id as cohort_id,
  ch.code as cohort_code,
  ch.name as cohort_name,
  e.enrolled_at,
  e.dropped_out_at,
  e.dropout_reason,
  e.dropout_notes,
  count(a.id) filter (where a.class_session_id in (
    select id from class_sessions where cohort_id = e.cohort_id and class_date <= e.dropped_out_at and status <> 'CANCELLED'
  )) as classes_recorded_until_dropout,
  count(a.id) filter (where a.status = 'PRESENTE') as presences,
  count(a.id) filter (where a.status in ('FALTA', 'FALTA_JUSTIFICADA')) as absences
from enrollments e
join members m on m.id = e.student_id
join cohorts ch on ch.id = e.cohort_id
join courses co on co.id = ch.course_id
left join attendance a on a.student_id = e.student_id and a.class_session_id in (
  select id from class_sessions where cohort_id = e.cohort_id
)
where e.status = 'DROPPED_OUT'
group by e.id, m.id, co.id, ch.id;

comment on view trilho_dropout_report is 'Relatório de desistências — seção 12.';

grant select on trilho_dropout_report to authenticated;
