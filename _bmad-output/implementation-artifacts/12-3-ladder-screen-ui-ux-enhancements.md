# Story 12.3: Ladder Screen — UI/UX Enhancements

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user reviewing or editing my courage ladder,
I want the ladder screen to match the app's redesigned visual language and to behave correctly when a save fails, a stored SUDS value is out of range, or the screen reader tries to focus the list right after it loads,
So that the screen is both visually consistent with the rest of the redesigned app (FR-UXENH-01) and doesn't silently corrupt state or accessibility behaviour under edge conditions the original Story 5.1 implementation already flagged as future risks.

*Source: Claude Design project "Exposure Buddy" (`Home - Redesign.dc.html`'s `showLadder` sub-view — same file Story 12.2 pulled Home from; no separate "Ladder" mockup file exists) for the visual-redesign portion. The three logic ACs below trace to `deferred-work.md`'s `5-1-D1`, `5-1-D3`, `5-1-D5` (deferred from Story 5.1's 2026-06-04 code review, explicitly pending "when Epic 6 wires a real adapter" / "when the real data path is wired" — Epic 6 is now done, so these are no longer speculative).*

**Screen in scope:** `apps/mobile/app/ladder.tsx` (post-onboarding full courage ladder screen). The onboarding-time ladder at `apps/mobile/app/(onboarding)/ladder.tsx` is a distinct screen and out of scope.

---

## Acceptance Criteria

Full Given/When/Then text lives under Story 12.3 in `_bmad-output/planning-artifacts/epics.md` (Epic 12). Summary:

### Part A — Visual redesign (implemented, commit `adcda38` on this branch)

1. Native `Stack.Screen` header replaced with a custom inline header (`BackButton` + title `Text`), matching the no-native-chrome precedent Stories 12.1/12.2 established.
2. Row cards restyled: white background, `#E3EAE7` border (documented raw-hex — no equivalent in `packages/ui`'s 8 semantic tokens, same convention as `#9AAEA7` in `sign-in.tsx`, Story 12.1), `radius.card`, drag handle moved to the left.
3. Item meta line switches from a raw `"{suds}/10 · {status}"` literal to the `sudsPrefix`/`sudsSuffix` i18n pattern Story 12.2 established for `home.nextStep`.
4. Inline status text replaced with a Done/To-do pill (`badgeDone`/`badgeToDo` styles); `#B8863A` badge text is a second documented raw-hex gap.
5. Screen title copy: "Your Courage Ladder" → "Your Ladder" (matches mockup + existing `home.actions.yourLadder` wording).
6. Edit-modal sheet restyled (white background, `#d7e0dc` input borders, token-based radii via `radius.button`/`radius.input`).
7. The mockup's Edit-situation sub-view shows read-only fields with no Start-session affordance; the real screen **keeps** editable `TextInput`s, Cancel/Save/Remove, and the Start-session button (already relocated into the edit modal by a prior same-day pass) — only visual language changed, not interaction structure.
8. `pnpm turbo typecheck lint test` green (401/401 mobile Jest tests) — confirmed before this story file was created.

### Part B — Logic/robustness fixes (open — this story's remaining scope)

**AC-B1 (optimistic-update rollback).** Given `handleSubmit`'s add and edit paths call `setItems(...)` optimistically before `await getAdapter().enqueue(...)` (`apps/mobile/app/ladder.tsx:84-129`), and the `catch` block only `console.error`s with no rollback or user-facing feedback, when `enqueue` throws, then:
- The prior `items` array is snapshotted before each optimistic update and restored in the `catch` block for both the add and edit paths.
- The user sees an error message reusing the existing `saveFailed`/`tryAgain` retry pattern from `apps/mobile/app/session/debrief.tsx` (inline text with `accessibilityLiveRegion="polite"` + a retry button that re-invokes the same submit path) instead of a silently orphaned "ghost" item.
- The form stays open on failure (does not silently close) so the user's typed input isn't lost and they can retry or cancel explicitly.

**AC-B2 (SUDS edit-path clamp).** Given `openEditForm` sets `predictedSuds` directly from `item.predictedSuds` (`apps/mobile/app/ladder.tsx:64-69`) with no range/integer clamp — unlike the form's own `TextInput.onChangeText` handler, which already parses and clamps typed input to an integer 0–10 (lines 295-298) — when `openEditForm` runs, then `item.predictedSuds` is clamped to an integer in `[0, 10]` before being set into form state, so a non-integer or out-of-range value arriving via a future sync conflict cannot round-trip through the edit form unmodified.

**AC-B3 (accessibility focus timing race).** Given the focus-on-mount effect (`apps/mobile/app/ladder.tsx:41-50`) fires `AccessibilityInfo.setAccessibilityFocus` after a fixed 100ms `setTimeout`, which races `DraggableFlatList`'s virtualized layout when real items exist (reliably hits the empty-state Add button, but can silently miss the first item row), when this story is implemented, then the focus trigger is replaced with a layout-driven signal (`onLayout` on the first row, or a retry-until-ref-exists check) instead of a fixed timer, and the fix is verified on-device with VoiceOver (iOS) and TalkBack (Android) — not just static inspection, since timing-based accessibility bugs frequently look fixed in code but still fail in the real screen-reader runtime.

---

## Tasks / Subtasks

### T1 — Visual redesign (AC: Part A) — DONE, already on this branch

- [x] Custom inline header, restyled cards/badges/modal, `sudsPrefix`/`sudsSuffix` i18n keys, `radius.*` tokens — see commit `adcda38`
- [x] `pnpm turbo typecheck lint test` green (401/401 mobile Jest tests)

### T2 — Optimistic-update rollback + retry UI (AC: B1)

- [ ] In `handleSubmit`'s edit branch: capture `const previousItems = items` before `setItems(prev => prev.map(...))`; in `catch`, call `setItems(previousItems)`
- [ ] In `handleSubmit`'s add branch: capture `const previousItems = items` before `setItems(prev => [...prev, newItem])`; in `catch`, call `setItems(previousItems)`
- [ ] Add `const [saveError, setSaveError] = useState<string | null>(null)`; clear it at the start of `handleSubmit`, set it to `t('ladder.saveFailed')` in each `catch` block (mirror `session/debrief.tsx`'s `saveError`/`handleSubmitReflection` shape)
- [ ] On failure, do **not** call `closeForm()` — leave the modal open with the error + retry visible so typed input isn't lost
- [ ] Render the error text (`accessibilityLiveRegion="polite"`) + a `t('ladder.tryAgain')` retry button inside the modal when `saveError` is set, styled consistent with `debrief.tsx`'s `saveErrorText`/`retryButton`
- [ ] Add `ladder.saveFailed` / `ladder.tryAgain` keys to `en.json` and `hi.json` (reuse `session.debrief.saveFailed`'s wording pattern: "We couldn't save your situation. It's stored on your device and will sync when you reconnect." — adapt "situation" wording to match `ladder.descriptionLabel`'s existing terminology)
- [ ] Tests: enqueue-rejects-on-add restores `items` to pre-optimistic state and shows error+retry; enqueue-rejects-on-edit does the same; pressing retry re-calls `enqueue` with the same payload; a subsequent successful retry clears `saveError` and closes the form

### T3 — SUDS clamp on edit-open (AC: B2)

- [ ] Add a small integer-clamp helper (inline or shared) — same clamp shape as the existing `TextInput.onChangeText` handler (lines 295-298), but clamping a `number` input directly (not parsing a string): `Math.min(10, Math.max(0, Math.round(item.predictedSuds)))`
- [ ] Apply it in `openEditForm` when calling `setPredictedSuds(...)`
- [ ] Tests: `openEditForm` with `predictedSuds: 12` → form shows `10`; with `-3` → shows `0`; with `7.6` → shows `8` (rounds); with `5` (already valid) → shows `5` unchanged

### T4 — Accessibility focus timing fix (AC: B3)

- [ ] Replace the fixed 100ms `setTimeout` (lines 41-50) with a layout-driven trigger — either `onLayout` on the first `DraggableFlatList` row (fire focus once that row has laid out) or a bounded retry-until-ref-exists loop; do not remove the empty-state (Add button) focus path, which the Story 9.3 audit already confirmed works correctly
- [ ] Keep behavior symmetric: empty list still focuses the Add button; non-empty list focuses the first item row, now reliably
- [ ] Manual on-device verification: VoiceOver (iOS) and TalkBack (Android) both land focus on the first item row when the ladder has ≥1 item, and on the Add button when empty — record the verification in Dev Agent Record, this AC is not satisfied by unit tests alone
- [ ] Existing unit tests (`accessibility focus set on first item after 100ms`, `accessibility focus set on Add button when empty`) will need updating to match whatever timing mechanism replaces the fixed timeout — keep both cases covered, just no longer keyed to a hardcoded 100ms

### T5 — Final verification

- [ ] `pnpm turbo typecheck lint test` green across all packages/apps
- [ ] Update sprint-status.yaml / epics.md status notes once all of T2-T4 are complete and reviewed

---

## Dev Notes

- **This story's Part A is already implemented and committed** (`adcda38`, this branch) — it was done directly against the epics.md placeholder before this story file existed, which is why `apps/mobile/app/ladder.tsx`'s current on-disk state already reflects the AC-Part-A visual changes. Do not re-implement Part A; T2-T4 build on top of the current file as-is.

- **`enqueue()` failure is a local write failure, not a network sync failure — this matters for which architecture rule applies.** `packages/sync/src/adapter.ts`'s `PowerSyncSyncAdapter.enqueue()` executes a synchronous local SQLite write (`this.db.execute(...)`) and throws on schema/constraint problems *before* anything reaches the network. This is distinct from `implementation-patterns-consistency-rules.md`'s Validation Patterns section, which describes "transient sync failure" (optimistic UI stays, non-blocking async notification only, never 'Error') for failures during *later* background sync to Supabase. A thrown `enqueue()` error means the write was never durably queued at all — the correct precedent is the doc's adjacent rule: "Failed outbox writes must be logged... silent discard is a compliance event," and the established UI precedent for this exact failure category is `session/debrief.tsx`'s `saveError`/`tryAgain` inline-retry pattern (also wrapping an `enqueue()` call). AC-B1 follows that precedent, not the "stay optimistic, no error" rule — don't let that section of the architecture doc talk you out of the rollback+error UI this AC specifies.

- **The Story 9.3 accessibility audit already reviewed this exact focus mechanism and found "No findings."** `apps/mobile/docs/accessibility-audit.md` (line ~259) says of `ladder.tsx`: "Manual `AccessibilityInfo.setAccessibilityFocus` on mount (lines 40-49) correctly manages initial focus. No findings." That audit was static/code-review based and evaluated the *presence* of focus-management code, not its runtime timing against `DraggableFlatList`'s virtualized layout. AC-B3 is not new — it's the original `5-1-D3` finding from Story 5.1's 2026-06-04 code review, deferred at the time because `useFearLadderItems` returned an empty stub (so the race was unreachable — focus always landed on the Add button). Epic 6 replaced the stub with live PowerSync data, so the race is now reachable whenever the ladder has items. Don't treat the 9.3 "No findings" note as evidence this is already fixed.

- **A separate, unrelated `useFocusOnMount` hook exists** (`apps/mobile/src/hooks/useFocusOnMount.ts`) but is **not** the right tool here without modification: it only fires focus when `reduced` (reduce-motion) is active, via `useFocusEffect` — it's built for post-navigation focus placement on reduced-motion screens (A11Y-004), a different trigger condition than "always focus on mount regardless of motion setting," which is `ladder.tsx`'s current (and still-desired, per AC-B3's own wording) behavior. Do not swap in `useFocusOnMount` as-is; it would silently stop focusing on mount for users without reduce-motion enabled. If you see an opportunity to unify the two patterns, flag it as a follow-up rather than changing ladder's behavior as a side effect of this AC.

- **SUDS clamp precedent already exists in this exact file** — the form's `TextInput.onChangeText` handler (lines 295-298) already clamps typed input to `[0, 10]` by discarding out-of-range/NaN values (sets `null`, not clamped-to-boundary). AC-B2 asks for boundary-clamping (not null-on-invalid) since the source here is a stored numeric value, not raw user keystrokes — don't copy the `onChangeText` handler's reject-to-null behavior verbatim; the two need different failure semantics (typed garbage → force user to retype; a stored out-of-range value → clamp and show something sane).

- **Architecture boundary:** `packages/core`'s `FearLadderItem.predictedSuds` is typed `number` with no integer/range constraint at the type level (`packages/core/src/selectors/fearLadder.ts:8`) — the clamp in AC-B2 is a UI-layer defense, matching the pattern Story 6.2-B AC5 already established for `CourageLadderEntryCard`'s SUDS display (also a defense-in-depth clamp on a value the type system doesn't constrain).

- **Test file location:** `apps/mobile/app/ladder.test.tsx` (co-located, existing file — currently has 24 tests, none covering rollback, clamp, or the layout-driven focus mechanism). Existing mocks: `mockEnqueue` defaults to `mockResolvedValue(undefined)` — T2's rollback tests need a per-test override to `mockRejectedValueOnce(...)`, following the same per-test-overridable-mock pattern Story 12.2's T8 amendment established for `resolveLowestPendingItem`.

- **i18n:** both `en.json` and `hi.json` need the new `ladder.saveFailed`/`ladder.tryAgain` keys (T2). Check current Hindi-activation convention in `deferred-work.md`/Story 9.9 notes before deciding whether to translate now or duplicate English pending Hindi activation — `en.json`/`hi.json` currently carry mixed precedent (see Story 12.2's `calmMe.fabLabel` deferred note for the duplicate-English convention).

### Project Structure Notes

- All changes stay within `apps/mobile/app/ladder.tsx` and `apps/mobile/app/ladder.test.tsx`, plus the two locale files. No `packages/*` changes expected for T2-T4 (contrast with Story 12.2, which needed new `packages/ui` components — this story's remaining scope is screen-local logic, not shared UI).
- No conflicts detected with the monorepo boundary rules (ARC-011, `packages/core` zero-RN-imports) — none of T2-T4 touches `packages/core`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 12.3] — full AC text, Part A implementation summary
- [Source: _bmad-output/implementation-artifacts/deferred-work.md#Deferred from: code review of 5-1-full-courage-ladder-screen (2026-06-04)] — original 5-1-D1, 5-1-D3, 5-1-D5 findings this story resolves
- [Source: apps/mobile/app/session/debrief.tsx:100-121, 201-219] — `saveError`/`tryAgain` retry pattern being reused for AC-B1
- [Source: packages/sync/src/adapter.ts:20-61] — `enqueue()` semantics (local write, throws before any network call)
- [Source: apps/mobile/docs/accessibility-audit.md ladder.tsx (root) section] — prior "No findings" audit note and why it doesn't cover AC-B3's runtime race
- [Source: apps/mobile/src/hooks/useFocusOnMount.ts] — adjacent but not directly applicable focus-management hook
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#State Management Patterns, #Validation Patterns] — optimistic-UI / sync-failure handling rules and why AC-B1 follows the "failed outbox write" precedent, not the "transient sync failure" one

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- `apps/mobile/app/ladder.tsx` (already modified — Part A, commit `adcda38`; T2-T4 pending)
- `apps/mobile/app/ladder.test.tsx` (already modified — Part A test updates, commit `adcda38`; T2-T4 test additions pending)
- `apps/mobile/src/i18n/locales/en.json` (already modified — Part A keys, commit `adcda38`; T2 keys pending)
- `apps/mobile/src/i18n/locales/hi.json` (already modified — Part A keys, commit `adcda38`; T2 keys pending)

### Change Log

- 2026-09-17 — Story file created retroactively for the already-implemented Part A visual redesign (commit `adcda38`) plus formal scoping of the three open logic ACs (B1-B3), sourced from `deferred-work.md`'s `5-1-D1`/`5-1-D3`/`5-1-D5` and `epics.md`'s Story 12.3 entry. Status: ready-for-dev (for T2-T4; T1 already done).
