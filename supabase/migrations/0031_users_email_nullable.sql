-- Migration 0031: allow public.users.email to be NULL
-- Fixes a bug where perform_user_erasure() (migration 0007) has been unable to
-- succeed since migration 0001 first created this column as NOT NULL — every
-- erasure call fails with 23502 (not_null_violation). Migration 0005's own
-- comment on public.users.deleted_at already documented the intended design:
-- "email and auth identity are nulled alongside [deleted_at] being set" — the
-- column constraint was simply never updated to match. DPDPA 2023 §5.

ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;
