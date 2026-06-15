-- Technique selected before each ERP session (Story 6.1 — FR-SESSION-04)
ALTER TABLE public.exposure_sessions
  ADD COLUMN technique text
  CHECK (technique IN ('somatic', 'breathing', 'cognitive'));
