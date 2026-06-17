-- Story 6.2-C AC 2 (D6): atomic server-side reorder RPC.
--
-- The existing reorder path produces two independent UPDATE ... WHERE id = ?
-- statements that reach Supabase as two separate REST calls — uq_user_position's
-- DEFERRABLE INITIALLY DEFERRED check only helps within a single server-side
-- transaction, which two separate PostgREST requests do not share. This function
-- wraps both UPDATEs in its own implicit transaction so the deferred check actually
-- defers across both statements.
--
-- SECURITY INVOKER (not DEFINER) — runs with the caller's own privileges so RLS still
-- applies to the underlying table reads/writes as defense-in-depth. The explicit
-- auth.uid() ownership check exists because a silently-RLS-filtered 0-row UPDATE would
-- otherwise look like success.

CREATE OR REPLACE FUNCTION public.swap_ladder_positions(
  p_item_a_id UUID,
  p_item_a_new_position INT,
  p_item_b_id UUID,
  p_item_b_new_position INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner_a UUID;
  v_owner_b UUID;
BEGIN
  IF p_item_a_id = p_item_b_id THEN
    RAISE EXCEPTION 'swap_ladder_positions: item_a and item_b must differ';
  END IF;

  SELECT user_id INTO v_owner_a FROM public.fear_ladder_items WHERE id = p_item_a_id;
  SELECT user_id INTO v_owner_b FROM public.fear_ladder_items WHERE id = p_item_b_id;

  IF v_owner_a IS NULL OR v_owner_b IS NULL THEN
    RAISE EXCEPTION 'swap_ladder_positions: one or both items not found';
  END IF;

  IF v_owner_a IS DISTINCT FROM auth.uid() OR v_owner_b IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'swap_ladder_positions: auth.uid() does not own both items';
  END IF;

  UPDATE public.fear_ladder_items SET position = p_item_a_new_position, updated_at = now() WHERE id = p_item_a_id;
  UPDATE public.fear_ladder_items SET position = p_item_b_new_position, updated_at = now() WHERE id = p_item_b_id;
END;
$$;

-- Supabase does not auto-grant EXECUTE on plain-SQL-migration-created functions
-- (this is exactly why migration 0024 exists as a project-wide backfill for tables).
GRANT EXECUTE ON FUNCTION public.swap_ladder_positions(UUID, INT, UUID, INT) TO authenticated;
