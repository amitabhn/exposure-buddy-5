CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  session_token TEXT,        -- SHA-256(session_id), irreversible; no raw session_id
  user_pseudonym TEXT,       -- SHA-256(user_id), irreversible; enables user-level Day-1 retention
                             -- queries in Phase 2 (FR-ANALYTICS-01) without storing raw user_id
  device_context JSONB,      -- device type, OS version, app version only; no PII
  created_at TIMESTAMPTZ DEFAULT now(),
  -- MVP: no event_type values are approved (FR-ANALYTICS-BOUNDARY-01).
  -- Phase 1 analytics_events table is a schema stub only — no writes permitted.
  -- CHECK (false) blocks inserts for ALL roles, including service_role.
  -- To add an approved event_type in Phase 2, create a new migration that:
  --   (1) DROPs this constraint, and (2) adds CHECK (event_type IN (...)) with
  --   only the explicitly approved values. The Phase 2 migration requires sign-off from:
  --   (a) lead clinician (clinical necessity test)
  --   (b) data controller / DPO (DPDPA purpose limitation test)
  -- Candidate event types are documented in the epics spec, not here.
  CONSTRAINT analytics_events_event_type_mvp_stub CHECK (false)
);

-- Deny all access to authenticated and anon roles via RLS (no permissive policies).
-- Note: service_role bypasses RLS policies but NOT CHECK constraints —
-- the CHECK (false) above blocks inserts for all roles including service_role.
-- No SELECT policy is intentional: there is nothing to read at MVP and
-- Phase 2 analytics reads will be service_role only anyway.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.analytics_events IS 'Phase 1 schema stub. No inserts permitted (CHECK false). RLS enabled, no policies — deny-all for authenticated/anon. See FR-ANALYTICS-BOUNDARY-01 for Phase 2 approval process.';
