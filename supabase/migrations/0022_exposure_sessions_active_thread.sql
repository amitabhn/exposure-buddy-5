-- Story 6.2-A: enforce one active thread per user per fear item (FR-HOME-03)

BEGIN;

-- Pre-cleanup: resolve any existing duplicates (keep most recent, abandon others)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, fear_item_id ORDER BY started_at DESC NULLS LAST, id DESC) AS rn
  FROM public.exposure_sessions
  WHERE status = 'started'
)
UPDATE public.exposure_sessions
  SET status = 'abandoned'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Partial unique index: only one 'started' row per (user_id, fear_item_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_thread
  ON public.exposure_sessions (user_id, fear_item_id)
  WHERE status = 'started';

COMMIT;
