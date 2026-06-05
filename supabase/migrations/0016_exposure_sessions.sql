CREATE TABLE IF NOT EXISTS public.exposure_sessions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fear_item_id            UUID        REFERENCES public.fear_ladder_items(id) ON DELETE SET NULL,
  session_type            TEXT        NOT NULL DEFAULT 'erp' CHECK (session_type IN ('erp')),
  status                  TEXT        NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  pre_session_intention   TEXT,
  post_session_reflection TEXT,
  started_at              TIMESTAMPTZ DEFAULT now(),
  ended_at                TIMESTAMPTZ,
  expires_at              BIGINT,     -- epoch ms; set by trigger on completion; never client-set
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Composite index for RLS subquery performance (suds_readings policy joins here)
CREATE INDEX idx_exposure_sessions_user_id_id ON public.exposure_sessions (user_id, id);

ALTER TABLE public.exposure_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exposure_sessions_select_own"
  ON public.exposure_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exposure_sessions_insert_own"
  ON public.exposure_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exposure_sessions_update_own"
  ON public.exposure_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No DELETE policy — sessions are never deleted by the app

COMMENT ON TABLE public.exposure_sessions IS
  'ERP exposure session records. expires_at set by set_session_expires_at trigger on completion (6h window). Clinician read policy deferred to Story 5.4.';
