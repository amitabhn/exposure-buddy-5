CREATE TABLE IF NOT EXISTS public.therapist_patient_relationships (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_user_id  UUID    NOT NULL,
  patient_user_id    UUID    NOT NULL,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- RLS enabled with no permissive policies (default deny) until Epic 5 Story 5.4 activates
-- the join-based clinician policy. Stub exists solely to unblock fear_ladder_items clinician
-- read path without a retroactive migration. No data is seeded.
ALTER TABLE public.therapist_patient_relationships ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.therapist_patient_relationships IS
  'Stub: unblocks Epic 5 clinician RLS policy. No data at MVP. Epic 5 Story 5.4 activates.';
