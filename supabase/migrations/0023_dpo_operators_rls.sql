-- Enable RLS on dpo_operators and fix missing grants from migration 0009.
--
-- Grant model:
--   service_role — SELECT only (Edge Functions use adminClient to verify operator rows).
--   anon/authenticated — no grants (intentional: blocked at grant level, not just RLS).
--
-- Without RLS, anon/authenticated could enumerate operator identities via the public
-- REST API — a DPDPA violation. service_role SELECT was also missing, meaning
-- dpo-login and dpo-audit-log Edge Functions were relying on the postgres owner role
-- rather than the correct service_role path through PostgREST.
ALTER TABLE public.dpo_operators ENABLE ROW LEVEL SECURITY;

-- SELECT: Edge Functions verify operator rows (dpo-login, dpo-audit-log).
-- INSERT, DELETE: seeding and test teardown run as service_role via adminClient.
-- UPDATE is intentionally omitted — operator rows are immutable after seeding.
GRANT SELECT, INSERT, DELETE ON public.dpo_operators TO service_role;
