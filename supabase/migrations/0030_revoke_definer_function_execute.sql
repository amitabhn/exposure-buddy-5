-- Migration 0030: revoke public EXECUTE on SECURITY DEFINER functions
-- (security advisor lints 0028/0029 — anon/authenticated_security_definer_function_executable)
--
-- Both functions below are SECURITY DEFINER but, via PostgreSQL's default PUBLIC execute
-- grant, were callable by anon/authenticated over PostgREST RPC. Neither is meant to be
-- invoked directly through the API:
--   * perform_user_erasure (migration 0007): nulls a user's PII + sets deleted_at, running
--     as owner (bypasses RLS). Only the dpo-erase-user Edge Function (service_role) should
--     call it. Left public, ANY signed-in user could erase ANY other user's PII by id.
--   * fear_ladder_items_delete_audit (migration 0027): an AFTER DELETE trigger function that
--     writes to the append-only dpo_audit_log. Trigger functions fire as the table owner
--     regardless of the invoker's EXECUTE privilege, so revoking public EXECUTE does NOT
--     break the trigger — it only removes the ability to forge audit rows via direct RPC.

REVOKE EXECUTE ON FUNCTION public.perform_user_erasure(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perform_user_erasure(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.fear_ladder_items_delete_audit() FROM PUBLIC, anon, authenticated;
