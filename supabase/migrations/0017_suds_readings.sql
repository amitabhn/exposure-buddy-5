CREATE TABLE IF NOT EXISTS public.suds_readings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID    NOT NULL REFERENCES public.exposure_sessions(id) ON DELETE CASCADE,
  suds_value  INT     NOT NULL CHECK (suds_value >= 0 AND suds_value <= 10),
  recorded_at TIMESTAMPTZ DEFAULT now()
  -- NO user_id column: access controlled via session_id → exposure_sessions join
);

ALTER TABLE public.suds_readings ENABLE ROW LEVEL SECURITY;

-- RLS via join: user can read/write readings for sessions they own
CREATE POLICY "suds_readings_own_session"
  ON public.suds_readings FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.exposure_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.exposure_sessions WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.suds_readings IS
  'Distress readings logged during an ERP session. user_id deliberately absent — access via exposure_sessions FK (see RLS policy). Story 5.3 records debrief (final) reading.';
