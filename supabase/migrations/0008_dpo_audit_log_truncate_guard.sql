-- Migration 0008: dpo_audit_log TRUNCATE immutability guard (Story 3.3 CR fix)
-- Finding 5: BEFORE UPDATE OR DELETE FOR EACH ROW triggers (migration 0006) do NOT fire on TRUNCATE.
-- This statement-level BEFORE TRUNCATE trigger closes that gap so service_role cannot silently
-- wipe the entire audit log with a single TRUNCATE statement.
-- DPDPA 2023 requires processing records to be maintained — destruction of the audit trail
-- is treated as the same violation as modifying an individual entry.

CREATE OR REPLACE FUNCTION public.dpo_audit_log_truncate_guard()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'dpo_audit_log is append-only';
END;
$$;

-- Statement-level trigger: fires once per TRUNCATE statement regardless of row count
CREATE TRIGGER dpo_audit_log_truncate_guard_trigger
  BEFORE TRUNCATE
  ON public.dpo_audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.dpo_audit_log_truncate_guard();
