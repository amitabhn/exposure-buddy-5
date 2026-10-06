---
title: 'Courage Ladder — Completed Items Sink and Grey Out'
type: 'feature'
created: '2026-10-06'
status: 'done'
route: 'dispatch'
baseline_commit: '0e8d11187b5b340b72c2e697aa6710f03e8650ca'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (Beta feedback item 4.) On `ladder.tsx` completed items sit among unfinished ones in position order, so the user cannot see at a glance what is left.

**Approach:** Show the ladder with unfinished items first and completed items after them, greyed but legible and carrying a non-colour "Done" cue. The ordering is a pure display sort in `packages/core`; stored `position` values are never rewritten by it.

**Decision (recorded per the epic's AC):** tapping a completed item behaves as today — it opens the edit sheet, where "Start session" stays available (re-practice, existing T7.1 behaviour). Completed rows are draggable too (human decision 2026-10-06), but only within the completed group; a drop across the group boundary is ignored and the row snaps back.

## Boundaries & Constraints

**Always:** Unfinished items keep their relative order; completed items follow in position order. Greyed styling keeps text contrast at 4.5:1 or better (muted colour, not opacity). A completed row shows a check mark plus the "Done" label and its accessibility label names the status. Home's lowest-pending selection (`resolveLowestPendingItem`) is unchanged. New copy, if any, lives in `en.json` and `hi.json`. `packages/core` stays free of RN/Expo/Supabase imports.

**Never:** No migration, no PowerSync schema change, no new stored field. The display sort must not write positions. Do not change `useFearLadderItems`'s query, the Start-session handler, or the onboarding ladder. A drag must never leave an unfinished item below a completed one (cross-group drops are ignored).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mixed ladder | Positions 1 done, 2 pending, 3 done, 4 pending | Order shown: 2, 4, 1, 3; 1 and 3 greyed with check + "Done" | N/A |
| All pending / all done / empty | — | Position order unchanged / all greyed / existing empty state | N/A |
| Equal positions | Two items, same position | Tie broken by id, deterministic | N/A |
| Tap completed item | Tap | Edit sheet opens with Start session (re-practice) | N/A |
| Drag within a group | Reorder unfinished among unfinished, or completed among completed | Positions are exchanged only among that group's own position values; the other group is untouched | Enqueue failure logged as today |
| Drag across groups | Drop an unfinished row among completed rows, or the reverse | Ignored: no write, row snaps back | N/A |
| Complete an item | Status flips to completed | Item moves below the unfinished ones | N/A |
| Home | Mixed ladder | Next step is still the lowest-position pending item | N/A |

</frozen-after-approval>

## Code Map

- `packages/core/src/selectors/fearLadder.ts` -- add pure `sortLadderForDisplay(items)` beside `resolveLowestPendingItem`; export from `packages/core/src/index.ts`
- `packages/core/src/__tests__/selectors/fearLadder.test.ts` -- add sort tests (matrix rows, no input mutation)
- `apps/mobile/app/ladder.tsx` -- `items` state stays position-ordered (`:40`, `:140`); derive pending/completed lists; `DraggableFlatList` (`:362`) gets the display-sorted list (completed rows muted); `handleDragEnd` (`:290`) ignores cross-group drops and maps an in-group move onto that group's existing positions instead of `index + 1`; badge helpers `:322`
- `apps/mobile/app/ladder.test.tsx` -- DraggableFlatList mock (`:5`) needs to expose `onDragEnd`; add ordering, cue, tap and drag tests
- `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- `ladder.statusCompleted` exists ("Done"); add a completed-row accessibility label only if the existing one is insufficient
- `apps/mobile/app/(app)/index.tsx` -- reads `resolveLowestPendingItem`; do not modify

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/selectors/fearLadder.ts`, `index.ts`, `__tests__/selectors/fearLadder.test.ts` -- pure display sort + unit tests for the matrix
- [x] `apps/mobile/app/ladder.tsx` -- display-sorted list, completed rows greyed with check + Done, drag remaps onto the dragged group's positions, cross-group drops ignored
- [x] `apps/mobile/app/ladder.test.tsx` -- update the mock; tests for order, cue/accessibility label, tapping a completed item, in-group drag payload using existing position values (both groups), cross-group drop ignored
- [x] `apps/mobile/src/i18n/locales/en.json`, `hi.json` -- only if new copy is needed

**Acceptance Criteria:**
- Given a ladder with completed items, when it is shown, then completed items render after all unfinished ones, greyed, legible, with a check mark and "Done" that screen readers also announce
- Given the display sort, when applied, then unfinished items keep their relative order and no stored position is written
- Given a completed item, when tapped, then the edit sheet opens and re-practice is available
- Given a mixed ladder, when Home loads, then the next step is unchanged
- Given either group, when a row is dragged within it, then the enqueued reorder uses that group's real stored position values and the other group's positions are untouched
- Given a drop across the group boundary, when released, then nothing is written and the row returns

## Implementation Notes

- Implemented directly from the spec (no subagent). Files: `packages/core/src/selectors/fearLadder.ts` (`sortLadderForDisplay`, exported from `index.ts`) + tests; `apps/mobile/app/ladder.tsx` (display-sorted list, muted completed rows with check mark + Done, group-aware `handleDragEnd`); `ladder.test.tsx` (list mock exposes `onDragEnd`; `@exposure-buddy/core` mock gets the real sort; 6 new tests).
- No new copy: the existing `ladder.statusCompleted` ("Done") is reused and already in the row's accessibility label; the check mark is decorative.
- Cross-group drop: `setItems(prev => [...prev])` forces a new `displayItems` reference so the list snaps back.
- Muted style: `surface.secondary` fill with `content.secondary` text (measured 5.1:1), no opacity.
- Verified: core Vitest 100/100, mobile Jest 574/574 (45 suites), `pnpm turbo typecheck lint` clean. `packages/core` was rebuilt (`dist`) so the mobile app resolves the new export.

## Spec Change Log

## Review Triage Log

Layers run 2026-10-06 as subagents: Blind Hunter (13 findings), Edge Case Hunter (11), Verification Gap (1 + 1 other). No intent_gap or bad_spec entries; `review_loop_iteration` stays 0.

| # | Layer | Finding | Verdict | Route / evidence |
|---|-------|---------|---------|------------------|
| 1 | Blind, Edge | A drag of more than one slot enqueues a two-item swap while the optimistic state shifts every in-between item | medium | defer — pre-existing (the old handler did the same); Story 19.6 owns reorder upload; noted in Design Notes |
| 2 | Edge | Tied or non-contiguous stored positions make a swap a no-op | low | rejected — positions are unique in practice; fix adds guards |
| 3 | Edge | `reorderedData` could differ from `displayItems` if a sync lands mid-drag | low | rejected — contrived; fix adds a branch |
| 4 | Blind, Edge | Cross-group snap-back relies on a new array identity and is unverified with the real list | maybe-false | defer — settle by dragging across the boundary on a device |
| 5 | Edge, Blind | Statuses other than `completed` sort as unfinished | false | `useFearLadderItems` filters rows to `pending` / `completed` only |
| 6 | Blind, Edge | `localeCompare` id tie-break is locale-dependent | low | rejected — same tie-break as `resolveLowestPendingItem`; ties are rare |
| 7 | Edge | New item gets `items.length + 1`, which can collide after deletions | low | defer — pre-existing, not caused by this story |
| 8 | Blind, Edge | No tests for all-completed drag or post-drag order | medium | patch — added an all-completed drag test and rendered-order assertions after both within-group drags (`ladder.test.tsx`) |
| 9 | Verification | Cross-boundary test's label assertion cannot fail (mock never moves rows) | low | rejected — the mock cannot model the real snap-back; the no-enqueue assertion is the real check; device check is item 4 |
| 10 | Blind, Edge | Check mark not hidden from accessibility | false | the touchable's `accessibilityLabel` replaces its children's text for screen readers |
| 11 | Blind | Contrast figure unverified | false | computed 5.1:1 (`#4A6B62` on `#EBF0EE`); spec note corrected |
| 12 | Blind, Verification | Test reaches into `packages/core/src` by relative path; `index.ts` export untested in mobile | low | rejected — avoids depending on the built `dist`; typecheck and the runtime import cover the export |
| 13 | Blind | Dragged completed row turns white mid-drag | low | rejected — cosmetic, matches the existing dragging style |
| 14 | Blind | `firstInteractiveRef` now targets the first sorted row; `mockEnqueue` leakage; hard-coded colours; untracked files | false | index 0 is still the first visible row; `jest.clearAllMocks` runs in `beforeEach`; colours are tokens; untracked files excluded from the diff |

## Design Notes

Dragging today renumbers by display index, which would rewrite stored ranks once the display order differs from storage order. An in-group reorder reuses that group's own sorted position values, so the other group's positions are never touched; a cross-group drop is ignored because the list is derived from state and snaps back. Drags of more than one slot still send a two-item swap, as before (Story 19.6 owns reorder-upload behaviour).

## Verification

**Commands:**
- `cd packages/core && pnpm vitest run` -- expected: pass
- `cd apps/mobile && npx jest app/ladder "app/\(app\)/index"` -- expected: pass
- `pnpm turbo typecheck lint` -- expected: clean

**Manual checks (if no CLI):**
- On a device: ladder with a mix shows unfinished first, completed greyed with Done; complete an item and see it sink; drag among unfinished works; Home next step unchanged
