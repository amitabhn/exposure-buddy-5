-- Enable RLS on dpo_operators.
-- No policies needed: all legitimate access goes through Edge Functions that use the
-- service role key, which bypasses RLS. Without this, the anon/authenticated roles
-- could enumerate operator identities via the public REST API — a DPDPA violation.
ALTER TABLE public.dpo_operators ENABLE ROW LEVEL SECURITY;
