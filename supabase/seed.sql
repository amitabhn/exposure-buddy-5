-- Supabase seed data
-- Populated in later stories (Epic 2+) once auth and roles are defined

-- ── DPO Operator Seed (Story 3.4) ─────────────────────────────────────────────────────────────
-- Seeding a DPO operator requires TWO steps — the auth user MUST be created first via the
-- Supabase Admin API (cannot be done in SQL alone). Follow the steps below in order:
--
-- STEP 1: Create the auth user via Admin API (run this curl before applying seed.sql):
--
--   curl -X POST http://localhost:54321/auth/v1/admin/users \
--     -H "apikey: <service_role_key>" \
--     -H "Authorization: Bearer <service_role_key>" \
--     -H "Content-Type: application/json" \
--     -d '{"email":"dpo@example.com","password":"dpo-operator-pass!","app_metadata":{"role":"dpo_operator"},"email_confirm":true}'
--
--   The response contains a "id" field — copy that UUID into the INSERT below.
--
-- STEP 2: Replace <auth-user-uuid> with the UUID returned by the Admin API call above,
--         then run supabase db reset (or execute this INSERT manually):
--
INSERT INTO public.dpo_operators (id, email, name, active)
VALUES ('<auth-user-uuid>', 'dpo@example.com', 'DPO Admin', true)
ON CONFLICT (email) DO NOTHING;
--
-- NOTE: The seed UUID must match the auth.users.id created by the Admin API call.
-- An orphaned row (mismatched UUID) would allow the email-based login check to pass
-- but produce an acting_operator_id in dpo_audit_log with no corresponding operator row.
