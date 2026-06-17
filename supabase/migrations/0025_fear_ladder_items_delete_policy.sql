-- Story 6.2-C AC 1: authenticated-owner DELETE RLS policy on fear_ladder_items.
-- Migration 0013's "items are never deleted" comment is now historically stale —
-- this story (Ladder Item Delete) makes hard delete a supported user action.

DROP POLICY IF EXISTS "fear_ladder_items_delete_own" ON public.fear_ladder_items;
CREATE POLICY "fear_ladder_items_delete_own"
  ON public.fear_ladder_items FOR DELETE
  USING (auth.uid() = user_id);
