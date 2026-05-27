-- Migration 0007: perform_user_erasure() RPC function (Story 3.3 CR fix)
-- Finding 4 (atomicity): wraps public.users + public.profiles PII nulling in a single DB transaction.
-- Finding 8 (false-success): raises 'erasure_target_not_found' if user absent — Edge Function returns 400.
-- Called from dpo-erase-user Edge Function via service_role RPC (adminClient.rpc).
-- Auth user ban (Step 3) is a separate API call — cannot run inside a DB transaction.

CREATE OR REPLACE FUNCTION public.perform_user_erasure(p_target_user_id UUID)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public  -- Patch 2: pin search_path to prevent schema-injection via shadowed tables
AS $$
BEGIN
  -- Step 1: Null PII in public.users and set soft-delete marker (atomic with Step 2)
  UPDATE public.users
  SET email = NULL, deleted_at = now()
  WHERE id = p_target_user_id;

  -- Raise if user does not exist — prevents false 'success' audit entries (Finding 8)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'erasure_target_not_found: user % does not exist in public.users', p_target_user_id;
  END IF;

  -- Step 2: Null PII in public.profiles (profile row may be absent — not an error)
  UPDATE public.profiles
  SET display_name = NULL
  WHERE id = p_target_user_id;
END;
$$;

COMMENT ON FUNCTION public.perform_user_erasure IS
  'Atomic DPDPA PII erasure (Steps 1+2). Nulls email + sets deleted_at in public.users; '
  'nulls display_name in public.profiles. Both updates run in one transaction — partial '
  'erasure is impossible. Raises erasure_target_not_found if user absent. '
  'Step 3 (auth user ban + email anonymisation) is performed separately by the Edge Function. '
  'DPDPA 2023 §5 completeness requirement.';
