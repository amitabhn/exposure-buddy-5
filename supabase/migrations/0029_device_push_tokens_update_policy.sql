-- Adds the UPDATE policy deliberately omitted from 0028_device_push_tokens.sql.
-- registerPushToken() (packages/supabase) calls .upsert(..., { onConflict: 'token' }),
-- which compiles to INSERT ... ON CONFLICT (token) DO UPDATE. Postgres RLS checks the
-- UPDATE policy on that conflict branch even though application code never issues a
-- bare UPDATE — with zero UPDATE policies, every re-registration of an existing token
-- (every AC4 foreground refresh) failed with a 42501 row-level-security violation.
-- Scoped identically to the existing INSERT/SELECT-own policies: USING gates which
-- existing row is visible to the conflict check (blocks a cross-user upsert against a
-- token owned by someone else), WITH CHECK gates the new row values being written.
CREATE POLICY "device_push_tokens_update_own"
  ON public.device_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
