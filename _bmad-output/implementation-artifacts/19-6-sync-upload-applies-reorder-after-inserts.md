# Story 19.6: Sync Upload Applies a Reorder After the Inserts It Depends On

Status: review

<!-- Source: epics.md Epic 19, Story 19.6. Found 2026-10-06 during Story 19.1's Android device verification. A defect against Story 6.2 (AC 2/3) reorder behaviour; no FR of its own, not a beta-feedback item. -->

## Story

As a user who adds courage-ladder items and arranges them before my phone has uploaded anything (offline, or just quickly, as the onboarding ladder does),
I want my arrangement to be what the server ends up with,
so that my ladder never silently snaps back to its original order after sync.

## Acceptance Criteria

1. **Reorder runs after the inserts it depends on.** Given a batch containing two `fear_ladder_items` inserts and the reorder pair that swaps them (inserts first, then the swap, in `ps_crud` order), when `uploadData` runs, then the two inserts reach Supabase before `swap_ladder_positions` is called. Today `groupReorderPairs` pulls every pair out and `uploadData` sends all pairs first, so the RPC fails with "one or both items not found" (HTTP 400), the error is classed non-retryable, and the swap is dropped.
2. **The chosen approach is recorded, and holds in all three timing cases.** The Completion Notes record the approach taken (see Dev Notes: *Decision*) and why. It must hold when the swapped items were inserted (a) in an earlier batch that already uploaded, (b) in the same batch as the swap, and (c) in a write that is still failing and being retried (the swap must not be sent, and must not be lost, while its insert has not been accepted).
3. **"Items no longer exist" keeps its non-retryable handling, and only that.** Given a reorder whose items genuinely no longer exist (deleted before upload), the existing non-retryable handling is kept for that case. It must no longer be what swallows the "inserts not uploaded yet" case. The three existing `NON_RETRYABLE_RPC_ERRORS` and their tests stay.
4. **Regression test that fails on current code.** A Vitest test in `packages/sync/__tests__/connector.test.ts` reproduces the failing order (two PUT inserts + one reorder pair in one batch) and asserts the call order inserts → RPC. It must fail when run against `connector.ts` as it stands on `main` (verify by running it before the fix; record that in the Debug Log).
5. **User-visible result.** The order the user arranged is what the server ends up with, and the device never visibly reverts it. Verified on a device or with the offline repro below (see Testing Requirements); if no device is available, say so in Completion Notes rather than claiming it.
6. **Boundary with 19.7 is respected.** The story notes its relationship to the `user_onboarding_metadata` upload failure (the 403 on a write-once table that retried forever and stalled the queue; fixed for that table by migration 0034, general poison-write handling is Story 19.7) and does **not** try to fix poison-write handling here. In particular, do not add dead-lettering, a retry cap, or new non-retryable classes.
7. **A drag of more than one slot reaches the server as the order the user arranged (decision 2026-10-09: folded into this story from the Story 19.3 deferral).** Today `apps/mobile/app/ladder.tsx` `handleDragEnd` shifts every in-between item in the optimistic list but enqueues only a two-item swap (moved item ↔ item now at its old slot), so the server order diverges from the local order for any drag longer than one slot. After this story, dragging item N slots enqueues the swaps needed so that, once uploaded, every affected item holds the same stored position it shows locally. A one-slot drag still enqueues exactly one swap with the same arguments as today, and the group-bounded behaviour from Story 19.3 (a drag never crosses the unfinished/completed boundary, stored position values of the group are reused, the other group is untouched) is unchanged.

## Tasks / Subtasks

- [ ] Task 1: Reproduce with a failing test first (AC: 1, 4)
  - [ ] Add a test with entries `[PUT item-a (txn 1), PUT item-b (txn 2), PATCH item-a pos 2 + PATCH item-b pos 1 (txn 3)]`; assert `from('fear_ladder_items').upsert` is called for both before `rpc('swap_ladder_positions', …)` (compare `mock.invocationCallOrder`).
  - [ ] Run it against unmodified `connector.ts`; confirm it fails; note the failure in the Debug Log.
- [ ] Task 2: Preserve `ps_crud` order in `uploadData` (AC: 1, 2)
  - [ ] Replace `groupReorderPairs`' `{ pairs, remaining }` return with an ordered list of upload units (`{ kind: 'swap', entries: [a, b] } | { kind: 'entry', entry }`), where only a reorder pair is grouped: a pair is emitted at the position of its first entry (its second entry is skipped), and every other entry stays exactly where it is in `batch.crud`.
  - [ ] `uploadData` iterates the units in that order: swap → existing RPC + error handling unchanged; entry → `_uploadEntry` + `throw error`.
  - [ ] Keep `isReorderPair` unchanged (still the only definition of a pair).
- [ ] Task 3: Cover the other timing cases (AC: 2, 3)
  - [ ] Test: swap alone in a batch (items inserted in an earlier batch) → RPC called, no `from` calls (existing test at `connector.test.ts:52` already covers this; keep it green).
  - [ ] Test: an insert before the swap fails (`upsert` resolves `{ error }`) → `uploadData` throws, RPC **not** called, `batch.complete` **not** called (the swap stays queued and retries after its insert).
  - [ ] Test: insert, then delete of the same item, then a swap including it (synthetic: the UI cannot enqueue a swap on an item it already deleted; the real-world source is a delete synced from another device) → RPC returns "one or both items not found" → logged, not thrown, batch completes (existing non-retryable path, now reached only for a real deletion).
  - [ ] Test: two swaps in one batch with a PATCH between them → all three execute in original order.
- [ ] Task 4: Existing behaviour regression check (AC: 3)
  - [ ] All existing `connector.test.ts` cases pass unchanged (non-pair fall-through, malformed position, three non-retryable errors, retryable error throws).
  - [ ] `pnpm --filter @exposure-buddy/sync test`, `pnpm turbo typecheck lint` green.
- [ ] Task 5: Multi-slot drag enqueues the full rearrangement (AC: 7)
  - [ ] In `apps/mobile/app/ladder.tsx` `handleDragEnd`, replace the single `reorder_positions` enqueue with a chain of adjacent swaps (see Dev Notes: *Multi-slot drag design*). Keep the early returns, the group bounds, the optimistic update and the `groupPositions`/`reorderedGroup` computation exactly as they are.
  - [ ] A one-slot drag must produce one enqueue with the same payload as today (the three existing drag tests in `apps/mobile/app/ladder.test.tsx` must pass unmodified).
  - [ ] Add Jest tests in `apps/mobile/app/ladder.test.tsx`: a 2-slot drag down (e.g. unfinished group of 4, drag index 0 to 2) enqueues two swaps in order; a 2-slot drag up enqueues two swaps in order; applying the enqueued swaps to the stored positions reproduces the optimistic order; a drag inside the completed group of 3+ items does the same and never mentions an unfinished item.
  - [ ] Enqueues run sequentially (await each) so `ps_crud` holds them in order, and chains from separate drags are serialised through one ref-held promise tail (see Dev Notes). A failed enqueue stops that chain and is logged with the existing `[LadderScreen] reorder enqueue failed:` message (no new UI; accepted partial-chain risk below).
  - [ ] Add a Jest test: two drags fired back to back (the first chain not yet resolved) enqueue all of drag 1's swaps before any of drag 2's.
- [ ] Task 6: Record the decision and close out (AC: 2, 5, 6, 7)
  - [ ] Completion Notes: approach + rationale; the device/offline verification result (or that it was not run).
  - [ ] Update `deferred-work.md`: add a pointer under the 19.1 entry that the offline-reorder-lost item is fixed by 19.6; mark the Story 19.3 multi-slot-drag entry as resolved by 19.6 (AC 7); leave the poison-write item open for 19.7.

## Dev Notes

### Current state (read before editing)

`packages/sync/src/connector.ts`:
- `uploadData` does `getCrudBatch(200)`, then `groupReorderPairs(batch.crud)` → `{ pairs, remaining }`, loops **all pairs first** through `supabase.rpc('swap_ladder_positions', …)`, then loops `remaining` through `_uploadEntry`, then `batch.complete()`.
- `groupReorderPairs` buckets entries by `transactionId`; a group of exactly two `PATCH`es on `fear_ladder_items`, both with a finite numeric `opData.position`, is a pair (`isReorderPair`). Everything else, including entries with `transactionId == null`, goes to `remaining`. **This bucketing is where order is lost**: `remaining` is built in a different order from `crud`, and pairs are lifted out entirely.
- Error handling for the RPC: `isRetryableError` is false only when the message contains one of `NON_RETRYABLE_RPC_ERRORS` (`one or both items not found`, `auth.uid() does not own both items`, `item_a and item_b must differ`); non-retryable errors are `console.error`ed and the batch continues; retryable errors throw. Per-entry errors always throw.

`packages/sync/src/adapter.ts`:
- `INSERT` is a plain `db.execute('INSERT INTO …')` (its own implicit transaction, so each insert is its own `ps_crud` transaction → `PUT` op).
- `_reorder` runs two `UPDATE … SET position` statements inside one `writeTransaction`, so both `PATCH` rows share a `transactionId`. This is what `isReorderPair` keys on.
- `ps_crud` is an append-only queue: entries come back from `getCrudBatch` in the order they were written, so `batch.crud` order **is** the user's chronological order.

`supabase/migrations/0026_swap_ladder_positions_rpc.sql` (do not change): raises the three application errors above, requires both rows to exist and be owned by `auth.uid()`, and performs both UPDATEs in one transaction (`uq_user_position` is `DEFERRABLE INITIALLY DEFERRED`).

Callers that produce the pair: `apps/mobile/app/(onboarding)/ladder.tsx` `swapItems` (UPDATE with `type: 'reorder_positions'`; no change needed) and `apps/mobile/app/ladder.tsx` `handleDragEnd` (`'reorder_positions'` operation; changed by AC 7).

### Decision (confirmed 2026-10-09 in spec review; the dev agent records it in Completion Notes)

The two options in the epic are: preserve `ps_crud` order, or run pairs after the batch's non-reorder writes. **Decided: preserve `ps_crud` order.** Reasons:
- It is correct by construction for every case the story lists: the user's writes replay in the order they happened, so an insert always precedes the swap that mentions it, and a delete that precedes a swap makes the swap fail for the right reason.
- "Pairs last" fixes the reported bug but breaks the mirror case: `swap A,B` then `DELETE A` in one batch would run the delete first and the swap would then be dropped as "not found" even though the user reordered first. It also reorders a swap relative to a later PATCH on the same item (for example editing text), which is harmless today but is a trap.
- It is the smaller change: `uploadData` keeps one loop and one error policy; only `groupReorderPairs`' return shape changes.

Implementation shape (suggestion, not a mandate; the `UploadUnit` union below is the shape to use):
```ts
type UploadUnit =
  | { kind: 'swap'; a: CrudEntry; b: CrudEntry }
  | { kind: 'entry'; entry: CrudEntry }

// First pass: bucket by transactionId (as today) and keep only the groups that isReorderPair accepts.
// Second pass, walk batch.crud once, in order: the first entry of a pair group → one 'swap' unit
// (the pair's second entry is skipped when met); every other entry, including members of non-pair
// groups and entries with transactionId == null → its own 'entry' unit, in place.
```
Only pairs are lifted out of the plain order; a non-pair group (3+ entries, mixed ops) is never regrouped, so none of its members can be moved past another transaction's entries. This does not depend on a transaction's rows being adjacent in `batch.crud`. (PowerSync's own API doc for `getCrudBatch` says a batch "does not group data by transaction. One batch may contain data from multiple transactions, and a single transaction may be split over multiple batches" — `@powersync/common` `CommonPowerSyncDatabase.getCrudBatch`. Adjacency is an inference from SQLite's single-writer transactions, not a documented guarantee, so the code must not rely on it.)

### Multi-slot drag design (AC 7)

Current `handleDragEnd` (after Story 19.3): computes the dragged group's bounds, takes the group's own stored position values `groupPositions` (ascending), builds `reorderedGroup` with those values reassigned in the new display order, applies the optimistic update for the whole group, then enqueues **one** swap of `movedItem` (at `to`) and `displacedItem` (at `from`). For a drag of k > 1 slots, k−1 in-between items also change position locally but not on the server.

Decision: express the drag as a chain of adjacent swaps and reuse the existing `swap_ladder_positions` path. No new RPC, no migration, and the connector already treats every adjacent swap as a reorder pair. Why this over a bulk-reorder RPC: a partially uploaded chain is always a valid permutation (positions stay unique), the RPC and its RLS tests stay untouched, and the ordering fix in Tasks 1 to 3 is exactly what makes a chain of swaps safe to upload.

Algorithm, with `p = groupPositions` (the group's stored values by slot, before the drag), `g` = the group's items in their pre-drag display order, `f = from - groupStart`, `t = to - groupStart`, and the moved item `m = g[f]`:
- Dragging down (`f < t`): for `k = f … t-1`, swap `m` with the item currently below it: `itemA = m` at new position `p[k+1]`, `itemB = g[k+1]` at new position `p[k]`.
- Dragging up (`f > t`): for `k = f … t+1` (descending), swap `m` with the item currently above it: `itemA = m` at new position `p[k-1]`, `itemB = g[k-1]` at new position `p[k]`.
- `f == t` was already returned early. For `|f - t| == 1` this yields exactly today's single payload (`itemA` moved at its new position, `itemB` displaced at the moved item's old position), so existing tests hold.
- Final state: `m` at `p[t]`; every item between shifted one slot toward `f`; identical to `reorderedGroup` positions. Add a test that replays the enqueued swaps over the starting positions and compares to the optimistic order, so the two cannot drift apart again.
- Each enqueue is awaited in order (`for … of` with `await`), each becoming its own `_reorder` write transaction, so each is its own pair in `ps_crud`. Keep `updatedAt: Date.now()` per payload as today.
- Serialise drags: keep a `useRef<Promise<void>>` tail; each drag builds its payloads synchronously (positions are computed against the optimistic state at drop time) and then appends its chain to the tail (`tail.current = tail.current.then(runChain)`), so a second drag can never interleave its swaps into the first drag's chain. The chain function catches its own errors, so the tail never rejects.
- **Accepted risk:** if an enqueue fails partway through a chain (a local SQLite write error), the earlier swaps are already in the local database and `ps_crud`, while the screen shows the full optimistic order. This is logged only, no UI, as today's single-swap failure is; the next local-database refresh shows the partial order. A middle swap dropped on upload because an item was deleted elsewhere leaves a free position, not a collision (reasoned, not tested).
- The handler is currently synchronous and fire-and-forget (`.catch` logs). Keep the optimistic update synchronous; run the chain in an inner async function whose rejection is caught with the existing message so `handleDragEnd`'s return type and the DraggableFlatList contract do not change.

### Behaviour to preserve

- Same RPC arguments and the same three-string non-retryable list; do not widen it (AC 6).
- `batch.complete()` only after every unit succeeded or was a logged non-retryable swap. A thrown per-entry error leaves the whole batch queued and PowerSync retries it (default 5 s). Because uploads are idempotent (PUT upsert, absolute-position swap, PATCH to absolute values), re-sending earlier units on retry is safe and is how it works today.
- `ON_CONFLICT_OVERRIDES` and `_uploadEntry` untouched.

### Interaction with 19.7 (do not fix here)

If an insert earlier in the queue is permanently rejected (for example `uq_user_position`, or the old `user_onboarding_metadata` 403 fixed by migration 0034), `uploadData` throws on it, nothing after it uploads, and any reorder behind it waits. After this story that wait is correct (the swap is retried once the insert is accepted) rather than a silent loss, but a never-accepted insert still stalls the queue forever; that is Story 19.7's problem. Epic context says 19.6 and 19.7 both change `uploadData` ordering and error handling; 19.6 changes only the order and the unit shape. Build no failure policy, hook or extension point for 19.7 here; 19.7 extends the `UploadUnit` loop when it is picked up.

### Out of scope, but know it exists

- **Batch boundary.** `getCrudBatch(200)` could end between a pair's two entries (PowerSync documents that a transaction may be split over batches). The half-pair would then upload as a lone position PATCH and may violate `uq_user_position`. Pre-existing and unchanged; a 200-entry batch cannot occur from onboarding or a normal ladder session, so do not address it here. If it is ever hit it is a 19.7 (permanent rejection) symptom.
- **Atomic multi-write enqueue.** The multi-slot drag enqueues several independent swaps, not one atomic write. Each swap is a valid permutation on its own, so a partially uploaded chain leaves the server with unique positions. A single `writeTransaction` for several writes is the separate deferred item about `session/intent.tsx`; do not pull it in.

### Project Structure Notes

- Upload ordering is confined to `packages/sync/src/connector.ts` and `packages/sync/__tests__/connector.test.ts`. The drag fix (AC 7) is confined to `apps/mobile/app/ladder.tsx` and `apps/mobile/app/ladder.test.tsx`. No migration, no RPC change, no `packages/core` change.
- `packages/sync` uses Vitest. `@powersync/react-native` is mocked in the test file (it needs `react-native` at import); keep that `vi.mock` and add nothing that imports the real module.
- The PowerSync skill must be loaded before data/sync work (CLAUDE.md). Load `powersync` before implementing.
- Branch: `story/19-6-sync-upload-applies-reorder-after-inserts`, from `main`.

### Testing Requirements

- Unit: Vitest cases listed in Tasks 1 and 3. Use the existing `makeEntry`, `makeMockSupabase`, `makeMockDatabase` helpers; for call order use `vi.fn().mock.invocationCallOrder`. The mock `from` returns a fresh object per call whose `upsert` is a new `vi.fn()` each time, so to assert order across `from().upsert` and `rpc`, either hoist a shared `upsert` mock into `makeMockSupabase` or record calls in a shared array in the mocks.
- Drag (AC 7): the Jest tests in Task 5 are the proof; optionally on a device drag the first of four unfinished items to the third slot, reload from sync (or compare with a Supabase `select`) and confirm the server order matches. Manual repro (AC 5), from Story 19.1 device verification: EAS `preview` build, Wi-Fi and mobile data off, run onboarding, add two ladder items, reorder them, finish onboarding, reconnect. Expect the server (Supabase table editor / `select id, position from fear_ladder_items where user_id = …`) to hold the swapped order and the device list not to flip back. The Android Expo dev client does not download PowerSync data, so use the preview build for the download half.
- `pnpm turbo typecheck lint test` must be green. Do not push without asking (CI is ~70 min and paid).

### Previous Story Intelligence

- Story 19.1 found this bug; its verification table (`spec-19-1-…md`, "Offline onboarding, EAS preview build (e22d7d0)") is the authoritative repro.
- Story 19.3 touched `handleDragEnd` (group-bounded drags, stable position values) and deferred the multi-slot divergence to 19.6; AC 7 now closes that deferral. Its spec notes the drag "still sends a two-item swap, as before" — that is the behaviour changed here; its group-bounds and position-reuse logic is not.
- Story 6.2-C introduced `swap_ladder_positions` and the non-retryable classification; its review noted that retries are idempotent by construction (absolute positions). That is why replay-in-order on retry is safe.
- Recent branch convention for Epic 19 stories has used `spec-19-N-…md` files (bmad-build); this file follows the `bmad-create-story` default name. If the dev agent prefers a `spec-` file, rename and update `sprint-status.yaml` consistently.

### Git Intelligence

- `packages/sync/src/connector.ts` was last changed by `b2bc84b` (Story 6.2-C) and `8dad28e` (Story 6.2-A). Tests for the pair detection and error handling were written then; the style (one `it` per behaviour, named helpers) is the pattern to match.
- Recent `main` commits are Maestro/CI work (19.12) and unrelated.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` §Story 19.6 (line ~3388) and Epic 19 scope note (line ~485)]
- [Source: `_bmad-output/implementation-artifacts/epic-19-context.md` §Cross-Story Dependencies and §Technical Decisions ("A 4xx from the upload path blocks the whole queue")]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` §"Deferred from: Story 19.1 device verification (2026-10-06)" and the 19.3 multi-slot drag entry]
- [Source: `_bmad-output/implementation-artifacts/spec-19-1-onboarding-courage-ladder-do-this-later-and-back-navigation.md` verification table]
- [Source: `_bmad-output/implementation-artifacts/6-2-c-ladder-item-delete.md` AC 2/3]
- [Source: `supabase/migrations/0026_swap_ladder_positions_rpc.sql`]
- [Source: `packages/sync/src/connector.ts`, `packages/sync/src/adapter.ts`, `packages/sync/__tests__/connector.test.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-5-5 (implemented directly, no subagents)

### Debug Log References

- Baseline: `1ca4e52`. Task 1: the five new `connector.test.ts` cases (inserts → swap order, failed insert, delete → swap, two swaps + PATCH, non-pair group not regrouped) were run against unmodified `connector.ts` first and all 5 failed; after the fix 31/31 pass in `packages/sync`.
- `pnpm turbo typecheck lint` (sync + mobile): 7/7 successful. Mobile Jest 606/606 (ladder.test.tsx 64/64, the three existing drag tests unmodified).
- The fresh worktree needed `pnpm install` and `pnpm turbo build --filter='@exposure-buddy/sync^...'` before tests could resolve workspace packages.

### Completion Notes List

- **Approach (AC 2): preserve `ps_crud` order.** `groupReorderPairs` is replaced by `toUploadUnits`: only reorder pairs are grouped (emitted at their first entry's slot, second entry skipped); every other entry, including members of non-pair groups, stays in place. `uploadData` has one loop and the unchanged error policy. Cases: (a) earlier batch: swap alone, existing test; (b) same batch: insert precedes swap; (c) failing insert: `uploadData` throws before the swap, batch not completed, swap stays queued. Rejected "pairs last": it drops `swap A,B` then `DELETE A` and reorders a swap against a later PATCH.
- **AC 6:** no dead-lettering, retry cap or new non-retryable classes; the three `NON_RETRYABLE_RPC_ERRORS` untouched.
- **AC 7:** `handleDragEnd` builds k adjacent swaps (moved item vs neighbour, positions from the group's own stored values) and runs them through a ref-held promise tail so separate drags cannot interleave; the first enqueue of an idle chain stays synchronous. Jest replays the enqueued swaps over the starting positions and compares to the optimistic order. Accepted risk as in Dev Notes (partial chain on a local write failure).
- **AC 5: not verified on a device or with the offline preview-build repro.** Only unit/Jest coverage was run.

### File List

- `packages/sync/src/connector.ts`
- `packages/sync/__tests__/connector.test.ts`
- `apps/mobile/app/ladder.tsx`
- `apps/mobile/app/ladder.test.tsx`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
