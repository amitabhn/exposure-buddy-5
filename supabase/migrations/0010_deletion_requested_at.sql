-- deletion_requested_at: set by /dpo/request-deletion Edge Function when user submits account deletion request. Queried by DPO panel to surface pending erasure requests.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
