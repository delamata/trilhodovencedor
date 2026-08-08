-- =====================================================================
-- Trilho do Vencedor — Views de leitura
-- =====================================================================
-- security_invoker = true: a view roda com o RLS de quem consulta, não
-- do dono da view. Ou seja, um aluno só vê a própria linha, professor
-- só as dos cursos dele, admin vê tudo — herdado do RLS de
-- enrollments/attendance/classes, sem duplicar a lógica de escopo aqui.
--
-- Não calcula "situação" (REGULAR/ATENÇÃO/ALERTA/...) em SQL — isso é
-- derivado em TypeScript a partir de absences_remaining, num único
-- lugar (src/lib/domain/situacao.ts), para não hardcodar limites em
-- mais de um lugar.
-- ---------------------------------------------------------------------
create or replace view trilho_student_summary
with (security_invoker = true) as
select
  e.id as enrollment_id,
  e.student_id,
  e.course_id,
  co.code as course_code,
  co.name as course_name,
  co.max_absences,
  co.justified_absence_counts_towards_limit,
  e.status as enrollment_status,
  e.enrolled_at,
  e.ended_at,
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
join courses co on co.id = e.course_id
left join classes cl
  on cl.course_id = e.course_id
  and cl.status <> 'CANCELLED'
  and cl.class_date >= e.enrolled_at
  and (e.ended_at is null or cl.class_date <= e.ended_at)
left join attendance a
  on a.class_id = cl.id
  and a.student_id = e.student_id
group by e.id, co.id;

comment on view trilho_student_summary is
  'Resumo de presença/falta por matrícula. absences_remaining < 0 = limite excedido.';
