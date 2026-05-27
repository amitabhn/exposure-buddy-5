-- Migration 0005: Consent records retention fix + soft-delete column (Story 3.3)
-- D0 HARD GATE: Changes consent_records.user_id FK from ON DELETE CASCADE to ON DELETE SET NULL
-- so that consent records survive user deletion (DPDPA 2023 §8(7): retain for account lifetime + 2 years).
-- Also adds deleted_at column to public.users for soft-delete tracking.

-- Drop the existing CASCADE FK and replace with SET NULL
ALTER TABLE public.consent_records
  DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey;

ALTER TABLE public.consent_records
  ADD CONSTRAINT consent_records_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Allow user_id to be NULL (orphaned rows after auth user deletion)
ALTER TABLE public.consent_records
  ALTER COLUMN user_id DROP NOT NULL;

-- Add soft-delete marker to public.users
-- deleted_at: set by /dpo/erase-user Edge Function during DPDPA erasure.
-- email and auth identity are nulled alongside this being set.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.deleted_at IS
  'DPDPA soft-delete marker. Set by /dpo/erase-user Edge Function. '
  'email nulled simultaneously. Auth user banned via Supabase Auth admin API.';

COMMENT ON CONSTRAINT consent_records_user_id_fkey ON public.consent_records IS
  'ON DELETE SET NULL: consent records must survive user deletion per DPDPA 2023 §8(7). '
  'Rows become orphaned (user_id = NULL) — intentional, not a data integrity error.';
