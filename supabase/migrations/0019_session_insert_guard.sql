-- Guard: enforce server-authoritative invariants on exposure_sessions INSERT.
-- Spec: expires_at is NEVER client-computed (server trigger sets it on completion).
-- Spec: only valid initial status is 'started' (state machine begins at idle→pre_session).
-- Without this trigger, the INSERT RLS policy (auth.uid() = user_id) would allow
-- a client to bypass these invariants by supplying expires_at or status on INSERT.

CREATE OR REPLACE FUNCTION public.fn_session_insert_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.expires_at := NULL;      -- always NULL on INSERT; set by set_session_expires_at trigger on completion
  NEW.status     := 'started'; -- only valid initial state; transitions enforced by app state machine
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_session_insert_guard
  BEFORE INSERT ON public.exposure_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_session_insert_guard();
