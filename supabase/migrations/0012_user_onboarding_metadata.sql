CREATE TABLE IF NOT EXISTS public.user_onboarding_metadata (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suds_calibration_value INT NOT NULL CHECK (suds_calibration_value >= 0 AND suds_calibration_value <= 10),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_onboarding_metadata ENABLE ROW LEVEL SECURITY;

-- Authenticated user can read their own row
CREATE POLICY "user_onboarding_metadata_select_own"
  ON public.user_onboarding_metadata FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated user can insert their own row
CREATE POLICY "user_onboarding_metadata_insert_own"
  ON public.user_onboarding_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — calibration is write-once via PowerSync outbox
-- No DELETE policy — explicitly denied for all roles (no permissive DELETE policy)

COMMENT ON TABLE public.user_onboarding_metadata IS
  'Stores per-user onboarding calibration data. suds_calibration_value written during Story 4.2 psychoeducation step. One row per user enforced by UNIQUE(user_id). Epic 6 outbox adapter must use ON CONFLICT (user_id) DO UPDATE for retry idempotency.';
