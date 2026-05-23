-- Migration 0002: Row Level Security for users table (ARC-006, ARC-007)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Own-row read: authenticated user can read their own row
CREATE POLICY "users_own_row_read"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Own-row update: authenticated user can update their own row
CREATE POLICY "users_own_row_update"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Own-row insert: authenticated user can insert their own row
CREATE POLICY "users_own_row_insert"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cross-user reads: blocked by default — no SELECT policy for other users' rows
-- Unauthenticated reads: blocked by default — auth.uid() returns NULL, USING fails

-- Clinician path (ARC-007): therapist_patient join policy deferred to Epic 5
-- Placeholder: clinician reads own patient rows via therapist_patient table (not yet created)
