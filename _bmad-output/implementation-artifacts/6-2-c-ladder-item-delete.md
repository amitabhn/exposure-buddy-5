# Story 6.2-C: Ladder Item Delete

**Status:** done

## Story

As a user who no longer wants to work on a particular fear,
I want to permanently remove it from my Courage Ladder,
So that my ladder only reflects fears I'm actually committed to facing (epics.md Story 6.2 AC 7).

*Splits from: original Story 6.2 (rejected 2026-06-16, party-mode roundtable). Depends on: Story 6.2-A merged ✅ (PR #39). Parallel-safe with Story 6.2-B (merged ✅) — no shared files.*
*This story resolves decision-needed items D6, D7, D8(b), and D13 from the rejected 6.2 spec's review (`_bmad-output/implementation-artifacts/_archive/6-2-rejected.md` lines 805–931). Read that "Recommended Redraft Plan" section before starting — it is the authoritative design rationale for every AC below.*

---

## Acceptance Criteria

### AC 1 — `fear_ladder_items` gains an authenticated-owner DELETE RLS policy

**Given** `fear_ladder_items` (migration 0013) currently has SELECT/INSERT/UPDATE policies but explicitly no DELETE policy (migration 0013's comment "items are never deleted" is now historically stale — this story makes it false)
**When** the migration for this story runs
**Then** an idempotent migration adds:
```sql
DROP POLICY IF EXISTS "fear_ladder_items_delete_own" ON public.fear_ladder_items;
CREATE POLICY "fear_ladder_items_delete_own"
  ON public.fear_ladder_items FOR DELETE
  USING (auth.uid() = user_id);
```
A user can delete their own row; a cross-user DELETE attempt affects 0 rows (RLS filters it silently — Postgres does not error on a DELETE that matches 0 rows).

### AC 2 — `swap_ladder_positions` RPC makes reorder atomic on the server (D6)

**Given** the current reorder path produces two independent `UPDATE ... WHERE id = ?` statements that reach Supabase as two separate REST calls (no transaction across the wire — `uq_user_position DEFERRABLE INITIALLY DEFERRED` only helps within a single server-side transaction, which two separate PostgREST requests do not share)
**When** the migration for this story runs
**Then** a new Postgres function exists:
```sql
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

GRANT EXECUTE ON FUNCTION public.swap_ladder_positions(UUID, INT, UUID, INT) TO authenticated;
```
Both UPDATEs run inside the function's implicit transaction — the swap is atomic; `uq_user_position`'s deferred check now actually defers across both statements instead of being a no-op across two separate requests. `SECURITY INVOKER` (not `DEFINER`) — the function runs with the caller's own privileges; the explicit ownership check exists because a silently-RLS-filtered 0-row UPDATE would otherwise look like success. The `GRANT EXECUTE ... TO authenticated` line is required — this project's migration 0024 exists specifically because Supabase does NOT auto-grant on objects created via plain SQL migrations; do not skip this line or `supabase.rpc()` calls from authenticated clients will fail with a permissions error. The `p_item_a_id = p_item_b_id` guard exists because passing the same item twice would otherwise let the second UPDATE silently overwrite the first with no error.

**Error-type discrimination (connector-side, AC 3):** this function raises two distinct application-level errors — `'one or both items not found'` (e.g. one item was deleted between the local reorder and the upload — see AC 3's in-flight-pair note) and `'auth.uid() does not own both items'`. Both are terminal/non-retryable: retrying the same RPC call with the same arguments will fail identically every time. `connector.ts`'s `uploadData` MUST NOT let either propagate as a bare `throw` that triggers PowerSync's whole-batch retry — a non-retryable error retried forever blocks all future sync uploads. Network-level failures (timeout, connection drop) are retryable and should still `throw` to preserve PowerSync's existing retry-on-throw contract.

### AC 3 — `connector.ts` detects a reorder pair and calls the RPC instead of two PATCHes (D6, client side)

**Given** `packages/sync/src/adapter.ts`'s `_reorder` (existing, unchanged by this story) wraps both position UPDATEs in a single `db.writeTransaction(...)` call, and PowerSync's native SQLite extension assigns the same `transactionId` to every `ps_crud` row written within one SQLite transaction (verified directly against the installed `@powersync/common@1.53.1` source: `CrudEntry.fromRow` reads `transactionId` from `ps_crud.tx_id`, which `SqliteBucketStorage.getCrudBatch` populates per-row from the native trigger — see `node_modules/.pnpm/@powersync+common@1.53.1/node_modules/@powersync/common/lib/client/sync/bucket/CrudEntry.js`)
**When** `SupabasePowerSyncConnector.uploadData` (`packages/sync/src/connector.ts`) processes a batch
**Then** before falling back to the existing per-entry `_uploadEntry` loop, `uploadData` groups `batch.crud` by `transactionId` and detects a "reorder pair": exactly two entries that share a defined `transactionId`, are both `op === UpdateType.PATCH`, are both `table === 'fear_ladder_items'`, and both have `opData?.position` set to a finite `number` (validate with `typeof opData.position === 'number' && Number.isFinite(opData.position)` — a malformed/null/string position must not reach the RPC). For a detected pair, it calls:
```ts
this.supabase.rpc('swap_ladder_positions', {
  p_item_a_id: entryA.id,
  p_item_a_new_position: entryA.opData!['position'],
  p_item_b_id: entryB.id,
  p_item_b_new_position: entryB.opData!['position'],
})
```
exactly once for the pair (not two `.update()` calls). **Fallback rule:** any `transactionId` group that does not exactly match this 2-entry shape — including groups of 3+ entries sharing a `transactionId`, and groups mixing a `DELETE` with a `PATCH` — is NOT treated as a reorder pair; every entry in such a group falls through to the existing `_uploadEntry` per-entry path unchanged, same as ungrouped or solo-transaction entries. All other entries (including ungrouped or solo-transaction PATCHes, PUTs, DELETEs) continue through the existing `_uploadEntry` per-entry path unchanged. If the RPC call returns a non-retryable application error (see AC 2's error-type discrimination note — e.g. one of the paired items was deleted before this batch uploaded, surfacing as `'one or both items not found'`), `uploadData` must not let it propagate as a bare `throw`; only retryable network-level failures should `throw` (same retry semantics as today — PowerSync retries the whole batch).

### AC 4 — "Remove item" hard-deletes through the existing ARC-005 adapter path, no manual optimistic state (D7)

**Given** ARC-005 mandates all durable writes from `apps/mobile` go through `getAdapter()` — a `no-restricted-imports` ESLint rule in `apps/mobile/.eslintrc.js` already blocks any direct `@powersync/react-native`/`@powersync/common` import from `apps/mobile`, and `PowerSyncSyncAdapter.enqueue(..., 'DELETE', ...)` (`packages/sync/src/adapter.ts:56-57`, unchanged by this story) already does exactly `this.db.execute('DELETE FROM ${table} WHERE id = ?', [p['id']])`
**When** the user confirms removal of a ladder item in `apps/mobile/app/ladder.tsx`
**Then** `handleConfirmDelete(item)` calls only:
```ts
await getAdapter().enqueue('fear_ladder_items', 'DELETE', { id: item.id })
```
No `setItems(prev => prev.filter(...))` optimistic mutation is added for delete. The screen's existing `useEffect(() => setItems([...remoteItems].sort(...)), [remoteItems])` (line 50-52, unchanged) already re-syncs `items` from `useFearLadderItems`'s reactive `useQuery` the moment the local SQLite DELETE commits — PowerSync's native trigger writes the row deletion and its `ps_crud` entry atomically in the same SQLite transaction, so the UI reflects the removal effectively instantly without a manual optimistic flag. **Do not call `db.execute` directly from `ladder.tsx`** — that would violate ARC-005 and fail the ESLint boundary check; the existing `getAdapter().enqueue(...)` path already achieves the durability guarantee D7 describes, because `packages/sync` (not `apps/mobile`) is the one calling `db.execute`.

### AC 5 — Remove action is gated behind a confirmation with DPDPA-appropriate gravity copy (D13)

**Given** Sally's (UX) explicit redraft of the confirmation copy supersedes the placeholder text in epics.md line 1336 ("Remove this item from your ladder?")
**When** the user taps "Remove item" inside the edit modal
**Then** a native `Alert.alert` shows with:
- title: `t('ladder.delete.confirmTitle')` (canonical English: "Remove item?")
- message: `t('ladder.delete.confirmMessage')` (canonical English: "This fear and all your progress on it will be permanently removed.")
- two buttons: Cancel (`style: 'cancel'`, label `t('ladder.cancel')` — reuse the existing key, do not add a duplicate) and Remove (`style: 'destructive'`, label `t('ladder.delete.confirmButton')`, canonical English: "Remove")

Tapping Cancel calls no enqueue. Tapping Remove calls `handleConfirmDelete` (AC 4). Swipe-to-delete is explicitly out of scope (epics.md line 1336: "swipe-to-delete is not required — the in-modal button is the sole delete affordance at this story").

### AC 6 — Remove is disabled while the user has any active exposure session (D8b)

**Given** `apps/mobile/src/hooks/useActiveExposureSession.ts` (built in Story 6.2-B, merged) already exposes `{ activeSession: { id, fearItemId, startedAt } | null, isLoading }` via a `useQuery` against `exposure_sessions WHERE status = 'started'`, intentionally NOT scoped to a single fear item
**When** `ladder.tsx` renders the edit modal's "Remove item" button
**Then** `ladder.tsx` calls `useActiveExposureSession(userId)` (same hook, same call signature as `apps/mobile/app/(app)/index.tsx` already uses) and disables the Remove button (`accessibilityState={{ disabled: true }}`, no `onPress` effect) whenever `activeSession !== null` **or `isLoading === true`** — the guard must fail closed while the query is still resolving, not just once it returns a non-null session, otherwise a tap during the loading window slips past the D8b guard entirely. This is regardless of which fear item the active session belongs to — matching the rejected spec's literal guard condition ("the current user has an `exposure_sessions` row with `status='started'`"), not a per-item scoped check. When disabled (for either reason), render `t('ladder.delete.guardMessage')` (canonical English: "Finish your current session first.") as a small text line beneath the button so the user understands why it's inert. **A `BEFORE DELETE` database trigger that rejects deletes was explicitly considered and rejected** (D8c) — it would cause PowerSync's `ps_crud` to retry forever and the "deleted" row would silently re-resurrect on the user's screen on the next sync pull, which is worse than the bypass risk. The guard in this AC is UI-only by design; this gap is already filed at `deferred-work.md` line 460 for any future non-UI write path.

### AC 7 — Hard delete writes a DPDPA-compliant audit trail entry, no fear-content text stored (D13)

**Given** `dpo_audit_log` (migration 0006) is append-only, RLS-locked to `service_role` only, and currently constrains `action_type IN ('erasure', 'export', 'audit_view')` (constraint name confirmed against the running local DB: `dpo_audit_log_action_type_check`)
**When** the migration for this story runs
**Then**:
1. The CHECK constraint is widened (DROP + re-ADD, same constraint name, matching the migration 0021 precedent for `fear_ladder_items_status_check`) to `action_type IN ('erasure', 'export', 'audit_view', 'ladder_item_delete')`.
2. A new `SECURITY DEFINER` trigger function (search_path pinned, mirroring `perform_user_erasure`'s pattern in migration 0007) is attached `AFTER DELETE ON public.fear_ladder_items FOR EACH ROW`:
```sql
CREATE OR REPLACE FUNCTION public.fear_ladder_items_delete_audit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dpo_audit_log (action_type, acting_operator_id, target_user_id, outcome, metadata)
  VALUES ('ladder_item_delete', OLD.user_id::text, OLD.user_id, 'success', jsonb_build_object('item_id', OLD.id));
  RETURN OLD;
END;
$$;

CREATE TRIGGER fear_ladder_items_delete_audit_trigger
  AFTER DELETE ON public.fear_ladder_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fear_ladder_items_delete_audit();
```
The `metadata` JSONB contains only `item_id` — never `description` (the fear text itself), satisfying DPDPA §8(7) minimization. `acting_operator_id` is set to the deleted row's own `user_id` (cast to text) because this is a self-service deletion, not a DPO-operator action — there is no separate "operator" in this flow, the user is acting on their own data. `SECURITY DEFINER` is required because the calling role (`authenticated`, via the user's own session) has no INSERT grant on `dpo_audit_log` per migration 0006's design ("All access via Edge Functions... No RLS SELECT/INSERT policies for regular users by design"); the trigger function runs as its owner (bypassing RLS) specifically to bridge this gap. **This trigger must not fail under normal operation** — unlike the rejected `BEFORE DELETE` guard trigger (D8c), this is an `AFTER DELETE` trigger, so if the INSERT itself raised an exception the whole transaction (including the delete) would still roll back and reproduce the same ps_crud-retry-forever failure mode D8c was rejected to avoid. Keep the function trivial and exception-free by construction: widen the CHECK constraint in the same migration *before* creating the trigger, use only columns/values already guaranteed valid (`OLD.user_id` is NOT NULL by the table's own FK constraint), and do not add any conditional logic that could raise.

### AC 8 — All new/changed strings are i18n-gated

**Given** project convention requires every user-facing string to use `t()` (CI lint enforced)
**When** this story adds the four new `ladder.delete.*` keys plus `ladder.removeItem`
**Then** all five keys are added to both `apps/mobile/src/i18n/locales/en.json` and `apps/mobile/src/i18n/locales/hi.json` (Hindi not yet localized for this file — duplicate the English copy in `hi.json`, matching the existing convention for every other key in that file, e.g. `ladder.crisis.*`); no raw string literals appear in any changed component; CI i18n lint passes.

---

## Tasks / Subtasks

### T1 — DELETE RLS policy migration (AC: 1)

- [x] Create `supabase/migrations/0025_fear_ladder_items_delete_policy.sql` with the idempotent `DROP POLICY IF EXISTS` + `CREATE POLICY "fear_ladder_items_delete_own"` from AC 1
- [x] `supabase db reset` locally and confirm the policy exists (`docker exec supabase_db_exposure-buddy psql -U postgres -d postgres -c "SELECT polname FROM pg_policy WHERE polrelid = 'public.fear_ladder_items'::regclass;"` should list 4 policies, including the new DELETE one)

### T2 — `swap_ladder_positions` RPC migration (AC: 2)

- [x] Create `supabase/migrations/0026_swap_ladder_positions_rpc.sql` with the function + `GRANT EXECUTE` from AC 2, including the `p_item_a_id = p_item_b_id` guard
- [x] `supabase db reset` and manually verify via `service_role` client: function exists, raises on identical item ids, raises on non-owned item, swaps atomically on success

### T3 — `dpo_audit_log` delete-audit migration (AC: 7)

- [x] Create `supabase/migrations/0027_fear_ladder_items_delete_audit.sql` with the CHECK-constraint widen + `SECURITY DEFINER` trigger function + trigger from AC 7
- [x] `supabase db reset` and manually verify: deleting a `fear_ladder_items` row as the owning authenticated user produces exactly one new `dpo_audit_log` row with `action_type = 'ladder_item_delete'`, `metadata = {"item_id": "<deleted-id>"}` (no `description` field anywhere in the row)

### T4 — `connector.ts`: reorder-pair detection and RPC call (AC: 3)

- [x] In `packages/sync/src/connector.ts`, add a grouping step at the start of `uploadData` (after `getCrudBatch`, before the existing `for` loop): partition `batch.crud` by `transactionId`, find groups of exactly 2 entries matching the reorder-pair shape from AC 3 (both PATCH, both on `fear_ladder_items`, both `opData.position` a finite number) — any group of a different size or shape (3+ entries, or mixed op-types) falls through entirely to the per-entry loop
- [x] For each detected pair, call `this.supabase.rpc('swap_ladder_positions', {...})`; on a retryable network failure, throw (preserve existing retry-on-throw contract); on a non-retryable application error from the RPC (`'one or both items not found'` or `'auth.uid() does not own both items'`), do not throw a batch-wide retry — surface/log the failure without retrying that pair indefinitely
- [x] Route all remaining (non-paired) entries through the existing `_uploadEntry` per-entry loop, unchanged
- [x] Do not change `adapter.ts` — `_reorder`'s local SQLite writes already produce the correctly-grouped `transactionId` via `writeTransaction`; this story only changes server-side upload behavior

### T5 — `ladder.tsx`: Remove item UI (AC: 4, 5, 6)

- [x] Import `useActiveExposureSession` (from `../src/hooks/useActiveExposureSession`, same relative-import pattern as `useFearLadderItems`) and call it unconditionally alongside the existing `useFearLadderItems` call
- [x] Add a "Remove item" `TouchableOpacity` inside the edit-modal form (`formVisible && editingItem !== null` — never shown on the Add path), styled as destructive (visually distinct from Save/Cancel, e.g. red text), disabled when `activeSession !== null || isLoading`
- [x] When disabled (for either reason), render `t('ladder.delete.guardMessage')` as small text beneath the button
- [x] `handleRemoveItem()`: shows the `Alert.alert` confirmation from AC 5 (import `Alert` from `react-native` — already imported in `welcome.tsx` elsewhere in this app for the single-button pattern; this is the first two-button destructive usage)
- [x] `handleConfirmDelete(item)`: `await getAdapter().enqueue('fear_ladder_items', 'DELETE', { id: item.id })` inside a try/catch that logs on error (mirror `handleSubmit`'s existing catch-and-continue pattern, lines 93-95) then calls `closeForm()` unconditionally afterward, same as the existing edit/add paths

### T6 — i18n keys (AC: 8)

- [x] Add to `apps/mobile/src/i18n/locales/en.json` under `ladder`: `removeItem`, and a nested `delete: { confirmTitle, confirmMessage, confirmButton, guardMessage }` with the canonical English copy from AC 5/6
- [x] Duplicate the same English copy into `apps/mobile/src/i18n/locales/hi.json` under the matching `ladder` keys

### T7 — Tests (AC: all)

- [x] **`packages/sync/__tests__/connector.test.ts` (NEW — closes the pre-existing gap noted in `deferred-work.md` line 9: "No test coverage for `SupabasePowerSyncConnector`")**: mock `database.getCrudBatch` to return a `CrudBatch`-shaped object with two PATCH entries on `fear_ladder_items` sharing a `transactionId` and both having `opData.position` → assert `supabase.rpc('swap_ladder_positions', {...})` called exactly once with the correct 4 args, and `supabase.from(...).update(...)` NOT called for either entry. Add a negative case: two PATCH entries with *different* `transactionId`s → both go through the normal per-entry `.update()` path, RPC not called. Add a DELETE-entry case: a `UpdateType.DELETE` entry → `supabase.from('fear_ladder_items').delete().eq('id', ...)` called (existing behavior, now covered). Add a 3-entries-sharing-`transactionId` case and a mixed-DELETE+PATCH-sharing-`transactionId` case → neither calls the RPC, both fall through to `_uploadEntry`. Add a malformed-`opData.position` case (e.g. `position: 'two'` or `null`) → RPC not called, falls through to `_uploadEntry`. Add a non-retryable RPC-error case (mock `rpc` rejecting with `'one or both items not found'`) → assert `uploadData` does not throw a batch-wide retry for that pair
- [x] **`packages/supabase/__tests__/rls/fear_ladder_items.test.ts` (extend)**: add `[+] authenticated user can delete their own row` and `[-] cross-user DELETE is blocked (affects 0 rows)`, following the file's existing `describe.skipIf(skipIfNoSupabase)` pattern
- [x] **`packages/supabase/__tests__/rls/swap_ladder_positions.test.ts` (NEW)**: `[+] owner can swap two of their own items' positions atomically`, `[-] rejects when auth.uid() does not own item A`, `[-] rejects when auth.uid() does not own item B`, `[-] rejects with non-existent item id`, `[-] rejects when item_a_id equals item_b_id`. Model `beforeAll`/`afterAll` user+item setup on `fear_ladder_items.test.ts`'s pattern
- [x] **`packages/supabase/__tests__/rls/fear_ladder_items_delete_audit.test.ts` (NEW)**: `[+] deleting own fear_ladder_items row inserts exactly one dpo_audit_log row with action_type='ladder_item_delete', metadata.item_id matching, no description field anywhere in metadata`. Use `serviceClient` to read back `dpo_audit_log` after an authenticated-client delete (regular users have no SELECT policy on that table, per migration 0006 — only `service_role` can verify the row exists)
- [x] **`apps/mobile/app/ladder.test.tsx` (extend)**: mock `useActiveExposureSession` (new `jest.mock('../src/hooks/useActiveExposureSession')`, mirroring how `useFearLadderItems` is already mocked in this file) and `Alert.alert` (`jest.spyOn(Alert, 'alert')` or module mock). Add tests: Remove button visible only when editing an existing item (not on Add); tapping Remove opens the confirm alert with the gravity copy; confirming calls `mockEnqueue` with `('fear_ladder_items', 'DELETE', { id: ... })`; canceling does not call enqueue; Remove button `accessibilityState.disabled === true` and guard text visible when `useActiveExposureSession` mock returns a non-null `activeSession`; same disabled+guard-text assertion when the mock instead returns `{ activeSession: null, isLoading: true }`

### T8 — CI verification (AC: all)

- [x] `pnpm turbo typecheck` — all packages + apps, zero errors
- [x] `pnpm turbo lint` — zero errors, confirm no ARC-005 violation flagged for `ladder.tsx` (it must not gain any `@powersync/*` import)
- [x] `pnpm turbo test` — all Vitest + Jest suites green; confirm the 4 new pgTAP-style RLS/integration test files actually ran (not silently skipped) if `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` are set locally; `supabase start` must be running for these to execute non-trivially

---

### Review Findings

- [x] [Review][Patch] AC3 reorder-pair detection doesn't specify fallback for transactionId groups with ≠2 entries or mixed op-types — spec must state any group not exactly matching "2 entries, both PATCH, both on fear_ladder_items, both with opData.position" falls through entirely to the per-entry `_uploadEntry` loop (covers 3+-entry groups and mixed DELETE+PATCH groups sharing a transactionId) [6-2-c-ladder-item-delete.md AC 3] — applied
- [x] [Review][Patch] `swap_ladder_positions` RPC has no guard against `p_item_a_id = p_item_b_id` — passing the same item twice causes the second UPDATE to silently overwrite the first with no error [6-2-c-ladder-item-delete.md AC 2] — applied
- [x] [Review][Patch] AC3 doesn't specify validating `opData.position` is a finite number before calling the RPC — a malformed/null/string position value would reach the RPC uncaught and could corrupt ordering or raise an opaque Postgres error [6-2-c-ladder-item-delete.md AC 3] — applied
- [x] [Review][Patch] AC6 doesn't address `useActiveExposureSession`'s `isLoading` state — the Remove button is only gated on `activeSession !== null`, so a tap while the query is still resolving can slip past the D8b guard entirely [6-2-c-ladder-item-delete.md AC 6] — applied
- [x] [Review][Patch] Remove the leftover LLM filler line "Ultimate context engine analysis completed - comprehensive developer guide created" at the end of the document [6-2-c-ladder-item-delete.md end of file] — applied
- [x] [Review][Patch] AC2/AC3 don't distinguish RPC error types — `connector.ts`'s "on error, throw" treats a UNIQUE-constraint violation, an ownership/not-found exception, and a network failure identically; since PowerSync retries the whole batch on any throw, a non-retryable application error (e.g. "item not found") will retry forever and block all future sync uploads. Spec should require distinguishing retryable transport errors from terminal application errors [6-2-c-ladder-item-delete.md AC 2, AC 3] — applied
- [x] [Review][Patch] No handling specified for deleting an item that is the other half of an in-flight (not-yet-uploaded) reorder pair — `swap_ladder_positions` will `RAISE EXCEPTION '...not found'`, and per the error-handling gap above this becomes an infinite retry blocking sync for unrelated subsequent writes [6-2-c-ladder-item-delete.md AC 3, AC 4] — applied
- [x] [Review][Defer] Cross-user DELETE silently affects 0 rows with no client-side detection of the resulting local/server divergence [6-2-c-ladder-item-delete.md AC 1] — deferred, pre-existing RLS pattern used elsewhere in the project, not unique to this story
- [x] [Review][Defer] `useActiveExposureSession(userId)`'s `userId` source isn't stated explicitly in AC 6 text (only implied via "same call signature as index.tsx") [6-2-c-ladder-item-delete.md AC 6] — deferred, inferable from the referenced file, minor clarity gap only
- [x] [Review][Defer] AC7's "exception-free by construction" claim only holds until a future schema change (e.g. a new NOT NULL column on `dpo_audit_log`) [6-2-c-ladder-item-delete.md AC 7] — deferred, speculative future risk, not actionable now
- [x] [Review][Defer] `acting_operator_id = OLD.user_id` conflates actor and subject for self-service deletes; no operator/bulk-delete path exists yet that would need disambiguation [6-2-c-ladder-item-delete.md AC 7] — deferred, no current code path triggers this ambiguity
- [x] [Review][Defer] If the UI guard (AC 6) is ever bypassed, an orphaned `exposure_sessions` row can permanently block all future deletes via the global active-session check, with no recovery path described [6-2-c-ladder-item-delete.md AC 6, Out of Scope #5] — deferred, explicitly tracked as a known residual risk in `deferred-work.md` line 460
- [x] [Review][Defer] Hindi locale duplicates English copy for a high-stakes, irreversible-action confirmation [6-2-c-ladder-item-delete.md AC 8] — deferred, matches existing project-wide `hi.json` convention, not a deviation introduced by this story
- [x] [Review][Defer] `handleConfirmDelete` closes the modal unconditionally even if `enqueue` throws (catch only logs) [6-2-c-ladder-item-delete.md T5] — deferred, matches the existing edit/add error-handling convention in the same file
- [x] [Review][Defer] Stale `activeSession === null` if a session starts on another device between modal-open and tap [6-2-c-ladder-item-delete.md AC 6] — deferred, inherent multi-device sync-latency race, not unique to this guard
- [x] [Review][Defer] 0-row DELETE from an already-deleted item or racing devices isn't explicitly addressed [6-2-c-ladder-item-delete.md AC 1, AC 7] — deferred, standard Postgres/RLS semantics already handle this correctly (no trigger fire, no error), just unstated
- [x] [Review][Defer] i18n lint key-parity behavior for the reused `ladder.cancel` key under `ladder.delete.*` is unverified [6-2-c-ladder-item-delete.md AC 8] — deferred, needs a quick check against the actual lint implementation during dev, not a spec defect
- [x] [Review][Defer] Idempotency of a retried `swap_ladder_positions` call (PowerSync batch retry) is correct by construction (positions are set to absolute values) but never explicitly stated [6-2-c-ladder-item-delete.md AC 2, AC 3] — deferred, already correct behavior, documentation-only gap

### Code Review Findings (implementation, 2026-06-17)

- [x] [Review][Defer] `swap_ladder_positions` has no rowcount/existence check after its two `UPDATE` statements — if either paired item is deleted by a concurrent transaction between the ownership `SELECT`s and the final `UPDATE`s, the `UPDATE` silently matches 0 rows (no error), and the function reports success despite a partial/no-op swap [`supabase/migrations/0026_swap_ladder_positions_rpc.sql:45-46`] — deferred, narrow race window (concurrent delete must land in the sub-millisecond window between the ownership SELECT and the UPDATE within one transaction); the existing ownership/not-found check already catches the far more common case of an item deleted before the batch starts
- [x] [Review][Patch] `NON_RETRYABLE_RPC_ERRORS` (`packages/sync/src/connector.ts:23`) doesn't include `swap_ladder_positions`'s third application error, `'item_a and item_b must differ'` (raised when `isReorderPair` admits a pair with `entryA.id === entryB.id`) — `isRetryableError` would treat it as retryable, so a malformed same-id pair would `throw` and PowerSync would retry the identical always-failing call forever, blocking all future sync uploads [`packages/sync/src/connector.ts:23-31`] — applied
- [x] [Review][Defer] The two `UPDATE`s inside `swap_ladder_positions` are asserted (by code comment) to commit atomically with `uq_user_position`'s deferred constraint check, but no test exercises a constraint-violation scenario to prove it [`supabase/migrations/0026_swap_ladder_positions_rpc.sql`] — deferred, additional test-coverage hardening beyond AC 2's literal scope, not a known defect
- [x] [Review][Defer] `fear_ladder_items_delete_audit`'s "must never fail" design only holds until a future schema change on `dpo_audit_log` (e.g. a new `NOT NULL` column) [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`] — deferred, duplicate of an already-deferred spec-review finding (AC 7), speculative future risk
- [x] [Review][Defer] `acting_operator_id = OLD.user_id` conflates actor and subject for self-service deletes, muddying the column's normal "DPO operator" semantics for any future audit-log reader [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`] — deferred, duplicate of an already-deferred spec-review finding (AC 7)
- [x] [Review][Defer] `dpo_audit_log_action_type_check`'s `DROP CONSTRAINT` + re-`ADD CONSTRAINT` takes a brief exclusive-ish lock while validating existing rows, a risk on a high-traffic audit-log table [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`] — deferred, matches the project's established migration 0021 precedent for the same DROP+ADD CHECK pattern, not unique to this story
- [x] [Review][Defer] `isReorderPair`/`groupReorderPairs` don't validate that `entry.id` is a well-formed UUID before it reaches `p_item_a_id`/`p_item_b_id` — a corrupted local `ps_crud` row would surface as an opaque Postgres cast error rather than a clear client-side failure [`packages/sync/src/connector.ts:39-50`] — deferred, requires local SQLite corruption to trigger, low likelihood, defense-in-depth only
- [x] [Review][Defer] `isRetryableError`'s substring match against `error.message` assumes Supabase/PostgREST never wraps or truncates the raw Postgres exception text [`packages/sync/src/connector.ts:28-31`] — deferred, contradicted by the passing `swap_ladder_positions.test.ts` integration tests against the real local Supabase/PostgREST stack, which confirm the message passes through unwrapped
- [x] [Review][Defer] Non-retryable RPC errors are only `console.error`'d with no telemetry/crash-reporting hook, so a production failure of this kind is invisible to operators [`packages/sync/src/connector.ts:69`] — deferred, AC 2/AC 3 only require "surface/log the failure"; telemetry infrastructure doesn't exist elsewhere in this codebase and is out of scope for this story
- [x] [Review][Defer] No test combines an actual `DELETE` `CrudEntry` and a reorder-pair referencing the same item id within one batch — only the resulting RPC error is tested in isolation [`packages/sync/__tests__/connector.test.ts`] — deferred, the spec-anticipated behavior (AC 3's in-flight-pair note) is already implemented and tested in equivalent simplified form; this is a test-refinement suggestion, not a behavior gap
- [x] [Review][Defer] `uploadData` throws on the first retryable error encountered (in either the pairs loop or the remaining-entries loop), aborting the rest of the batch including unrelated valid pairs/entries [`packages/sync/src/connector.ts:51-78`] — deferred, pre-existing PowerSync connector behavior (the original per-entry loop already aborted the whole batch on any single throw), not introduced or worsened by this story
- [x] [Review][Defer] `groupReorderPairs` buckets by `transactionId` using `== null`, which would not treat a hypothetical `transactionId === 0` as "no transaction" [`packages/sync/src/connector.ts:52-67`] — deferred, speculative; PowerSync's `transactionId` is an auto-incrementing id (observed to start above 0), and the story's own Dev Notes already accept this as a future-PowerSync-internals coupling risk
- [x] [Review][Defer] `swap_ladder_positions` accepts arbitrary integer positions, including negative or zero, with no range validation [`supabase/migrations/0026_swap_ladder_positions_rpc.sql`] — deferred, AC 2's literal spec SQL; impact is self-scoped to the calling user's own data ordering (RLS-protected, no cross-user effect), not a correctness or security issue

---

## Dev Notes

### Files this story touches — current state going in

- `apps/mobile/app/ladder.tsx` — read in full during story creation (340 lines). The edit-modal form (lines 261-305) currently has only Cancel/Save actions; this story adds a third destructive action conditionally rendered only when `editingItem !== null`. The existing `useEffect` at lines 50-52 (`setItems([...remoteItems].sort(...))`) is the mechanism that will reactively remove the deleted item from `items` — do not duplicate this logic with a manual filter.
- `packages/sync/src/connector.ts` — read in full (77 lines). `uploadData` (lines 51-61) currently does a flat `for` loop over `batch.crud`. This story inserts a grouping/pairing pre-pass before that loop; the loop itself still handles every entry not consumed by a pair.
- `packages/sync/src/adapter.ts` — read in full (99 lines), **not modified by this story**. `_reorder` (lines 63-75) and the `DELETE` branch (lines 56-57) already do exactly what AC 3/AC 4 need on the local-SQLite side; this story's work is entirely server-side (connector) and UI-side (ladder.tsx) plus three new migrations.
- `apps/mobile/src/hooks/useActiveExposureSession.ts` — read in full (35 lines), **not modified**. Already returns the exact shape AC 6 needs; this story is its second consumer (`apps/mobile/app/(app)/index.tsx` from Story 6.2-B is the first).

### Why `connector.ts`'s grouping logic lives in `uploadData`, not `adapter.ts`

The local SQLite write (`adapter.ts`) and the server upload (`connector.ts`) are different layers solving different problems. `adapter.ts`'s `_reorder` already correctly writes both rows in one SQLite transaction — that part of D6 was solved by the *existing* code (it's what gives both `ps_crud` rows the same `transactionId`). What was missing is purely on the upload side: PowerSync doesn't know "these two PATCH entries were one logical reorder" — it just hands `uploadData` a flat list of `CrudEntry` objects from `ps_crud`. The `transactionId` field is the only signal connecting them, and it's only available once `uploadData` reads the batch. Do not try to solve this in `adapter.ts` — there is no way for the adapter to communicate "these two writes are a pair" to the connector except through `transactionId`, which already works without any adapter change.

### `transactionId` grouping — verified against installed PowerSync source, not assumed

Story 6.2-A's dev notes record the precedent of verifying PowerSync internals directly against `node_modules/.pnpm/@powersync+common@1.53.1/` rather than trusting the SDK's public docs (which were found to diverge from the installed version in several places, e.g. `db.useQuery()` vs the real top-level `useQuery()` hook). This story follows the same discipline: `CrudEntry.transactionId` is sourced from `dbRow.tx_id` in `CrudEntry.fromRow` (`.../lib/client/sync/bucket/CrudEntry.js`), and `tx_id` is a column on the `ps_crud` table populated by PowerSync's native SQLite extension trigger at write time — confirmed by reading `SqliteBucketStorage.getCrudBatch`'s `SELECT * FROM ps_crud ORDER BY id ASC LIMIT ?` and `CrudEntry.fromRow(row)` call. If a future PowerSync version changes this internal column name or grouping semantics, the `connector.test.ts` reorder-pair test will fail loudly (it asserts on the public `transactionId` field of mocked `CrudEntry`-shaped objects, not the SQL column directly) — that's an acceptable coupling boundary.

### Why the audit trigger is `AFTER DELETE`, never `BEFORE DELETE`

D8(c) in the rejected-spec review explicitly vetoed a `BEFORE DELETE` trigger on `fear_ladder_items` for a guard/validation purpose, because a trigger that raises an exception causes PowerSync's `ps_crud` entry to never get marked complete — the upload retries forever, and on the next sync *pull* the "deleted" row re-materializes on the user's screen with zero error explanation. That specific failure mode is about a trigger that can *reject* the delete. AC 7's audit trigger is `AFTER DELETE`, which only runs once the delete has already (provisionally, within the transaction) succeeded — but if the trigger's own `INSERT INTO dpo_audit_log` raised for any reason, Postgres would still roll back the entire transaction including the DELETE, reproducing the exact same symptom. This is why AC 7 is written defensively: the CHECK constraint must already permit `'ladder_item_delete'` *before* the trigger can ever fire (same migration, in order), and the inserted row uses only values that cannot violate any other constraint on `dpo_audit_log` (`outcome` is hardcoded to `'success'`, which is in the existing CHECK list; `target_user_id`/`acting_operator_id` are both `NOT NULL`-guaranteed by `OLD.user_id`'s own FK constraint).

### Schema reference (no table-shape changes in this story)

`fear_ladder_items` (post migration 0021, unchanged here except RLS): `id, user_id, description, predicted_suds, peak_suds, position, status ('pending'|'completed'), created_at, updated_at`.
`dpo_audit_log` (post migration 0006, CHECK widened by this story): `id, action_type ('erasure'|'export'|'audit_view'|'ladder_item_delete' as of this story), acting_operator_id, target_user_id, timestamp_utc, outcome, metadata`.

### `packages/sync/src/schema.ts` — no changes needed

The PowerSync client-side `Table` schemas (`packages/sync/src/schema.ts`) describe column shapes only — they're unaffected by RLS policies, RPC functions, or triggers, all of which are server-side-only concerns invisible to the local SQLite schema. Do not touch this file.

### `database.types.ts` — pre-existing drift, not this story's problem to fix

`packages/supabase/src/database.types.ts` was last regenerated at Story 5.2 and has not been kept in sync since (e.g. it is missing the `technique` column added to `exposure_sessions` by migration 0020 / Story 6.2-A). `connector.ts`'s `this.supabase` is typed via `@exposure-buddy/supabase`'s bare (non-generic) `SupabaseClient` re-export — NOT `TypedSupabaseClient` (`SupabaseClient<Database>`) — so `this.supabase.rpc('swap_ladder_positions', {...})` will compile without needing `database.types.ts` updated. This story does not regenerate `database.types.ts`; that drift is pre-existing and out of scope here.

### Test mock pattern — `apps/mobile/app/ladder.test.tsx`

The file already mocks `useFearLadderItems` via `jest.mock('../src/hooks/useFearLadderItems', ...)` and `getAdapter` via `jest.mock('../src/sync/adapter', ...)` (see lines 44-52 of the existing test file). Add a third hook mock for `useActiveExposureSession` using the identical pattern, defaulted in `beforeEach` to `{ activeSession: null, isLoading: false }` so all 17 existing tests keep passing unmodified (matching how Story 6.2-B's `index.test.tsx` rewrite kept its 11 pre-existing tests green by defaulting the new mock to the no-op case in `beforeEach`).

### Anti-Patterns to Avoid

- **Do not write a `BEFORE DELETE` validation/guard trigger on `fear_ladder_items`.** Explicitly rejected (D8c) — see Dev Notes above.
- **Do not call `db.execute` or any `@powersync/*` API directly from `ladder.tsx`.** ARC-005 + the `no-restricted-imports` ESLint rule in `apps/mobile/.eslintrc.js` block this. Always go through `getAdapter().enqueue(...)`.
- **Do not add a manual `setItems(prev => prev.filter(...))` optimistic delete.** The existing `remoteItems` → `items` sync `useEffect` already handles this reactively once the local SQLite DELETE commits; adding a redundant manual filter risks a stale double-update race with no benefit (this mirrors D7's "no optimistic React state" resolution).
- **Do not put `description` (the fear text) anywhere in the `dpo_audit_log` row.** `metadata` must contain only `item_id`. This is the DPDPA minimization requirement D13 was resolved around.
- **Do not use `SECURITY DEFINER` on `swap_ladder_positions`.** It must be `SECURITY INVOKER` so RLS still applies to the underlying table reads/writes as defense-in-depth; the explicit `auth.uid()` ownership check is there because RLS alone would silently no-op rather than error.
- **Do not skip `GRANT EXECUTE ... TO authenticated` on the new function.** Supabase does not auto-grant on plain-SQL-migration-created objects (this is exactly why migration 0024 exists as a project-wide backfill).
- **Do not add swipe-to-delete.** Out of scope per epics.md line 1336 and AC 5.
- **Do not scope the `useActiveExposureSession` guard check to the specific item being deleted.** The rejected spec's literal language and D8(b)'s resolution both describe a global "any active session" guard, matching the hook's existing un-scoped query.

---

## Testing Requirements

### packages/sync (Vitest)

`packages/sync/__tests__/connector.test.ts` (new file) — see T7 for the three required scenarios (reorder-pair RPC call, non-paired fallback, DELETE entry coverage). Mock `AbstractPowerSyncDatabase.getCrudBatch` and `SupabaseClient` (`from`, `rpc` as `vi.fn()`s); no real DB needed, pure unit test against the connector's branching logic.

### packages/supabase (Vitest, pgTAP-style local-Supabase integration — `describe.skipIf(skipIfNoSupabase)`)

Three test files per T7, all requiring `supabase start` + `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` env vars to actually execute (CI uses `passWithNoTests` when unset, per every existing RLS test file's header comment). Follow `fear_ladder_items.test.ts` and `exposure_sessions_active_thread.test.ts`'s exact `beforeAll`/`afterAll` user-and-data setup/teardown conventions.

### apps/mobile (Jest + RNTL)

Extend `apps/mobile/app/ladder.test.tsx` per T7. Use `act(async () => ...)` around any `fireEvent.press` that triggers an `await`ed enqueue call, matching the file's existing convention (e.g. line 156, line 194).

---

## i18n Keys Summary

| Key | English (canonical) | Used by |
|---|---|---|
| `ladder.removeItem` | "Remove item" | Destructive button label inside edit modal |
| `ladder.delete.confirmTitle` | "Remove item?" | `Alert.alert` title |
| `ladder.delete.confirmMessage` | "This fear and all your progress on it will be permanently removed." | `Alert.alert` message (D13 gravity copy — supersedes epics.md line 1336's placeholder text) |
| `ladder.delete.confirmButton` | "Remove" | `Alert.alert` destructive button label |
| `ladder.delete.guardMessage` | "Finish your current session first." | Helper text shown when Remove is disabled (D8b) |

`ladder.cancel` (existing key) is reused for the `Alert.alert` Cancel button — do not add a duplicate.

---

## Out of Scope — do NOT implement in this story

1. **Swipe-to-delete gesture** — epics.md line 1336 explicitly excludes it for this story; the in-modal button is the sole affordance.
2. **Soft delete / 30-day grace window** — D13 explicitly rejected this in favor of hard delete + audit log (see `_archive/6-2-rejected.md` line 931 for the full rationale: no schema column, no RLS filter, no scheduled purge, no legal basis story to defend it).
3. **A DB-level guard (trigger or constraint) preventing deletion of an item with an active session** — D8(c) explicitly rejected this; the guard is UI-only (AC 6). The residual bypass risk (a future non-UI write path) is already filed in `deferred-work.md` line 460.
4. **Fixing the pre-existing `database.types.ts` drift** (missing `technique` column, missing this story's new RPC function) — pre-existing gap, not introduced or worsened by this story.
5. **`uq_active_thread`'s NULL gap for `fear_item_id IS NULL`** — `deferred-work.md` line 28 notes this gap "only activates once ladder-item deletion is implemented," which this story does. The gap itself (multiple orphaned `'started'` sessions with `fear_item_id IS NULL` after a ladder item with an active session's `fear_item_id` is `ON DELETE SET NULL`'d) is **not closed by this story** — AC 6's UI guard prevents deleting an item *while* it has an active session in the common path, but does not retroactively fix the partial-index gap for any pre-existing orphaned rows or for a delete that races past the UI guard. This remains tracked in `deferred-work.md`; do not attempt to fix the partial index in this story (it's a separate, already-deferred concern with its own migration-risk tradeoffs noted there).
6. **A real end-to-end sync test against cloud Supabase** — same constraint noted in 6.2-A: `EXPO_PUBLIC_POWERSYNC_URL` may not be provisioned locally; the RPC and trigger are verified via direct `service_role`/`anon` Supabase client calls (pgTAP-style), not through an actual PowerSync sync round-trip.

---

## References

- `_bmad-output/implementation-artifacts/_archive/6-2-rejected.md` lines 805-931 — the authoritative D6/D7/D8/D13 decision records this story implements; read before starting
- `_bmad-output/implementation-artifacts/6-2-a-powersync-foundation.md` — predecessor story; "Out of Scope" items 7-10 are this story's starting brief; Dev Notes document the precedent of verifying PowerSync internals against installed source rather than docs
- `_bmad-output/implementation-artifacts/6-2-b-home-screen-morning-state.md` — sibling story (merged); built `useActiveExposureSession`, this story's second consumer of that hook
- `_bmad-output/implementation-artifacts/deferred-work.md` lines 27-38, 460 — every deferred item this story either resolves (D6 reorder atomicity, line 27/32) or explicitly does not resolve (line 28 `uq_active_thread` NULL gap, line 460 UI-only guard bypass risk)
- `_bmad-output/planning-artifacts/epics.md` lines 1334-1336 — original AC 7 text (superseded copy-wise by D13, but the functional requirements — confirm/cancel, optimistic-then-rollback-on-enqueue-failure language, hard delete, RLS-gated — still hold except where D7/D13 explicitly revise them)
- `supabase/migrations/0006_dpo_audit_log.sql`, `0007_perform_user_erasure_fn.sql` — `SECURITY DEFINER` + `search_path` pinning pattern this story's trigger function follows
- `supabase/migrations/0013_fear_ladder_items.sql`, `0021_fear_ladder_items_constraints.sql`, `0024_grant_table_permissions.sql` — existing table/policy/grant conventions this story extends
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — ARC-005 definition (referenced via epics.md lines 124, 582 since this rules doc doesn't itself enumerate ARC numbers); `SECURITY DEFINER` search_path checklist item

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `supabase db reset` applied migrations 0025-0027 cleanly on first attempt (idempotent NOTICE-level skips for the DROP POLICY/DROP TRIGGER IF EXISTS guards, as expected on a fresh DB)
- `packages/supabase` RLS/RPC test run initially failed 2 of 5 `swap_ladder_positions.test.ts` assertions: cross-user calls raised `'one or both items not found'` instead of the assumed `'auth.uid() does not own both items'`. Root cause: the function's ownership-check SELECTs run under `SECURITY INVOKER`, so they are themselves subject to the table's SELECT RLS policy — a cross-user item is invisible to that SELECT and surfaces as not-found before the explicit ownership-mismatch branch can ever be reached. The migration matches AC 2's SQL verbatim; fixed the test assertions to match real (and correct) behavior rather than changing the migration.
- `packages/sync/__tests__/connector.test.ts` initially failed with `SyntaxError: Unexpected token 'typeof'` for every test in the file (and even a minimal one-import smoke test). Root cause: `connector.ts`'s pre-existing `import { UpdateType } from '@powersync/react-native'` is a runtime value import; under Vitest's Node/esbuild environment (no Metro/Babel RN transform), resolving that import executes `@powersync/react-native`'s real `dist/index.js`, which does `require('react-native')` and hits Flow-typed source esbuild cannot parse. Fixed by adding `vi.mock('@powersync/react-native', () => ({ UpdateType: { PUT: 'PUT', PATCH: 'PATCH', DELETE: 'DELETE' } }))` in the test file (Vitest hoists `vi.mock` above all imports, so the real module is never evaluated) — no production code changes needed for this fix.

### Completion Notes List

- AC 1-3, 7: three new migrations (0025-0027) applied and verified via `supabase db reset` + direct schema inspection (policy list, function `prosecdef`/grants, constraint definition, trigger existence) — all matched spec exactly.
- AC 2/AC 3 error-type discrimination implemented in `connector.ts` via a small `NON_RETRYABLE_RPC_ERRORS` string-match list; only the two named application errors from `swap_ladder_positions` are treated as non-retryable (logged, not thrown), everything else still throws to preserve PowerSync's batch-retry contract.
- AC 3's reorder-pair grouping (`groupReorderPairs`/`isReorderPair` in `connector.ts`) implements the exact fallback rule from the spec: any `transactionId` group not matching "exactly 2 entries, both PATCH, both on `fear_ladder_items`, both with a finite numeric `opData.position`" falls through entirely to the existing per-entry `_uploadEntry` path.
- AC 4-6: `ladder.tsx` adds the Remove item button (destructive style, edit-modal only), the D13 gravity-copy confirmation `Alert.alert`, and the D8b active-session guard (`activeSession !== null || isLoading`, failing closed during the loading window). No manual optimistic state added for delete — confirmed the existing `remoteItems` → `items` sync `useEffect` (unchanged) already reflects the deletion reactively.
- AC 8: all 5 new i18n keys (`ladder.removeItem`, `ladder.delete.{confirmTitle,confirmMessage,confirmButton,guardMessage}`) added to both `en.json` and `hi.json` (Hindi duplicates English per existing file convention); `ladder.cancel` reused, not duplicated.
- All 8 tasks (T1-T8) completed; full monorepo `pnpm turbo typecheck` / `pnpm turbo lint` / `pnpm turbo test` all green. The 4 pgTAP-style RLS/RPC integration test files were run directly with `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` set against local Supabase (not silently skipped) — all 77 `packages/supabase` tests passed, including the 13 new/extended RLS/RPC tests for this story.
- No deviations from the story's literal AC SQL/code blocks. The two debug-log findings above were test-side fixes (assertion correction, and an RN-module mock for testability), not spec or production-behavior changes.

### File List

- `supabase/migrations/0025_fear_ladder_items_delete_policy.sql` (new)
- `supabase/migrations/0026_swap_ladder_positions_rpc.sql` (new)
- `supabase/migrations/0027_fear_ladder_items_delete_audit.sql` (new)
- `packages/sync/src/connector.ts` (modified — reorder-pair detection + RPC call + retryable/non-retryable error discrimination)
- `packages/sync/__tests__/connector.test.ts` (new)
- `apps/mobile/app/ladder.tsx` (modified — Remove item UI, confirmation alert, active-session guard)
- `apps/mobile/app/ladder.test.tsx` (modified — Remove item test coverage)
- `apps/mobile/src/i18n/locales/en.json` (modified — 5 new `ladder.*` keys)
- `apps/mobile/src/i18n/locales/hi.json` (modified — same 5 keys, English copy duplicated)
- `packages/supabase/__tests__/rls/fear_ladder_items.test.ts` (modified — 2 new DELETE RLS tests)
- `packages/supabase/__tests__/rls/swap_ladder_positions.test.ts` (new)
- `packages/supabase/__tests__/rls/fear_ladder_items_delete_audit.test.ts` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status tracking)

### Change Log

- 2026-06-17: Story 6.2-C implemented end-to-end — DELETE RLS policy, atomic `swap_ladder_positions` RPC, DPDPA audit trigger, connector.ts reorder-pair detection with retryable/non-retryable error discrimination, ladder.tsx Remove item UI with D13 confirmation copy and D8b active-session guard, i18n keys, and full test coverage (connector unit tests, 3 RLS/RPC integration test files, ladder.tsx UI tests). All 8 tasks complete; status → review.

---
