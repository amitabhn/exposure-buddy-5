-- Story 6.2-C AC 7 (D13): DPDPA-compliant audit trail entry on ladder item hard delete.
--
-- Widen the dpo_audit_log action_type CHECK constraint first (same migration, in order,
-- before the trigger is created) — the trigger function must never be able to raise on
-- this INSERT, since an AFTER DELETE trigger failure rolls back the whole transaction
-- (including the DELETE), reproducing the same ps_crud-retry-forever failure mode that
-- the rejected BEFORE DELETE guard trigger (D8c) was rejected to avoid.
ALTER TABLE public.dpo_audit_log DROP CONSTRAINT IF EXISTS dpo_audit_log_action_type_check;
ALTER TABLE public.dpo_audit_log
  ADD CONSTRAINT dpo_audit_log_action_type_check
  CHECK (action_type IN ('erasure', 'export', 'audit_view', 'ladder_item_delete'));

-- SECURITY DEFINER + pinned search_path, mirroring perform_user_erasure's pattern
-- (migration 0007). Required because the calling role (authenticated, via the user's
-- own session) has no INSERT grant on dpo_audit_log per migration 0006's design — the
-- trigger function runs as its owner (the table owner, exempt from RLS by default),
-- bypassing RLS specifically to bridge this gap.
--
-- metadata contains only item_id — never description (the fear text itself) — to
-- satisfy DPDPA §8(7) minimization. acting_operator_id is set to the deleted row's own
-- user_id (cast to text) because this is a self-service deletion, not a DPO-operator
-- action.
CREATE OR REPLACE FUNCTION public.fear_ladder_items_delete_audit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dpo_audit_log (action_type, acting_operator_id, target_user_id, outcome, metadata)
  VALUES ('ladder_item_delete', OLD.user_id::text, OLD.user_id, 'success', jsonb_build_object('item_id', OLD.id));
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS fear_ladder_items_delete_audit_trigger ON public.fear_ladder_items;
CREATE TRIGGER fear_ladder_items_delete_audit_trigger
  AFTER DELETE ON public.fear_ladder_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fear_ladder_items_delete_audit();
