CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token          TEXT        NOT NULL,
  platform       TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_push_token ON public.device_push_tokens (token);

-- Matches the RLS SELECT policy's filter column, per the 0016_exposure_sessions.sql precedent
CREATE INDEX idx_device_push_tokens_user_id ON public.device_push_tokens (user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_push_tokens_select_own"
  ON public.device_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "device_push_tokens_insert_own"
  ON public.device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policy — client-side UPDATE/DELETE is blocked by RLS (no policy = denied).
-- Token pruning (Stories 8.3/8.4) is service_role-only and bypasses RLS entirely.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO anon, authenticated, service_role;

COMMENT ON TABLE public.device_push_tokens IS
  'Per-device Expo push tokens for notification delivery. Upserted on token (onConflict), one row per device. Pruned by service_role Edge Functions on DeviceNotRegistered signal (Stories 8.3/8.4), never by clients.';
