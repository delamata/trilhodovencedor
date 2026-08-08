-- =====================================================================
-- Trilho do Vencedor — Auditoria
-- =====================================================================
-- Registra toda operação administrativa relevante (abrir/fechar
-- chamada, matricular, alterar presença, cancelar aula, etc.). Nunca é
-- escrita diretamente pelo cliente — só pelas funções SECURITY DEFINER
-- em 20260807120300_trilho_functions.sql.
-- ---------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_idx on audit_logs (user_id);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
