-- Backfill standard PostgREST grants missing from all prior migrations.
--
-- Supabase auto-applies GRANT SELECT,INSERT,UPDATE,DELETE to anon, authenticated,
-- and service_role for tables created via the dashboard, but migrations that run
-- plain CREATE TABLE do not receive these grants. After every `supabase db reset`
-- the RLS integration tests fail with 42501 because the grants were never written
-- into any migration file.
--
-- Grant model per table:
--   user-facing tables         → anon + authenticated + service_role get full CRUD
--                                (RLS policies enforce row-level access control)
--   dpo_audit_log              → same; DELETE/UPDATE trigger exceptions enforce
--                                immutability at the DB level regardless of grants
--   analytics_events (stub)    → same; no live data written yet
--   therapist_patient_*        → same; deferred post-MVP but grants needed for reset
--   dpo_operators              → intentionally excluded — anon/authenticated have no
--                                SELECT grant (defence-in-depth set in migration 0023)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users                          TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles                       TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_records                TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dpo_audit_log                  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding_metadata       TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fear_ladder_items              TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_patient_relationships TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exposure_sessions              TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suds_readings                  TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events               TO anon, authenticated, service_role;
