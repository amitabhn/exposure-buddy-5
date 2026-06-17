-- Story 6.2-A: narrow status to MVP values; add deferrable position uniqueness

BEGIN;

-- Step 1: backfill any in_progress rows to pending before narrowing the constraint
UPDATE public.fear_ladder_items SET status = 'pending' WHERE status = 'in_progress';

-- Step 2: drop the auto-generated status check from migration 0013
ALTER TABLE public.fear_ladder_items DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check;

-- Step 3: named constraint — only 'pending' and 'completed' permitted
ALTER TABLE public.fear_ladder_items
  ADD CONSTRAINT check_status CHECK (status IN ('pending', 'completed'));

-- Step 4: deferrable position uniqueness — allows bulk reorder swaps within a transaction
ALTER TABLE public.fear_ladder_items
  ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED;

COMMIT;
