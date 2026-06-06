CREATE TABLE IF NOT EXISTS public.suds_readings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID    NOT NULL REFERENCES public.exposure_sessions(id) ON DELETE CASCADE,
  suds_value  INT     NOT NULL CHECK (suds_value >= 0 AND suds_value <= 10),
  recorded_at TIMESTAMPTZ DEFAULT now()
  -- NO user_id column: access controlled via session_id → exposure_sessions join
);

-- Index for RLS subquery performance (policy filters on session_id)
CREATE INDEX idx_suds_readings_session_id ON public.suds_readings (session_id);

ALTER TABLE public.suds_readings ENABLE ROW LEVEL SECURITY;

-- DECISION: suds_readings are append-only (immutable at row level).
-- Rationale: preserves habituation curve integrity (ERP therapeutic model); a user
-- deleting their peak reading would silently reshape their anxiety arc.
-- Correction path: INSERT a new reading (single-entry submit is already the app's shape).
-- Fat-finger UX improvement (in-session undo): deferred to a future story.
-- DPDPA account erasure: handled by FK CASCADE chain auth.users → exposure_sessions → suds_readings.

CREATE POLICY "suds_readings_select_own"
  ON public.suds_readings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exposure_sessions es
      WHERE es.id = suds_readings.session_id
        AND es.user_id = auth.uid()
    )
  );

CREATE POLICY "suds_readings_insert_own"
  ON public.suds_readings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exposure_sessions es
      WHERE es.id = suds_readings.session_id
        AND es.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.suds_readings IS
  'Distress readings logged during an ERP session. user_id deliberately absent — access via exposure_sessions FK (see RLS policy). Append-only: no UPDATE or DELETE policies. Story 5.3 records debrief (final) reading.';
