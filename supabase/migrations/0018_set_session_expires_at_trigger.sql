CREATE OR REPLACE FUNCTION public.set_session_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.expires_at := EXTRACT(EPOCH FROM now())::bigint * 1000 + 21600000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_expires_at
  BEFORE UPDATE ON public.exposure_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_session_expires_at();
