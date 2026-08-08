-- =====================================================================
-- Trilho do Vencedor v2 — desvincula o calendário de CTL do Maturidade
-- =====================================================================
-- Decisão de produto: Maturidade e CTL passam a ter calendários
-- totalmente independentes. Não existe mais geração automática das
-- aulas de CTL a partir das terças-feiras do Maturidade — toda turma
-- (Maturidade ou CTL) tem suas aulas agendadas manualmente, do mesmo
-- jeito (trilho_create_class_session).
--
-- O que NÃO muda: cohorts.next_ctl_cohort_id continua existindo e
-- continua sendo usado pela promoção automática em
-- trilho_finalize_cohort() (BR-009) — só deixou de servir também como
-- origem do calendário (antigo BR-007, removido).
-- =====================================================================

drop function if exists trilho_generate_ctl_calendar(uuid, boolean);

comment on column cohorts.next_ctl_cohort_id is 'BR-009: turma de CTL para a qual aprovados desta turma de Maturidade são promovidos automaticamente ao finalizar. Maturidade e CTL têm calendários de aula independentes — este campo não influencia mais o agendamento de aulas.';
