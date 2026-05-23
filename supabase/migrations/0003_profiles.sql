-- Migration 0003: profiles table (Story 2.1)
-- User metadata table — distinct from public.users (auth linkage)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Own-row read: authenticated user can read their own profile
CREATE POLICY "profiles_own_row_read"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Own-row insert: authenticated user can insert their own profile
CREATE POLICY "profiles_own_row_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Own-row update: authenticated user can update their own profile
CREATE POLICY "profiles_own_row_update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Cross-user reads: blocked by default (no SELECT policy for other users' rows)
-- Unauthenticated reads: blocked by default (auth.uid() returns NULL, USING fails)

-- Clinician path (ARC-007): therapist_patient join policy deferred to Epic 5
