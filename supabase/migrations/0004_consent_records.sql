-- Migration 0004: consent_records table + user_consent_status view (Story 3.2)
-- FR-DPO-04: all inserts via supabase/functions/consent-record only. No app-level INSERT policy by design.
-- NFR-SEC-03: four mandatory fields — timestamp_utc, purpose_id, consent_version, withdrawal_status
-- Retention: account lifetime + 2 years post-deletion (NOT subject to 30-day soft-delete erasure in Story 3.3)

CREATE TABLE IF NOT EXISTS public.consent_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp_utc    TIMESTAMPTZ NOT NULL,
  purpose_id       TEXT        NOT NULL,
  consent_version  TEXT        NOT NULL,
  withdrawal_status BOOLEAN    NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Latest consent record per user per purpose (used by Story 3.3 DPO operator panel)
-- security_invoker ensures the underlying consent_records RLS policies apply when
-- this view is queried directly via PostgREST (prevents cross-user data exposure).
CREATE OR REPLACE VIEW public.user_consent_status WITH (security_invoker = true) AS
  SELECT DISTINCT ON (user_id, purpose_id) *
  FROM public.consent_records
  ORDER BY user_id, purpose_id, timestamp_utc DESC, created_at DESC, id DESC;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Own-row read: authenticated user can read their own consent records
CREATE POLICY "consent_records_own_row_read"
  ON public.consent_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for authenticated or anon roles.
-- Direct INSERT from app code is blocked by design (FR-DPO-04).
-- Only the service_role client used by the consent-record Edge Function can INSERT.
