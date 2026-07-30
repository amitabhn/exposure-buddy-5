-- Migration 0033: idempotency guard for perform_user_erasure() (Story 10.5)
-- Fixes: re-erasure of an already-erased user previously "succeeded" silently, re-stamping
-- deleted_at and letting dpo-erase-user write a second indistinguishable outcome:'success'
-- audit-log entry. Masked until Story 10.4 fixed the NOT NULL bug that made every erasure
-- call fail regardless of state — reachable for the first time once erasure could succeed.
-- Replaces the UPDATE-then-NOT-FOUND check (migration 0007) with a SELECT ... FOR UPDATE
-- that checks row existence and already-erased state before either UPDATE runs, closing the
-- check-then-act race a plain SELECT would leave open. Style follows the existing
-- SELECT ... INTO precedent in migration 0026 (swap_ladder_positions_rpc).

CREATE OR REPLACE FUNCTION public.perform_user_erasure(p_target_user_id UUID)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
BEGIN
  -- Lock the target row and read its current erasure state before mutating anything.
  SELECT deleted_at INTO v_deleted_at
  FROM public.users
  WHERE id = p_target_user_id
  FOR UPDATE;

  -- Raise if user does not exist — prevents false 'success' audit entries (Finding 8)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'erasure_target_not_found: user % does not exist in public.users', p_target_user_id;
  END IF;

  -- Idempotency guard (Story 10.5): reject a second erasure attempt instead of
  -- silently re-stamping deleted_at and masking it as a fresh success.
  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'erasure_already_erased: user % was already erased at %', p_target_user_id, v_deleted_at;
  END IF;

  -- Step 1: Null PII in public.users and set soft-delete marker (atomic with Step 2)
  UPDATE public.users
  SET email = NULL, deleted_at = now()
  WHERE id = p_target_user_id;

  -- Step 2: Null PII in public.profiles (profile row may be absent — not an error)
  UPDATE public.profiles
  SET display_name = NULL
  WHERE id = p_target_user_id;
END;
$$;

COMMENT ON FUNCTION public.perform_user_erasure IS
  'Atomic DPDPA PII erasure (Steps 1+2). Nulls email + sets deleted_at in public.users; '
  'nulls display_name in public.profiles. Both updates run in one transaction — partial '
  'erasure is impossible. Raises erasure_target_not_found if user absent, or '
  'erasure_already_erased if the user was already erased (idempotency guard, Story 10.5) — '
  'both checked via a SELECT ... FOR UPDATE row lock before any mutation. '
  'Step 3 (auth user ban + email anonymisation) is performed separately by the Edge Function. '
  'DPDPA 2023 §5 completeness requirement.';
