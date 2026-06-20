# Story 7.5: Grounding Screen — Full Technique Picker

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who has tapped "Stop Exposure" during an active session,
I want a fully implemented grounding screen with breathing, 5-4-3-2-1, and helplines available,
so that I can calm myself before deciding whether to continue or end the session (FR-SESSION-06, UX-DR-19).

## Acceptance Criteria

1. **Affirmation source switches to the Calm Me affirmation.** The grounding screen at `apps/mobile/app/session/grounding.tsx` (created in Story 5.2) renders `t(CALM_ME_AFFIRMATIONS[0])` from `@exposure-buddy/core` (`packages/core/src/config/calmMeConfig.ts`, already exists — no core changes) in place of the current `t('session.grounding.affirmation')`. The static `t('session.grounding.breathingPrompt')` line is removed entirely — replaced by the technique picker (AC #2).
2. **Technique picker — 3 targets, reusing existing screens.** Below the affirmation, three tappable cards render: Breathing (`router.push('/calm-me/breathing')`), 5-4-3-2-1 (`router.push('/calm-me/grounding')`), Helplines (`router.push('/calm-me/helplines')`) — the exact same routes Story 7.1's Calm Me technique picker already uses. **Do not build new screens or session-scoped duplicates.** Each of those three screens already calls `router.back()` on its own back button and on completion (see Dev Notes "Why pushing into `/calm-me/*` is safe") — pushing onto the stack from `/session/grounding` means `router.back()` naturally returns here, no new wiring needed in those files. Use `t('calmMe.technique.breathing')`, `t('calmMe.technique.grounding')`, `t('calmMe.technique.helplines')` for labels — same keys `calm-me/index.tsx` already uses, don't redefine.
3. **Post-MVP TODO comment.** The intro/affirmation copy carries a literal code comment: `// TODO post-MVP: consider distinct framing copy for grounding vs. Calm Me contexts`.
4. **Action footer — new i18n keys.** The existing two-button footer (Resume / Confirm Stop) is retained structurally but relabeled: `t('grounding.keepGoing')` ("I can keep going") and `t('grounding.stopSession')` ("I need to stop this session"). These are **new top-level keys** (sibling to `grounding541`, `breathing`, `helplines` — not nested under `session.grounding`). See AC #9 for the i18n migration this implies.
5. **"I can keep going" → resume.** Tapping it calls `transition('grounding', { type: 'grounding.resumed' })` from `@exposure-buddy/core`; if `result.ok` is false, bail (no navigation, no state change — mirrors `active.tsx`'s `handleCompleteSession` guard pattern). On success, `router.replace()` to `/session/active` with the same params the current implementation already passes (`sessionId`, `fearItemId`, `description`, `preSuds`) — this part is unchanged from today's code, just gated behind the transition call.
6. **"I need to stop this session" → abandon.** Tapping it calls `transition('grounding', { type: 'grounding.stopped' })`; if `result.ok` is false, bail. On success, run the **existing, unchanged** abandonment sequence: `adapter.enqueue('exposure_sessions', 'UPDATE', { id: sessionId, status: 'abandoned', ended_at })`, `adapter.enqueue('fear_ladder_items', 'UPDATE', { id: fearItemId, status: 'pending', updated_at, updatedAt })`, `clearSessionInProgress()`, `clearSessionIntention(sessionId)`, then `router.push('/session/abandoned')`. **The destination is `/session/abandoned`, not `/session/debrief`** — see Dev Notes "Stop destination: `/session/abandoned`, confirmed" for why this story deliberately departs from epics.md's literal wording.
7. **Mandatory lockout — Android hardware back intercepted.** While this screen is focused, pressing the Android hardware back button produces no navigation (the handler returns `true` to swallow the event). iOS swipe-back and the header back button are **already disabled** today via `session/_layout.tsx`'s `gestureEnabled: false` + `headerShown: false` on the `grounding` route — confirm this, no changes needed there. The hardware-back interceptor is the only genuinely new lockout mechanism this story adds (first use of `BackHandler` in this codebase — see Dev Notes).
8. **`session-state-machine.test.ts` extended, not duplicated.** Verify (don't blindly re-add) that the file asserts: `grounding → active` on `grounding.resumed` results in `{ ok: true, value: 'active' }`; `grounding → abandoned` on `grounding.stopped` results in `{ ok: true, value: 'abandoned' }`; attempting either event from a state other than `grounding` returns `{ ok: false, error: { code: 'INVALID_TRANSITION' } }` (this codebase's `transition()` returns a `Result`, it does not throw — see Dev Notes "This codebase doesn't throw — it returns `Result`"). Add only the assertions genuinely missing.
9. **i18n.** Every visible string uses `t()`; CI `i18next/no-literal-string` lint passes. The now-unused `session.grounding.affirmation`, `session.grounding.breathingPrompt`, `session.grounding.resume`, `session.grounding.confirmStop` keys are removed from `en.json` and `hi.json` (verified single consumer — see Dev Notes "i18n key migration"). New top-level `grounding.keepGoing` / `grounding.stopSession` keys are added to `en.json` (Hindi translation optional — `fallbackLng: 'en'` covers gaps, matching the Story 7.2–7.4 precedent of partial Hindi coverage).

## Tasks / Subtasks

- [x] Task 1: Rewrite `apps/mobile/app/session/grounding.tsx` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] Replace the affirmation `t()` call and delete the breathing-prompt `<Text>` line (AC #1).
  - [x] Add the technique-picker block: 3 `TouchableOpacity` cards (Breathing / 5-4-3-2-1 / Helplines), each `accessibilityRole="button"`, `accessibilityLabel` matching its visible label, `onPress` pushing to the corresponding `/calm-me/*` route (AC #2). Mirror `calm-me/index.tsx`'s `techniqueCard`/`techniqueLabel` style shapes for visual consistency — inline duplication here is consistent with this codebase's existing precedent of duplicating small UI chrome (e.g. the identical back-button block repeated across `breathing.tsx`/`grounding.tsx`/`helplines.tsx`); do not refactor `calm-me/index.tsx` to extract a shared component as part of this story (out of scope, risks regressing a `done` story).
  - [x] Add the post-MVP TODO comment near the affirmation/intro copy (AC #3).
  - [x] Remove or update the file-header guard comment at the top of `grounding.tsx` (`// IMPORTANT: This screen ships as COMPLETE at MVP. No TODO, STUB, or Epic 7 comments...`) — it was written in Story 5.2 anticipating this exact story and now directly contradicts the AC #3 TODO comment being added to the same file. Leaving it in place would make the file self-contradictory.
  - [x] Update `handleResume` → call `transition('grounding', { type: 'grounding.resumed' })` (import `transition` from `@exposure-buddy/core`), bail silently if `!result.ok`, otherwise keep the existing `router.replace(...)` call unchanged (AC #5).
  - [x] Update `handleConfirmStop` → call `transition('grounding', { type: 'grounding.stopped' })` first, bail if `!result.ok`; keep the rest of the function (both `enqueue()` calls, MMKV clears, `router.push('/session/abandoned')`) **exactly as it is today** (AC #6).
  - [x] Rename the two footer buttons' labels/`accessibilityLabel`s to `t('grounding.keepGoing')` / `t('grounding.stopSession')` (AC #4).
  - [x] Add Android hardware-back interception: `useFocusEffect` (from `expo-router`, same import source as `useFocusOnMount.ts`) wrapping a `BackHandler.addEventListener('hardwareBackPress', () => true)` subscription, removed on cleanup via the returned subscription's `.remove()` (RN 0.81 API — no `removeEventListener` needed). Wrap the registration callback in `useCallback` (matches `useFocusOnMount.ts`'s pattern) (AC #7).
- [x] Task 2: i18n keys (AC: #4, #9)
  - [x] Add a new top-level `grounding` namespace to `en.json`: `{ "keepGoing": "I can keep going", "stopSession": "I need to stop this session" }` — placed as a sibling to `grounding541`/`breathing`/`helplines`, not nested under `session`.
  - [x] Remove `session.grounding.affirmation`, `session.grounding.breathingPrompt`, `session.grounding.resume`, `session.grounding.confirmStop` from `en.json` and `hi.json` — grep first to reconfirm `grounding.tsx`/`grounding.test.tsx` are the only consumers (verified during story creation; re-verify at implementation time in case anything changed).
  - [x] Optionally add the same `grounding` namespace to `hi.json` (partial coverage acceptable, per Story 7.2–7.4 precedent — `fallbackLng: 'en'` handles gaps).
- [x] Task 3: `session-state-machine.test.ts` gap check (AC: #8)
  - [x] Read the existing file (`packages/core/src/erp/session-state-machine.test.ts`) — it **already** has direct assertions for `grounding → active` (line 33–36) and `grounding → abandoned` (line 38–41), plus illegal-transition coverage for `grounding.resumed` attempted from `completed` (line 92) and `abandoned` (line 101), and `grounding.stopped` attempted from `idle` (line 114). It does **not** currently test attempting `grounding.resumed`/`grounding.stopped` from `active` or `pre_session`. Add only those missing illegal-transition assertions — do not duplicate what's already there.
- [x] Task 4: Update `apps/mobile/app/session/grounding.test.tsx` (AC: #1–#7)
  - [x] Add `transition: jest.fn(() => ({ ok: true }))` to the `@exposure-buddy/core` mock (mirror `active.test.tsx`'s mocking pattern, line ~46) — also re-export anything else this screen now imports from `@exposure-buddy/core` (none beyond `transition` and `CALM_ME_AFFIRMATIONS`).
  - [x] Mock `CALM_ME_AFFIRMATIONS: ['calmMe.affirmation.1']` and update the affirmation-text assertion to expect that key instead of `session.grounding.affirmation`; delete the breathing-prompt assertion (the line no longer exists).
  - [x] Add a `BackHandler` mock (`jest.mock('react-native', () => ({ ...jest.requireActual('react-native'), BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }))` or equivalent — check for any existing RN partial-mock pattern elsewhere in `apps/mobile` tests before writing a new one) and assert `addEventListener` was called with `'hardwareBackPress'` and a handler that returns `true`.
  - [x] Add 3 tests for the technique-picker cards: tapping each pushes to `/calm-me/breathing`, `/calm-me/grounding`, `/calm-me/helplines` respectively.
  - [x] Update existing Resume/Confirm-Stop tests: button labels now resolve via `getByLabelText('grounding.keepGoing')` / `getByLabelText('grounding.stopSession')`; add an assertion that `transition` was called with `('grounding', { type: 'grounding.resumed' })` / `('grounding', { type: 'grounding.stopped' })` before the existing enqueue/navigation assertions. Keep the existing enqueue-payload and `/session/abandoned` navigation assertions unchanged (AC #6 — destination did not change).
  - [x] `pnpm turbo lint` — 0 `i18next/no-literal-string` violations.
  - [x] `pnpm turbo typecheck` and `pnpm turbo test` — zero regressions across all 6 packages.

### Review Findings

Multi-layer review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the `main..story/7-5-grounding-screen-full-technique-picker` implementation diff. Acceptance Auditor found zero AC violations — all 9 ACs independently verified correct against the live codebase. 20 raw findings across the three layers; 16 dismissed as noise/false-positive/already-handled, 4 merged/surviving as pre-existing low-risk deferrals.

- [x] [Review][Defer] `CALM_ME_AFFIRMATIONS[0]!` non-null assertion has no fallback if the array is ever emptied [`apps/mobile/app/session/grounding.tsx:86`] — deferred, pre-existing (identical pattern already shipped in `calm-me/index.tsx:104`; `calmMeConfig.ts` carries a "Post-MVP rotation" comment confirming the single-entry array is intentional, not an oversight)
- [x] [Review][Defer] `useFocusEffect` test mock never exercises the `BackHandler` subscription's cleanup/unmount path [`apps/mobile/app/session/grounding.test.tsx`] — deferred, pre-existing (mirrors the same simplistic mock convention already used codebase-wide in `useFocusOnMount.test.tsx`)
- [x] [Review][Defer] No double-tap guard on "I need to stop this session" — rapid double-tap could re-run `transition()`/double-enqueue the abandonment writes [`apps/mobile/app/session/grounding.tsx:28` `handleConfirmStop`] — deferred, pre-existing (AC #6 explicitly mandates keeping `handleConfirmStop`'s body unchanged; same class of gap already tracked as `5-2-W15`/`5-2-D2` in `deferred-work.md`)
- [x] [Review][Defer] Tapping a technique card during `handleConfirmStop`'s async window can push into `/calm-me/*` mid-abandonment [`apps/mobile/app/session/grounding.tsx:88-116`] — deferred, needs a UX decision (disable the technique cards/footer while stop is in flight?) before it can be patched; new interaction surface introduced by this story's technique-picker cards combined with the pre-existing unguarded async window

## Dev Notes

### Stop destination: `/session/abandoned`, confirmed (do not route to `/session/debrief`)

epics.md's literal AC text for this story says the "I need to stop this session" action navigates to "the debrief screen" with "the session-end write payload as defined in Story 5.3." This was investigated and deliberately overridden during story creation:

- Story 5.3 only defines the write payload for a **completed** session (`status: 'completed'`, debrief SUDS, peak SUDS) — there is no Story 5.3 definition of an "abandoned" payload to follow.
- `apps/mobile/app/session/debrief.tsx` is built around completion-acknowledgement branches ("You faced what you were afraid of. That matters.") — semantically wrong copy for a session the user is abandoning mid-exposure, not completing.
- The existing, already-tested `/session/abandoned` screen (`apps/mobile/app/session/abandoned.tsx`) has the correct self-compassion copy ("Stopping when you need to is an act of self-awareness...") and was purpose-built for exactly this flow in Story 5.2.
- `deferred-work.md`'s `5-2-W15`/`5-2-D2`/`5-2-D3` entries document this flow's known gaps (no try/catch around the unconditional cleanup, crash-gap on `ended_at`) as accepted MVP tradeoffs to revisit in Epic 6/9 — nothing there signals an intent to redirect this flow through debrief.

**Confirmed with the user during story creation: keep `/session/abandoned`.** The enqueue payload, MMKV clears, and navigation target in `handleConfirmStop` are unchanged from today's implementation — the only addition is the `transition()` guard call (AC #6).

### Why pushing into `/calm-me/*` is safe

`apps/mobile/app/calm-me/breathing.tsx`, `grounding.tsx`, and `helplines.tsx` (Stories 7.2–7.4) all navigate via `router.back()` for both their back button and their completion paths — none of them push to a fixed route or assume they were entered from `/calm-me/index`. `apps/mobile/app/_layout.tsx`'s Calm Me FAB already pushes to `/calm-me` from arbitrary screens across route-group boundaries, so cross-group pushes are an established pattern in this app. Pushing from `/session/grounding` to e.g. `/calm-me/breathing` and letting it `router.back()` is the same shape — it will correctly return to `/session/grounding`, not to `/calm-me/index`. No changes are needed in any of the three `/calm-me/*` screen files.

### `SessionStateMachine.transition()` — new precedent for these two events

`packages/core/src/erp/session-state-machine.ts` exports a pure `transition(currentState, event)` function — there is no class, no persisted runtime state object; the "state" lives implicitly in route position + MMKV flags. Today, only `active.tsx`'s `handleCompleteSession` actually calls `transition()` (because `session.completed` has a real guard, `sudsReadingsCount >= 1`); `active.tsx`'s `handleStopExposure` (the `exposure.stopped` event) and the current `grounding.tsx` do **not** call it despite code comments naming the events. This story is the first to literally wire `grounding.resumed`/`grounding.stopped` through `transition()`, per AC #5/#6's explicit requirement — mirror `active.tsx`'s guard-check shape (`const result = transition(...); if (!result.ok) { return }`) exactly. Both transitions are unconditional (no guard function, see `TRANSITIONS.grounding` in `session-state-machine.ts`), so `result.ok` will always be `true` in practice when called from this screen — the check exists for defensive correctness and AC compliance, not because it can realistically fail here.

### This codebase doesn't throw — it returns `Result`

epics.md's AC text says illegal transitions "throw a typed error." The actual, already-implemented pattern (`packages/core/src/types/result.ts` + `session-state-machine.ts`) returns `{ ok: false, error: { code, message } }` — it never throws. `session-state-machine.test.ts`'s existing illegal-transition tests already assert against `result.ok === false` and `result.error.code`, not a thrown exception. Follow that existing pattern in Task 3 — do not introduce throwing behavior.

### i18n key migration

The `session.grounding` namespace (`affirmation`, `breathingPrompt`, `resume`, `confirmStop`) in `en.json`/`hi.json` is consumed **only** by `apps/mobile/app/session/grounding.tsx` and its test file (verified via grep across `apps/mobile` during story creation — a code comment in `calm-me/index.tsx` references the *file path* `session/grounding.tsx`, not these i18n keys; don't be confused by that match if you grep again). Safe to delete outright rather than leave orphaned. The new `grounding.keepGoing`/`grounding.stopSession` keys are intentionally **top-level**, not `session.grounding.*` — this matches epics.md's literal `t('grounding.keepGoing')` / `t('grounding.stopSession')` wording and the existing precedent of `grounding541` (the 5-4-3-2-1 exercise) already being a top-level namespace rather than nested under `session`.

### Android `BackHandler` — first use in this codebase

No file in `apps/mobile` currently imports `BackHandler`. `apps/mobile/src/hooks/useFocusOnMount.ts` establishes the convention for focus-scoped effects using `useFocusEffect` from `expo-router` (not `@react-navigation/native` directly) wrapped in `useCallback` — follow that same shape for the back-handler registration so it's correctly scoped to when this screen is focused (not mounted-forever, in case Fast Refresh or stack reuse keeps the component alive off-screen). `session/_layout.tsx` already sets `gestureEnabled: false` + `headerShown: false` on the `grounding` `Stack.Screen` (added in Story 5.2, comment: "pause, active, and grounding are forward-only (non-skippable) per UX spec") — that already satisfies the iOS-swipe and header-back portions of AC #7; this story only adds the Android hardware-back piece.

### Container styling — judgment call, not a hard requirement

Story 7.4 updated `calm-me/*` screens to use `color.surface.primary` + `width: '100%'` from `@exposure-buddy/ui`'s token system for visual consistency across the Calm Me family. `session/grounding.tsx` currently uses raw `'#ffffff'`/`paddingHorizontal: 24` (Story 5.2 predates the token system's Calm Me adoption). No AC mandates a token migration here — apply your judgment on whether to align the container styling with the `/calm-me/*` screens now that this screen visually echoes them (technique-picker cards, shared affirmation copy), or leave the existing styling as-is and only add the new elements. Either is acceptable; don't let this become a large unscoped restyle.

### Project Structure Notes

- No new files. All reused components/routes (`/calm-me/breathing`, `/calm-me/grounding`, `/calm-me/helplines`, `CALM_ME_AFFIRMATIONS`, `transition`) already exist from Stories 5.2, 7.1–7.4.
- Modified: `apps/mobile/app/session/grounding.tsx`, `apps/mobile/app/session/grounding.test.tsx`, `apps/mobile/src/i18n/locales/en.json`, `apps/mobile/src/i18n/locales/hi.json`, `packages/core/src/erp/session-state-machine.test.ts` (only if gaps found per Task 3).
- No `packages/ui` changes, no `packages/core` source changes (test-only), no migrations, no Edge Functions, no new dependencies (`BackHandler` is built into `react-native`).
- Consistent with existing structure: screens in `apps/mobile/app/`, cross-cutting domain logic in `packages/core`, no platform APIs (`BackHandler`, `Linking`) ever imported into `packages/ui` or `packages/core`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.5, lines 1606–1642] — canonical acceptance criteria (note: stop-destination AC literally says "debrief screen" — see Dev Notes "Stop destination" for the confirmed override to `/session/abandoned`)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2 grounding-screen forward-only spec, line 1176] — original mandatory, non-skippable grounding screen contract this story enhances, not replaces
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1, lines 1436–1485] — `calmMeConfig.ts`/`helplines.ts` origin
- `apps/mobile/app/session/grounding.tsx` — file to rewrite (current implementation read in full during story creation)
- `apps/mobile/app/session/active.tsx` (lines 68–143) — `handleStopExposure`/`handleCompleteSession` patterns; `transition()` guard-check shape to mirror
- `apps/mobile/app/calm-me/index.tsx` — technique-picker card shape/styling to mirror (`techniquePicker`/`techniqueCard`/`techniqueLabel`)
- `apps/mobile/app/calm-me/breathing.tsx`, `grounding.tsx`, `helplines.tsx` — confirm `router.back()` navigation shape, no changes needed
- `apps/mobile/app/session/abandoned.tsx` — confirmed unchanged destination
- `apps/mobile/app/session/_layout.tsx` — existing `gestureEnabled: false`/`headerShown: false` for `grounding` route, no changes needed
- `apps/mobile/src/hooks/useFocusOnMount.ts` — `useFocusEffect` + `useCallback` convention to mirror for the new `BackHandler` registration
- `packages/core/src/erp/session-state-machine.ts`, `session-state-machine.test.ts` — `transition()` implementation and existing test coverage (read in full during story creation)
- `apps/mobile/app/session/active.test.tsx` (line ~46) — `transition` jest-mock pattern to mirror
- `_bmad-output/implementation-artifacts/deferred-work.md` (`5-2-W15`, `5-2-D2`, `5-2-D3`) — known, accepted gaps in the abandon flow this story does not need to fix
- `_bmad-output/implementation-artifacts/7-4-helpline-signpost.md` — most recent prior story in this epic; i18n partial-Hindi-coverage precedent, `color.surface.primary`/`width:'100%'` container pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Debug Log References

None — no blocking failures encountered.

### Completion Notes List

- Rewrote `apps/mobile/app/session/grounding.tsx` per AC #1–#7: affirmation now sources from `CALM_ME_AFFIRMATIONS[0]`, breathing-prompt line removed, 3-card technique picker added (reusing `/calm-me/breathing`, `/calm-me/grounding`, `/calm-me/helplines` routes — no new screens), post-MVP TODO comment added, stale Story 5.2 header guard comment removed, `handleResume`/`handleConfirmStop` now gated behind `transition('grounding', ...)` calls (bail-on-`!ok` pattern mirrored from `active.tsx`), footer buttons relabeled to new top-level `grounding.keepGoing`/`grounding.stopSession` i18n keys, Android hardware-back interception added via `useFocusEffect` + `BackHandler.addEventListener('hardwareBackPress', () => true)` (first use of `BackHandler` in this codebase).
- `handleConfirmStop`'s enqueue payloads, MMKV clears, and `/session/abandoned` navigation target are byte-for-byte unchanged from the pre-story implementation — only the leading `transition()` guard call was added, per AC #6 and the Dev Notes "Stop destination" confirmation.
- i18n: added top-level `grounding.keepGoing`/`grounding.stopSession` to `en.json` (sibling to `grounding541`/`breathing`/`helplines`) and `hi.json`; removed the now-orphaned `session.grounding.{affirmation,breathingPrompt,resume,confirmStop}` block from both locale files after re-confirming via grep that `grounding.tsx`/`grounding.test.tsx` were the only consumers.
- `session-state-machine.test.ts`: confirmed existing `grounding→active`/`grounding→abandoned` legal-transition assertions and existing illegal-transition coverage (from `completed`/`abandoned`/`idle`); added the 4 genuinely missing illegal-transition assertions — `grounding.resumed`/`grounding.stopped` attempted from `active` and from `pre_session` — without duplicating existing tests.
- `grounding.test.tsx`: rewritten with `transition` + `CALM_ME_AFFIRMATIONS` mocks for `@exposure-buddy/core`, 3 new technique-picker navigation tests, a hardware-back-interceptor test, and updated Resume/Stop tests that assert `transition()` is called before the existing enqueue/navigation assertions, plus 2 new "bails when transition fails" tests for both handlers.
- Deviation from the story's literal `BackHandler` mock suggestion: `jest.mock('react-native', () => ({ ...jest.requireActual('react-native'), ... }))` broke jest-expo's native module bootstrapping (`TurboModuleRegistry.getEnforcing(...): 'DevMenu' could not be found`) when run under this project's jest-expo preset. Used `jest.spyOn(BackHandler, 'addEventListener')` instead — `BackHandler.ios.js` (jest-expo's default test platform) already ships a real, working no-op `addEventListener`, so spying on it avoids re-evaluating RN's native module graph while still asserting the call shape and handler behavior.
- Container styling judgment call (Dev Notes "Container styling"): kept the existing raw `'#ffffff'`/`paddingHorizontal: 24` container styling as-is; only added new `techniquePicker`/`techniqueCard`/`techniqueLabel` styles (copied from `calm-me/index.tsx`'s shapes) — did not migrate to the `@exposure-buddy/ui` token system, to avoid an unscoped restyle.
- Full validation: `pnpm turbo lint` (0 violations across all 6 packages), `pnpm turbo typecheck` (clean), `pnpm turbo test` (Vitest: core 53/53, supabase 27 passed/50 skipped, sync 23/23, ui 0 — passWithNoTests; Jest: mobile 277/277 across 32 suites, including the 13 tests in the rewritten `grounding.test.tsx`).

### File List

- `apps/mobile/app/session/grounding.tsx` (modified)
- `apps/mobile/app/session/grounding.test.tsx` (modified)
- `apps/mobile/src/i18n/locales/en.json` (modified)
- `apps/mobile/src/i18n/locales/hi.json` (modified)
- `packages/core/src/erp/session-state-machine.test.ts` (modified)

## Change Log

- 2026-06-20: Story 7.5 created via create-story workflow. Stop-destination ambiguity in epics.md (debrief vs. abandoned) investigated and resolved with user: keep `/session/abandoned`, unchanged from Story 5.2.
- 2026-06-20: Story implemented — grounding screen rewritten with full technique picker, `transition()` wiring for resume/stop, Android hardware-back lockout, i18n migration, and `session-state-machine.test.ts` gap-fill. All tasks complete, full regression suite green. Status → review.
- 2026-06-20: Code review complete — multi-layer review (Blind Hunter + Edge Case Hunter + Acceptance Auditor). Zero AC violations found. 4 low-risk pre-existing-pattern items deferred (see Review Findings + `deferred-work.md`); 16 findings dismissed as noise/false-positive/already-handled. Status → done.
