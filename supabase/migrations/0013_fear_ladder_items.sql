CREATE TABLE IF NOT EXISTS public.fear_ladder_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  predicted_suds INT       NOT NULL CHECK (predicted_suds >= 0 AND predicted_suds <= 10),
  actual_suds  INT         CHECK (actual_suds IS NULL OR (actual_suds >= 0 AND actual_suds <= 10)),
  position     INT         NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fear_ladder_items ENABLE ROW LEVEL SECURITY;

-- Authenticated user can read their own rows
CREATE POLICY "fear_ladder_items_select_own"
  ON public.fear_ladder_items FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated user can insert their own rows
CREATE POLICY "fear_ladder_items_insert_own"
  ON public.fear_ladder_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated user can update their own rows
CREATE POLICY "fear_ladder_items_update_own"
  ON public.fear_ladder_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — items are never deleted (status transitions cover the lifecycle)
-- Clinician read policy: deferred to Epic 5 Story 5.4 via therapist_patient_relationships join

COMMENT ON TABLE public.fear_ladder_items IS
  'User fear hierarchy items. description stored unencrypted — see docs/decisions/adr-fear-ladder-description-encryption.md. actual_suds renamed to peak_suds in Epic 5 migration.';
