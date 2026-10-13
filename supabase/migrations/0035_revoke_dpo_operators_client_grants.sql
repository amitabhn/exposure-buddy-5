-- Migration 0035: revoke client-role privileges on dpo_operators
--
-- Migration 0023 set out to block anon/authenticated at grant level ("no grants") and only
-- ever granted to service_role (its statement is GRANT SELECT, INSERT, DELETE; the header's
-- "SELECT only" is stale). It never revoked anything. Supabase's default privileges on the
-- public schema give anon and authenticated every privilege on every new table, so the
-- table was only gated by RLS: with RLS on and no policy a read returned an empty result
-- instead of the 42501 (insufficient_privilege) the grant model intends, and TRUNCATE,
-- which RLS does not cover, was granted as well.
--
-- Revoking here makes 0023's stated model true. service_role keeps its privileges (the
-- dpo-login / dpo-audit-log Edge Functions and test seeding depend on them). On a stack
-- without those default privileges (pre-Postgres-17 local stacks, see 0024) this is a no-op.
--
-- Scope: dpo_operators only. The other public tables carry the same default grants; that
-- wider hardening is tracked in deferred-work.md.

REVOKE ALL ON public.dpo_operators FROM PUBLIC, anon, authenticated;
