-- Migration 0006: dpo_audit_log table + immutability trigger + RLS (Story 3.3)
-- FR-DPO-06: append-only audit trail for all DPO actions (erasure, export, audit_view).
-- ARC-008: All DPO access via Edge Functions using service_role client.
-- dpo_audit_log: append-only audit trail. All access via Edge Functions (service_role).
-- No RLS SELECT/INSERT policies for regular users by design.

CREATE TABLE IF NOT EXISTS public.dpo_audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type       TEXT        NOT NULL CHECK (action_type IN ('erasure', 'export', 'audit_view')),
  acting_operator_id TEXT       NOT NULL,  -- JWT sub claim of the DPO operator performing the action
  target_user_id    UUID        NOT NULL,  -- user whose data was acted upon (operatorId for audit_view reads)
  timestamp_utc     TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome           TEXT        NOT NULL CHECK (outcome IN ('success', 'failure')),
  metadata          JSONB
);

-- Index for per-user audit lookups (DPO panel Story 3.4)
CREATE INDEX idx_dpo_audit_log_target_user_id
  ON public.dpo_audit_log(target_user_id);

-- Index for pagination (newest first)
CREATE INDEX idx_dpo_audit_log_timestamp_utc
  ON public.dpo_audit_log(timestamp_utc DESC);

-- Enable RLS — no policies added: only service_role (Edge Functions) can access
ALTER TABLE public.dpo_audit_log ENABLE ROW LEVEL SECURITY;

-- Immutability enforcement function
-- NOTE: service_role bypasses RLS but does NOT bypass BEFORE triggers.
-- This trigger is the primary tamper-proof mechanism for FR-DPO-06.
CREATE OR REPLACE FUNCTION public.dpo_audit_log_immutability()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'dpo_audit_log is append-only';
END;
$$;

-- Attach trigger: fires BEFORE UPDATE OR DELETE on every row, for ALL roles including service_role
CREATE TRIGGER dpo_audit_log_immutability_trigger
  BEFORE UPDATE OR DELETE
  ON public.dpo_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.dpo_audit_log_immutability();
