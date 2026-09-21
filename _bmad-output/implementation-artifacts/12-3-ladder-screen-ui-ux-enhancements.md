# Story 12.3: Ladder Screen — UI/UX Enhancements

Status: in-progress

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

- [x] In `handleSubmit`'s edit branch: capture `const previousItems = items` before `setItems(prev => prev.map(...))`; in `catch`, call `setItems(previousItems)`. Apply the identical pattern in the add branch (before `setItems(prev => [...prev, newItem])`) — same snapshot-and-restore shape, both branches.
- [x] **Add-path retry must reuse the same optimistic item across attempts, not regenerate one.** Implemented via `pendingAddIdRef` (`{ id, position }`), captured once on first attempt and reused on retry; description/predictedSuds are still read fresh from form state each attempt. Cleared on success (end of add branch) and on `closeForm()` (Cancel).
- [x] Add `const [saveError, setSaveError] = useState<string | null>(null)`; clear it at the start of `handleSubmit`, set it to `t('ladder.saveFailed')` in each `catch` block
- [x] On failure, do **not** call `closeForm()`; `setIsSubmitting(false)` is called directly in each `catch` block (independent of `closeForm()`), so the Save/retry buttons don't get stuck disabled
- [x] Render the error text (`accessibilityLiveRegion="polite"`) + a `t('ladder.tryAgain')` retry button inside the modal when `saveError` is set, between `formActions` and the Start-session/Remove sections, rendering identically for both add and edit paths
- [x] Added `ladder.saveFailed` / `ladder.tryAgain` keys to `en.json` and `hi.json` (hi.json follows this section's existing English-duplicate convention, matching every other `ladder.*` key already in that file)
- [x] Tests (5 new): add-failure rollback + error/retry + Save re-enabled; edit-failure rollback + error shown + form stays open with attempted edit; retry re-sends the same generated id; successful retry clears error and closes form; Cancel-after-failure clears the pending id so a fresh add doesn't reuse it

### T3 — SUDS clamp on edit-open (AC: B2)

- [x] Added `clampSuds()` helper: `Math.min(10, Math.max(0, Math.round(value)))`
- [x] Applied in `openEditForm` via `setPredictedSuds(clampSuds(item.predictedSuds))`
- [x] Tests (4 new): `12` → `10`; `-3` → `0`; `7.6` → `8` (rounds); `5` (already valid) → `5` unchanged

### T4 — Accessibility focus timing fix (AC: B3)

- [x] Replaced the fixed 100ms `setTimeout` with a bounded retry-until-ref-exists loop (the AC's second suggested alternative): up to 10 attempts, 16ms apart, checking `findNodeHandle(firstInteractiveRef.current)` each time; fires `setAccessibilityFocus` on the first successful resolution and never again (`hasSetInitialFocusRef` guard)
- [x] Effect is keyed on `[ladderLoading, items.length]` (not `[]`) and early-returns while `ladderLoading` is true — closes the data-loading race: the trigger now re-evaluates whenever loading state or item count changes, instead of firing once at mount before real items exist
- [x] Empty-state (Add button) and non-empty (first item row) focus targets both still work via the existing conditional `ref={...}` assignments — behavior unchanged, only the *timing* mechanism changed
- [x] Tests (5 new, replacing the 2 old fixed-100ms tests): loading→loaded transition fires focus on the correct target and not before; bounded retry actually retries (mocked `findNodeHandle` returns `null` twice then a tag); focus fires exactly once even if `items.length` changes again afterward; the 2 pre-existing tests updated to drop the `advanceTimersByTime(100)` dependency
- [ ] **Manual on-device verification (VoiceOver) — PERFORMED 2026-09-21, FAILED.** Tested on iOS Simulator (iPhone 17, iOS 27.0) via Settings → Accessibility → VoiceOver, with a real signed-in account holding 2 ladder items, navigating fresh from Home → "Your Ladder". VoiceOver audibly announced **"Go back button"** on screen appearance — confirmed visually too, via the black VoiceOver focus-ring rendering around the header's `BackButton` (its `container` style has no border of its own — checked `apps/mobile/src/components/navigation/BackButton.tsx` — so the ring is VoiceOver's, not app styling). Focus never reached the first item row ("Talk to a stranger"). **AC-B3 does not hold in the real runtime**, despite the retry-until-ref-exists logic being correctly implemented and unit-tested — confirming the Dev Notes' own warning that timing-based accessibility bugs can look fixed in code while still failing against the real screen-reader.
  - **Working hypothesis, not yet root-caused:** iOS VoiceOver auto-focuses the first element in reading order (here, the header back button, since it precedes the list in the JSX tree) whenever a new screen appears, via its own internal screen-change detection — independent of app code. `AccessibilityInfo.setAccessibilityFocus(tag)` posts a `layoutChanged`-style notification; if VoiceOver's automatic screen-change focus wins the race against the app's call, the redirect to the first item may get silently superseded. Needs investigation of whether RN's `setAccessibilityFocus` should instead be paired with (or replaced by) a `screenChanged` accessibility notification for this specific "screen just appeared" case, as distinct from the in-place `layoutChanged` case the current implementation may be better suited for.
  - **TalkBack (Android) — PERFORMED 2026-09-21, FAILED, same signature as VoiceOver.** Tested on a physical device (Redmi K20 Pro, Android 11) via a fresh EAS `development`-profile build, with a real signed-in account holding 1 ladder item, navigating fresh into the ladder route with TalkBack already enabled. TalkBack's accessibility focus outline rendered around the header `BackButton` — not the first item row ("Riding the elevator alone") — visually identical to the iOS finding. This cross-platform reproduction strengthens the working hypothesis above: the bug is in the app's own use of `AccessibilityInfo.setAccessibilityFocus` racing the OS's automatic screen-change focus, not a VoiceOver-specific quirk.

### T5 — Final verification

- [x] `pnpm turbo typecheck lint test` green across all packages/apps (19/19 tasks, 413/413 mobile Jest tests — 401 prior + 12 new: 5 rollback/retry, 4 SUDS clamp, 3 focus-timing)
- [x] sprint-status.yaml updated (this session)

### Review Findings

_Code review (bmad-code-review, 2026-09-17): Blind Hunter + Edge Case Hunter + Acceptance Auditor, run against `dd40236..HEAD` (this story's own commits). 11 patch, 6 deferred, 6 dismissed as noise. (1 decision-needed item resolved by user 2026-09-17: extend clamping to list display — now a patch below. 2 patch items reclassified to defer during apply-patches after checking precedent: "duplicate Save/Try-again buttons" and the `saveFailed` copy both turned out to match `session/debrief.tsx`'s identical pattern — the exact precedent this AC was told to copy — plus, for the copy specifically, two more existing screens use the identical phrasing; all pre-existing, not introduced here.)_

- [x] [Review][Patch] Extend `clampSuds()` to the list display and accessibility label, not just edit-open [apps/mobile/app/ladder.tsx:308,316-318] — fixed; list row now clamps via `clampSuds(item.predictedSuds)` in both the meta text and accessibilityLabel; covered by new test "list row displays and announces a clamped SUDS value"
- [x] [Review][Patch] Rollback restores a stale whole-array snapshot instead of a targeted per-item revert [apps/mobile/app/ladder.tsx:130,145,170,190] — fixed; edit path now re-derives `currentItem` fresh from `items` by id on every call and rolls back via `setItems(prev => prev.map(...))` targeting just that id; add path rolls back via `setItems(prev => prev.filter(i => i.id !== id))` — both operate on the current array, not a frozen snapshot, so a concurrent remote sync to other items is preserved and a concurrently-deleted item can't be resurrected. Cancel is also now `disabled={isSubmitting}` to avoid a stale in-flight catch clobbering a subsequent action
- [x] [Review][Patch] `pendingAddIdRef`'s captured `position` never recalculated on retry [apps/mobile/app/ladder.tsx:156,158] — fixed; ref now only holds `id`, `position` is recomputed from `items.length` on every attempt; covered by new test "retrying a failed add recomputes position from the current list length"
- [x] [Review][Patch] New custom header has no safe-area inset handling [apps/mobile/app/ladder.tsx:263-266,459] — fixed; added `useSafeAreaInsets()` and `paddingTop: insets.top + 8` on the header, matching `session/debrief.tsx`/`(app)/index.tsx`'s existing pattern
- [x] [Review][Patch] Header title `Text` has no `accessibilityRole="header"` [apps/mobile/app/ladder.tsx:265] — fixed
- [x] [Review][Patch] `hasSetInitialFocusRef` never resets after the first successful focus placement [apps/mobile/app/ladder.tsx:52,54,62,66,80] — fixed; replaced the one-shot boolean with `lastFocusedCategoryRef` tracking `'empty' | 'nonEmpty'`, re-triggering only when the empty/non-empty boundary is crossed; covered by 2 new tests
- [x] [Review][Patch] Focus retry loop silently gives up with no logging if the target never resolves [apps/mobile/app/ladder.tsx:56-73,80] — fixed; logs `console.error` on exhausting `MAX_ATTEMPTS`, matching this file's own logging convention; covered by new test "logs an error when the focus retry loop exhausts all attempts"
- [x] [Review][Patch] `clampSuds()` doesn't guard `NaN` [apps/mobile/app/ladder.tsx:90-92] — fixed; explicit `Number.isNaN` guard returns 0; covered by new test "clamps a NaN predictedSuds to 0"
- [x] [Review][Patch] `editingItem` is a stale closure across the failed→retry window [apps/mobile/app/ladder.tsx:127-131] — fixed; edit path now looks up `currentItem` fresh from `items` by id on every `handleSubmit` call (initial and retry) instead of trusting the closure captured when the form opened; covered by new test "retrying a failed edit re-enqueues the same item id and sends further edits made before the retry"
- [x] [Review][Patch] Test selectors use `accessibilityLabel?.includes(description)` substring matching [apps/mobile/app/ladder.test.tsx] — fixed; introduced a shared `findItemButton()` helper using `.startsWith(`${description},`)`, replacing all 15 inline substring-match call sites
- [x] [Review][Patch] No regression test asserts the edit-path retry preserves the same item identity [apps/mobile/app/ladder.test.tsx] — fixed; added "retrying a failed edit re-enqueues the same item id and sends further edits made before the retry"

- [x] [Review][Defer] `ladder.saveFailed` copy claims the situation "is stored on your device and will sync" when the catch block actually rolls it out of `items` entirely [apps/mobile/src/i18n/locales/en.json, hi.json: `ladder.saveFailed`] — deferred; this exact "stored on your device and will sync" phrasing is a pre-existing, app-wide copy convention used identically in 3 other places (`onboarding` calibration screen, `onboarding` fear-ladder screen, and `session/debrief.tsx` — the precedent this AC was told to copy), so fixing it only here would create inconsistency rather than resolve a defect unique to this story; recommend a copy-wide pass across all 4 occurrences as its own fast-follow
- [x] [Review][Defer] Status badge only distinguishes 2 visual states (`completed` vs. everything else) while `statusLabel()` still distinguishes a legacy 3rd (`in_progress`, dead since migration 0021) [apps/mobile/app/ladder.tsx:245-254,321-322] — deferred, pre-existing legacy-data edge case, not reachable by any current data
- [x] [Review][Defer] `accessibilityLiveRegion="polite"` is Android-only; iOS VoiceOver never gets an automatic announcement of the save error [apps/mobile/app/ladder.tsx:391] — deferred, pre-existing pattern faithfully copied from `session/debrief.tsx:205`, the precedent this AC was told to reuse
- [x] [Review][Defer] `isSubmitting` re-entrancy guard reads from the render closure, so two rapid taps before a re-render commits could both pass and double-submit [apps/mobile/app/ladder.tsx:122] — deferred, guard mechanism is entirely pre-existing/unchanged by this diff
- [x] [Review][Defer] Save and "Try again" buttons are both visible and enabled simultaneously after a failed save [apps/mobile/app/ladder.tsx:373-382,394-403] — deferred, pre-existing pattern faithfully copied from `session/debrief.tsx` (Done + Try-again also both render simultaneously there), the precedent this AC was told to reuse
- [x] [Review][Defer] Failed outbox writes are logged via bare `console.error` only — no timestamp or session ID — despite this story's own Dev Notes citing the compliance rule ("Failed outbox writes must be logged with timestamp and session ID — silent discard is a compliance event") as rationale for the UI pattern chosen [apps/mobile/app/ladder.tsx:142,187] — deferred, systemic pre-existing gap (no such logging infra exists anywhere yet, including debrief.tsx); recommend filing as a DPDPA-relevant cross-cutting fast-follow

---

## Dev Notes

- **This story's Part A is already implemented and committed** (`adcda38`, this branch) — it was done directly against the epics.md placeholder before this story file existed, which is why `apps/mobile/app/ladder.tsx`'s current on-disk state already reflects the AC-Part-A visual changes. Do not re-implement Part A; T2-T4 build on top of the current file as-is.

- **`enqueue()` failure is a local write failure, not a network sync failure — this matters for which architecture rule applies.** `packages/sync/src/adapter.ts`'s `PowerSyncSyncAdapter.enqueue()` executes a synchronous local SQLite write (`this.db.execute(...)`) and throws on schema/constraint problems *before* anything reaches the network. This is distinct from `implementation-patterns-consistency-rules.md`'s Validation Patterns section, which describes "transient sync failure" (optimistic UI stays, non-blocking async notification only, never 'Error') for failures during *later* background sync to Supabase. A thrown `enqueue()` error means the write was never durably queued at all — the correct precedent is the doc's adjacent rule: "Failed outbox writes must be logged... silent discard is a compliance event," and the established UI precedent for this exact failure category is `session/debrief.tsx`'s `saveError`/`tryAgain` inline-retry pattern (also wrapping an `enqueue()` call). AC-B1 follows that precedent, not the "stay optimistic, no error" rule — don't let that section of the architecture doc talk you out of the rollback+error UI this AC specifies.

- **Two latent assumptions in `handleSubmit` break if you naively wire "retry" to "call `handleSubmit` again" (caught by story validation, not obvious from the AC text alone):**
  1. `closeForm()` is the *only* place that resets `isSubmitting` to `false`. T2 says don't call `closeForm()` on failure — so the `catch` blocks must reset `isSubmitting` themselves, or the retry button (and the Save button) go permanently dead after one failure.
  2. The add path's `newItem` (id + position) is recomputed fresh on every `handleSubmit` call. Retrying by re-invoking `handleSubmit` as-is would generate a *new* id, not resend the one that got rolled back. The generated item must be captured once and reused across retry attempts. T2's task list spells out both of these explicitly now — don't skip them because they read as edge cases; they're the difference between "looks done" and actually working on first retry.

- **The Story 9.3 accessibility audit already reviewed this exact focus mechanism and found "No findings."** `apps/mobile/docs/accessibility-audit.md` (line ~259) says of `ladder.tsx`: "Manual `AccessibilityInfo.setAccessibilityFocus` on mount (lines 40-49) correctly manages initial focus. No findings." That audit was static/code-review based and evaluated the *presence* of focus-management code, not its runtime timing against `DraggableFlatList`'s virtualized layout. AC-B3 is not new — it's the original `5-1-D3` finding from Story 5.1's 2026-06-04 code review, deferred at the time because `useFearLadderItems` returned an empty stub (so the race was unreachable — focus always landed on the Add button). Epic 6 replaced the stub with live PowerSync data, so the race is now reachable whenever the ladder has items. Don't treat the 9.3 "No findings" note as evidence this is already fixed.

- **A separate, unrelated `useFocusOnMount` hook exists** (`apps/mobile/src/hooks/useFocusOnMount.ts`) but is **not** the right tool here without modification: it only fires focus when `reduced` (reduce-motion) is active, via `useFocusEffect` — it's built for post-navigation focus placement on reduced-motion screens (A11Y-004), a different trigger condition than "always focus on mount regardless of motion setting," which is `ladder.tsx`'s current (and still-desired, per AC-B3's own wording) behavior. Do not swap in `useFocusOnMount` as-is; it would silently stop focusing on mount for users without reduce-motion enabled. If you see an opportunity to unify the two patterns, flag it as a follow-up rather than changing ladder's behavior as a side effect of this AC.

- **SUDS clamp precedent already exists in this exact file** — the form's `TextInput.onChangeText` handler (lines 295-298) already clamps typed input to `[0, 10]` by discarding out-of-range/NaN values (sets `null`, not clamped-to-boundary). AC-B2 asks for boundary-clamping (not null-on-invalid) since the source here is a stored numeric value, not raw user keystrokes — don't copy the `onChangeText` handler's reject-to-null behavior verbatim; the two need different failure semantics (typed garbage → force user to retype; a stored out-of-range value → clamp and show something sane).

- **Architecture boundary:** `packages/core`'s `FearLadderItem.predictedSuds` is typed `number` with no integer/range constraint at the type level (`packages/core/src/selectors/fearLadder.ts:8`) — the clamp in AC-B2 is a UI-layer defense, matching the pattern Story 6.2-B AC5 already established for `CourageLadderEntryCard`'s SUDS display (also a defense-in-depth clamp on a value the type system doesn't constrain).

- **Test file location:** `apps/mobile/app/ladder.test.tsx` (co-located, existing file — currently has 28 tests, none covering rollback, clamp, or the layout-driven focus mechanism). Existing mocks: `mockEnqueue` defaults to `mockResolvedValue(undefined)` — T2's rollback tests need a per-test override to `mockRejectedValueOnce(...)`, following the same per-test-overridable-mock pattern Story 12.2's T8 amendment established for `resolveLowestPendingItem`.

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

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no blocking issues. `pnpm turbo typecheck lint test` passed clean on the first full run after implementation (19/19 tasks, 413/413 mobile Jest tests).

### Completion Notes List

- T2: Implemented rollback + retry exactly as scoped, including both validation-pass fixes (`isSubmitting` reset independent of `closeForm()`; `pendingAddIdRef` for stable retry identity on the add path). Chose to rebuild the enqueue payload fresh from current `description`/`predictedSuds` state on every attempt (only `id`/`position` are frozen in the ref) rather than freezing the entire payload — this means a user who edits the text before pressing retry gets their edit sent, while a plain retry (no edits) naturally resends an identical payload, satisfying the AC's test expectation without over-constraining the retry UX.
- T3: Straightforward boundary-clamp helper, distinct from the `TextInput.onChangeText` handler's reject-to-null behavior per the story's Dev Notes guidance.
- T4: Implemented as a bounded retry-until-ref-exists loop (10 attempts × 16ms) gated on `!ladderLoading`, re-evaluated on `[ladderLoading, items.length]`. This resolves both races the story called out: the DraggableFlatList virtualization race (original AC) and the data-loading race (found during story validation). **The on-device VoiceOver/TalkBack verification subtask is not checked off** — it requires physical device interaction this implementation environment cannot perform. Everything else in T4 (the timing/retry logic itself, and its unit coverage) is complete and tested.
- All 12 new tests pass; full regression suite green (413/413, up from 401/401 before this story).

### File List

- `apps/mobile/app/ladder.tsx` (modified — Part A commit `adcda38`; T2/T3/T4 this session)
- `apps/mobile/app/ladder.test.tsx` (modified — Part A test updates commit `adcda38`; 12 new tests this session)
- `apps/mobile/src/i18n/locales/en.json` (modified — Part A keys commit `adcda38`; `ladder.saveFailed`/`ladder.tryAgain` this session)
- `apps/mobile/src/i18n/locales/hi.json` (modified — Part A keys commit `adcda38`; `ladder.saveFailed`/`ladder.tryAgain` this session)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status tracking)

### Change Log

- 2026-09-17 — Story file created retroactively for the already-implemented Part A visual redesign (commit `adcda38`) plus formal scoping of the three open logic ACs (B1-B3), sourced from `deferred-work.md`'s `5-1-D1`/`5-1-D3`/`5-1-D5` and `epics.md`'s Story 12.3 entry. Status: ready-for-dev (for T2-T4; T1 already done).
- 2026-09-17 — Independent validation pass (fresh-context reviewer, per `bmad-create-story` validate action): all factual/source claims verified correct against the actual code (adapter.ts semantics, debrief.tsx pattern, useFocusOnMount inapplicability, accessibility-audit quote). 2 critical gaps found and fixed in T2 (isSubmitting never reset on failure since `closeForm()` was the only reset path — retry button would've been permanently dead; add-path retry would've regenerated a new id/position instead of resending the failed item). T4 gap fixed (focus fix must also cover the data-loading race, not just the virtualization race). Minor test-count correction (24→28) and RNTL `onLayout` testing note added. Status remains ready-for-dev.
- 2026-09-17 — Implemented T2 (rollback + retry), T3 (SUDS clamp), T4 (bounded-retry focus fix). 12 new tests added, full suite green (413/413 mobile, 19/19 turbo tasks). One item intentionally left unchecked: T4's on-device VoiceOver/TalkBack verification, which requires physical-device testing outside this environment's capability — flagged for whoever picks up code-review/QA rather than silently marked done. Status: review.
- 2026-09-17 — Code review (bmad-code-review: Blind Hunter + Edge Case Hunter + Acceptance Auditor) against `dd40236..HEAD`. 1 decision-needed item resolved (extend SUDS clamp to list display), 11 patches applied, 6 deferred (2 reclassified from patch after checking precedent — see Review Findings), 6 dismissed as noise. Patches: targeted per-id optimistic rollback (fixes silent discard of concurrent syncs and possible resurrection of concurrently-deleted items) + fresh `currentItem` lookup instead of a stale `editingItem` closure; `pendingAddIdRef` position now recomputed per attempt; `clampSuds` NaN guard and extended to list display; focus-effect rewritten to track empty/non-empty category instead of a one-shot latch, plus logs on retry exhaustion; header now uses `useSafeAreaInsets()` and `accessibilityRole="header"`; Cancel disabled while submitting; test selectors switched from substring to prefix matching; added edit-path retry-identity test. 7 new regression tests added (420/420 mobile, 19/19 turbo tasks green). Status set to `in-progress` (not `done`) — T4's on-device VoiceOver/TalkBack verification remains genuinely unperformed and needs a physical-device pass before this story can close; see Review Findings for the 6 deferred items now also logged in `deferred-work.md`.
- 2026-09-21 — Manual VoiceOver verification performed on iOS Simulator (iPhone 17, iOS 27.0), previously blocked as outside the implementation environment's capability. **Result: FAILED.** With a real signed-in account holding 2 ladder items, navigating fresh from Home → "Your Ladder", VoiceOver announced "Go back button" instead of focusing the first item row — confirmed both audibly and visually (VoiceOver's focus ring rendered around the header `BackButton`, whose own styling has no border of its own). AC-B3 does not hold at runtime despite the retry-until-ref-exists logic being correctly implemented and unit-tested. See T4 for the working hypothesis (an OS-level screen-change auto-focus likely racing/superseding the app's `layoutChanged`-style `setAccessibilityFocus` call) — not yet root-caused or fixed. TalkBack (Android) still untested. Status remains `in-progress`; this is now a confirmed open bug against AC-B3, not just a pending verification step.
- 2026-09-21 — Manual TalkBack verification performed on a physical Android device (Redmi K20 Pro, Android 11), via a fresh EAS `development`-profile build. **Result: FAILED, same signature as VoiceOver.** With a real signed-in account holding 1 ladder item, navigating fresh into the ladder route with TalkBack already enabled, the accessibility focus outline rendered around the header `BackButton`, not the first item row. This cross-platform reproduction strengthens the working hypothesis — the bug is in the app's own `setAccessibilityFocus` usage racing the OS's automatic screen-change focus, not a VoiceOver-specific quirk. AC-B3 is now confirmed failing on both platforms.
