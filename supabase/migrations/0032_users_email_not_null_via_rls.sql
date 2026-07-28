-- Migration 0032: prevent self-service email nulling via RLS
-- Migration 0031 dropped the NOT NULL constraint on public.users.email so
-- perform_user_erasure() (migration 0007) can succeed. But users_own_row_update
-- (migration 0002) has USING (auth.uid() = id) with no WITH CHECK, and
-- authenticated has a table-level UPDATE grant covering all columns
-- (migration 0024) — so any signed-in user could set their own email to NULL
-- directly, producing a state indistinguishable from real DPDPA erasure with
-- no audit-log entry, no operator authorization, and no auth ban.
--
-- service_role bypasses RLS entirely (BYPASSRLS), so this does not affect the
-- real erasure path (dpo-erase-user's admin client, perform_user_erasure()).

ALTER POLICY "users_own_row_update"
  ON public.users
  WITH CHECK (email IS NOT NULL);
