-- Adds the UPDATE policy deliberately omitted from 0012_user_onboarding_metadata.sql ("write-once").
-- The PowerSync connector (packages/sync/src/connector.ts, ON_CONFLICT_OVERRIDES) uploads this
-- table with .upsert(..., { onConflict: 'user_id' }), i.e. INSERT ... ON CONFLICT (user_id)
-- DO UPDATE — exactly what 0012's table comment prescribes. Postgres RLS checks the UPDATE
-- policy on the conflict branch, so with zero UPDATE policies every second write for a user who
-- already has a row (a repeated assessment, e.g. onboarding redone after a reinstall) failed
-- with 403 / 42501. PowerSync retries a failing upload forever, so that one write stalled the
-- whole upload queue and nothing after it (ladder items, sessions, reorders) ever synced.
-- Latest calibration wins: the owner may update their own row. Scoped like 0029's
-- device_push_tokens policy — USING gates which existing row the conflict check can see
-- (blocks a cross-user upsert against another user's row), WITH CHECK gates the written values
-- (blocks reassigning user_id). No DELETE policy is added; DELETE stays denied.
DROP POLICY IF EXISTS "user_onboarding_metadata_update_own" ON public.user_onboarding_metadata;
CREATE POLICY "user_onboarding_metadata_update_own"
  ON public.user_onboarding_metadata FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_onboarding_metadata IS
  'Stores per-user onboarding calibration data. suds_calibration_value written during Story 4.2 psychoeducation step. One row per user enforced by UNIQUE(user_id). Latest calibration wins: the owner may update their own row (migration 0034), so the outbox adapter''s ON CONFLICT (user_id) DO UPDATE upsert converges for retries and for a repeated assessment.';
