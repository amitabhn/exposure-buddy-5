# Story 5.6: Remove Home Screen States 7 (Post-Exposure) and 8 (Expired)

Status: review

<!--
  Origin: GitHub Issue #36 — Spec change: remove home screen State 7 (post-exposure)
          and State 8 (expired) blocking gate.
  Discovery: PR #35 (Epic 5 retro / B5 verification) surfaced that State 7 blocks
             dev-mode session re-entry and that the 6h gate has no reflection input.
  Review: Party-mode review 2026-06-13 (John/Sally/Winston/Mary) — Winston's Option 2
          (full State 7/8 removal) selected.
  Open-question dispositions confirmed 2026-06-15:
    Q1 (clinician sign-off): proceed; log as "clinician input pending"
    Q2 (soft acknowledgement on State 3): out of scope → backlog
    Q3 (crash-recovery for incomplete debrief): Option A (accept risk, wipe stale
        SESSION_DEBRIEF_PENDING on AuthProvider boot); Option B → backlog
-->

## Story

As a user who completes an exposure session and submits the debrief,
I want to land directly on the home screen with my ladder visible and a clear next-challenge CTA,
So that I am acknowledged for what I just did without being held in a 6-hour countdown or chased by an indefinite "reflect now" prompt.

*Depends on: Story 5.3 merged to main.* ✅
*Supersedes Story 5.3 ACs 7 and 8 (Home State 7 and State 8 spec).*

## Acceptance Criteria

1. **Spec — PRD: FR-NOTIF-04 marked deferred post-MVP with dated decision record**

   Given `_bmad-output/planning-artifacts/prd.md` currently lists `FR-NOTIF-04` (PRD line 66) and the FR Coverage Map entry (line 195) maps it to Epic 8 / Story 8.3
   When this story is implemented
   Then both occurrences of `FR-NOTIF-04` are updated: the FR Coverage Map entry (line 195) is rewritten as **"FR-NOTIF-04: POST-MVP — Window-close push notification at 3 hours post-session deferred; no MVP story."** followed by a **Decision record (2026-06-15)** explaining: State 7 blocking gate removed by Story 5.6 → the window-close notification semantically depends on a 6-hour reflection window that the UI no longer presents → notification copy ("the window is still available") loses its referent; the PRD requirements line 66 keeps its FR-NOTIF-04 text (PRDs document the intent) but a comment-style addendum is appended noting the deferral and pointing to the FR Coverage Map decision record; Epic 8 introduction (line 341) drops `FR-NOTIF-04` from the FRs covered list

2. **Spec — Epics: Story 8.3 marked DEFERRED; Epic 5 + Epic 6 prose stripped of State 7/8**

   Given `_bmad-output/planning-artifacts/epics.md` references State 7 and State 8 across Epic 5 prose (line 1097), Story 5.3 ACs (lines 1211–1219), Story 6.2 AC (line 1341–1343 — countdown re-evaluation), Story 7.1 AC (line 1472 — Calm Me "Not now" routes to state 7), and Story 8.3 ACs (lines 1754–1805)
   When this story is implemented
   Then Story 8.3 header is changed to `### Story 8.3: Window-Close Notification (Edge Function) ~~[DEFERRED — post-MVP]~~` with a `> **Status: DEFERRED — post-MVP (2026-06-15).**` block at top citing the FR Coverage Map decision record; Epic 8 introduction `**FRs covered:**` line drops `FR-NOTIF-04`; Epic 5 introduction (line 1097) is rewritten to drop the phrase "The 6-hour post-session reflection window and home screen states 7/8 are part of this epic"; Story 5.3 ACs 7 and 8 (lines 1213–1219) are removed and Story 5.3 AC 6 (line 1211) is rewritten so the post-submit destination reads **"the user is routed to the home screen default state (state 3 equivalent — ladder visible, Start CTA)"**; Story 6.2 countdown-interval AC (lines 1341–1343) is removed (no longer applicable — no countdown to refresh); Story 7.1 "Not now" branch (line 1472) is rewritten to route to **home screen default state** (no rest period); a new line is added to Story 6.2 dev notes naming Story 5.6 as the source of the State 7/8 removal

3. **Spec — ADR-HOME-STATE-RESOLVE updated**

   Given `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` currently defines `HomeScreenState` with 10 states (lines 50–61) and a priority ordering table including `post-exposure` (priority 4) and `expired` (priority 5)
   When this story is implemented
   Then `'post-exposure'` and `'expired'` are removed from the `HomeScreenState` type union (the enum now lists 8 entries: `first-use | empty-ladder | morning | progressing | avoidance | mid-exposure | return-after-gap | completed`); the priority ordering table drops rows 4 (post-exposure) and 5 (expired) and renumbers the remaining priorities so first-use=1, completed=2, empty-ladder=3, return-after-gap=4, avoidance=5, progressing=6, morning=7, empty-ladder-fallback=8; the `HomeScreenContext.activeThread.windowExpiredAt` field is removed (no consumer); Required Test Cases 3 and 4 (post-exposure / expired happy paths) are deleted; a `## Supersession` block at the bottom records: **"2026-06-15 — Story 5.6 (Issue #36) removed `post-exposure` and `expired` from this contract. State machine reduces to 8 active states. See `_bmad-output/implementation-artifacts/5-6-remove-home-states-7-and-8.md` and `_bmad-output/implementation-artifacts/deferred-work.md` for rationale."**

4. **Spec — UX user-journey-flows mermaid diagrams updated**

   Given `_bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md` contains four mermaid diagrams that reference State 7/8 nodes: F3 line 124 (`T --> U[Home — Post-exposure reflection state 7]`), F4 line 160 (`M -->|Not now| O[Home — Post-exposure state 7\n6h expiry window starts]`), F5 line 200 (`N -->|WINDOW_EXPIRED\nno debrief| Q[Home — Expired state 8]`), and an entire F6 section (lines 223–253, "Post-Exposure Reflection & Expiry")
   When this story is implemented
   Then F3 line 124 is rewritten as `T --> U[Home — Morning state 3\nladder visible, Start CTA]`; F4 line 160 is rewritten as `M -->|Not now| O[Home — Morning state 3]`; F5's WINDOW_EXPIRED branch (line 200 — node Q "Home — Expired state 8" and downstream nodes T → V) is removed and the diagram's `N` decision drops the `WINDOW_EXPIRED` arm entirely (thread states reduce to: progressing → state 4, avoidance → state 5); the entire F6 section ("Post-Exposure Reflection & Expiry") is replaced with a single paragraph: **"F6 — DEFERRED. The 6-hour post-exposure reflection window and home states 7/8 were removed by Story 5.6 (2026-06-15, Issue #36). Reflection capture happens entirely on the debrief screen (F3 node P). On debrief submit the user lands on home state 3."**; the F6 index entry in `index.md` line 78 is removed or annotated as deferred; `component-strategy.md` lines 40, 126, 165, 167, 185 are scrubbed of State 7/8 references (HomeStateCard states list shrinks to 8; LetterReveal/AcknowledgementCard usage notes drop "F6 state 7" / "state 8 late debrief" mentions)

5. **Spec — deferred-work.md and decision log entries added**

   Given `_bmad-output/implementation-artifacts/deferred-work.md` is the canonical post-merge deferred-items ledger
   When this story is implemented
   Then a new dated section is appended with header `## 2026-06-15 — Story 5.6 / Issue #36 — Home states 7/8 removed` containing four sub-bullets: (a) **FR-NOTIF-04 deferred post-MVP** (rationale: window-close notification depends on a UI window that no longer exists); (b) **State 8 orphaned + removed** (rationale: pure soft-gate, no reflection input); (c) **`exposure_sessions.expires_at` server trigger kept inert** (rationale: no UI consumer; dropping the trigger is a follow-up migration not bundled here — Story 9.x candidate); (d) **`window_notified_at` column never landed** (Story 8.3 deferred — no migration needed); plus three backlog stubs filed: `BACKLOG-EPIC6-D1: Soft recency acknowledgement on State 3` (Sally's design suggestion — out of scope of Story 5.6, file 2026-06-15); `BACKLOG-EPIC9-D1: Auto-route to debrief on next launch if SESSION_DEBRIEF_PENDING is non-empty (Option B crash-recovery)` (file 2026-06-15); `BACKLOG-CLINICIAN-D1: Explicit clinician acknowledgement of overriding the original 6h pacing rationale` (file 2026-06-15 — Story 5.6 proceeded without sign-off per user decision)

6. **Code — `packages/core/src/erp/home-screen-state.ts` simplified to single state**

   Given `packages/core/src/erp/home-screen-state.ts` currently exports `POST_EXPOSURE_WINDOW_MS`, `HomeDisplayState` (union of `'default' | 'post-exposure' | 'expired'`), `resolveHomeScreenState(debriefPendingData, nowMs)`, and `formatTimeRemaining(completedAtMs, nowMs)`
   When this story is implemented
   Then the file is rewritten so: (a) `HomeDisplayState` is the literal type `'default'` (single state — kept as a named type so Epic 6 Story 6.2 can expand to the full 8-state union without an API breaking-change rename); (b) `resolveHomeScreenState()` becomes a zero-argument function returning `'default'` unconditionally (the `debriefPendingData` and `nowMs` parameters are removed since they have no consumer); (c) `POST_EXPOSURE_WINDOW_MS` export is removed (no consumer post-this-story); (d) `formatTimeRemaining()` export is removed (no consumer — only ever rendered the State 7 countdown); (e) the top-of-file ARC-001 boundary comment is preserved; (f) `packages/core/src/index.ts` is updated to drop `POST_EXPOSURE_WINDOW_MS`, `formatTimeRemaining`, and `DebriefPendingData` from the public surface — `resolveHomeScreenState` and `HomeDisplayState` remain exported; (g) `packages/core/src/types/debrief-pending-data.ts` is deleted (no consumer)

7. **Code — `packages/core/src/erp/home-screen-state.test.ts` reduced**

   Given the existing test file has 6 `resolveHomeScreenState` cases (default-null, post-exposure-open, post-exposure-1ms-pre-boundary, expired-at-boundary, expired-outside-window, default-reflection-done) and 5 `formatTimeRemaining` cases
   When this story is implemented
   Then `formatTimeRemaining` describe block is deleted entirely; `resolveHomeScreenState` describe block is reduced to a single trivial test asserting `resolveHomeScreenState()` returns `'default'`; the imports of `formatTimeRemaining`, `POST_EXPOSURE_WINDOW_MS`, and `DebriefPendingData` are removed; the constants `BASE`/`INSIDE_WINDOW`/`AT_BOUNDARY`/`OUTSIDE_WINDOW` are removed; the file ends with a single passing Vitest case

8. **Code — `apps/mobile/app/(app)/index.tsx` reduced to default-state only**

   Given the current home screen renders three conditional blocks (`post-exposure` at lines 64–88, `expired` at lines 90–111, `default` at lines 113–136) plus a `buildDebriefUrl` helper (lines 49–59) and reads `debriefPendingData` from `useAuth()` (line 17)
   When this story is implemented
   Then: (a) `useAuth()` destructure drops `debriefPendingData`; (b) the `resolveHomeScreenState`/`HomeDisplayState`/`formatTimeRemaining` imports are removed (the home screen no longer branches on display state — it renders the default content unconditionally); (c) the `buildDebriefUrl` helper is removed; (d) the entire `post-exposure` JSX block (lines 64–88) is removed; (e) the entire `expired` JSX block (lines 90–111) is removed; (f) the `{displayState === 'default' && (...)}` wrapper around the default content is removed — the default content (greeting + `CourageLadderEntryCard` + Calm Me link) renders unconditionally as the only home content; (g) the styles `postExposureCard`, `ctaText`, `acknowledgementText`, `windowTimeText`, `expiredCard`, `contextCardText`, `reflectNowButton`, `reflectNowText` are removed from the StyleSheet; (h) the `// Epic 6: replace completedAtMs+6h proxy with PowerSync expires_at; expand to full 10-state resolveHomeScreenState()` comment is updated to read `// Epic 6 Story 6.2: replace this stub with real PowerSync-backed resolveHomeScreenState() and the full 8-state machine`; (i) no behaviour change to the greeting logic (`seenOnMount.current` first-visit flip), the accessibility focus useEffect (lines 31–40), or the Calm Me button

9. **Code — `apps/mobile/app/session/debrief.tsx` unconditionally clears pending data**

   Given the debrief submit path (lines 104–131) currently branches on `isLateDebrief = parseInt(completedAtMs ?? '0') + POST_EXPOSURE_WINDOW_MS <= Date.now()` (line 120), calling `clearDebriefPending()` on late and `updateDebriefReflectionSubmitted()` on in-window
   When this story is implemented
   Then: (a) the `POST_EXPOSURE_WINDOW_MS` import (line 16) is removed; (b) the `isLateDebrief` constant and its `if/else` (lines 118–125) are removed — replaced by an unconditional call sequence that no longer touches `SESSION_DEBRIEF_PENDING` (since `setDebriefPending` is also removed from `active.tsx` in this story, there is nothing to clear; `clearDebriefPending` and `updateDebriefReflectionSubmitted` calls are deleted from the submit path); (c) the destructure of `clearDebriefPending` and `updateDebriefReflectionSubmitted` from `useAuth()` (lines 47–48) is removed; (d) the orphaned comment "NOTE: On state-8 late debrief path, SESSION_INTENTION is already cleared..." (lines 91–93) is removed; (e) `readOnly` URL param handling stays intact (it is no longer reachable from the home screen, but the route still exists for future use — leaving the handler avoids breaking deep links from anywhere); (f) all other debrief behaviour (Branch A/B/C, SUDS arc, crisis contacts threshold, enqueue UPDATE, `clearSessionIntention`, `router.replace('/(app)/index')`) is preserved exactly

10. **Code — `apps/mobile/app/session/active.tsx` stops writing SESSION_DEBRIEF_PENDING**

    Given `handleCompleteSession` in `active.tsx` (lines 76–158) writes `setDebriefPending({sessionId, fearItemId, completedAtMs, preSuds, debriefSuds, peakSuds, hasLetter, reflectionSubmitted: false})` at lines 127–136
    When this story is implemented
    Then: (a) the `setDebriefPending` call (lines 127–136) is removed; (b) the `setDebriefPending` and `hasSessionIntention` entries in the `useAuth()` destructure at line 28 are removed (`hasSessionIntention` became dead once the `hasLetter` computation went away); (c) the `// 5. Check if intention letter exists` block (lines 123–124) is removed; (d) the `// 6. Write SESSION_DEBRIEF_PENDING — used by home screen for states 7/8` comment is removed with the call; (e) the URL params passed to the debrief route (lines 150–153) remain unchanged — debrief.tsx already reads its inputs from URL params, not from MMKV; (f) all session-completion enqueue logic (`suds_readings`, `exposure_sessions` UPDATE, `fear_ladder_items` UPDATE, `clearSessionInProgress`) is preserved exactly

11. **Code — `AuthProvider.tsx` removes debrief pending plumbing + adds Option A boot wipe**

    Given `packages/supabase/src/auth/AuthProvider.tsx` exposes `debriefPendingData`, `setDebriefPending`, `clearDebriefPending`, and `updateDebriefReflectionSubmitted` via `AuthContextValue` (lines 39–42) and reads `KV_KEYS.SESSION_DEBRIEF_PENDING(userId)` on every SIGNED_IN event (lines 195–201)
    When this story is implemented
    Then: (a) `AuthContextValue` interface (lines 39–42) drops `debriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted` — the context surface shrinks by 4 entries; (b) the default `AuthContext` (lines 66–69) drops the same four defaults; (c) the `debriefPendingData` `useState` (line 106) is removed; (d) the `DebriefPendingData` import (line 3) is removed; (e) the `rawDebrief`/`setDebriefPendingDataLocal` parse block (lines 195–201) is **replaced by an Option A defensive boot wipe**: on SIGNED_IN with `store` available, after the `SESSION_IN_PROGRESS` read, call `store.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(session.user.id))` and log via a single-line `console.log('[AuthProvider] Option A wipe: cleared stale SESSION_DEBRIEF_PENDING')` (no-op if key is absent — MMKV `delete` of a non-existent key is safe); (f) the SIGNED_OUT branch's `setDebriefPendingDataLocal(null)` (line 206) is removed; (g) the four function definitions `setDebriefPending` (321–326), `clearDebriefPending` (328–333), `updateDebriefReflectionSubmitted` (335–350) are deleted; (h) the four entries in the Context Provider value object (lines 366–369) are deleted; (i) `useAuth.ts` (lines 36–38, 74) drops the same context exports and the `DebriefPendingData` type import; (j) `KV_KEYS.SESSION_DEBRIEF_PENDING` **stays** in `packages/core/src/constants/kvKeys.ts` with a deprecation comment: `// DEPRECATED 2026-06-15 (Story 5.6) — no longer written. AuthProvider deletes this key on boot to clean up stale data from the State 7/8 era. Safe to remove from KV_KEYS entirely after one release cycle.`

12. **Code — tests updated**

    Given existing tests cover the removed code paths: `apps/mobile/app/(app)/index.test.tsx` has 3 describe blocks for State 7 (lines 153–214), State 8 (lines 216–263), and default state (lines 265–289); `apps/mobile/app/session/debrief.test.tsx` has a `handleSubmitReflection` describe (lines 154–188) with separate state-7 and state-8 paths; `packages/supabase/__tests__/auth/authProvider.debrief.test.ts` exercises the entire `setDebriefPending`/`clearDebriefPending`/`updateDebriefReflectionSubmitted` MMKV pipeline
    When this story is implemented
    Then: (a) `index.test.tsx` — the `State 7` describe block (lines 153–214) and the `State 8` describe block (lines 216–263) are deleted entirely; the `default state` describe block (lines 265–289) is kept and its lone test "renders default state (CourageLadderEntryCard) when debriefPendingData is null" is rewritten to drop the `debriefPendingData` setup (just renders default unconditionally); the `makeDebriefPending` helper (lines 59–71) is deleted; the `defaultAuthValue` (lines 73–78) drops the `debriefPendingData: null` entry; the mock of `@exposure-buddy/core` (lines 36–54) drops `resolveHomeScreenState` and `formatTimeRemaining` mock implementations (or simplifies `resolveHomeScreenState` to `() => 'default'`); (b) `debrief.test.tsx` — the `handleSubmitReflection (state-7 path)` describe (lines 154–188) is rewritten as a single `handleSubmitReflection` describe with one test asserting enqueue + `clearSessionIntention` + `router.replace('/(app)/index')` fire on submit; the `clears debrief pending on state-8 late debrief` test is deleted; references to `mockUpdateDebriefReflectionSubmitted` and `mockClearDebriefPending` are removed from the global mock setup (lines 28–29, 62–68); (c) `authProvider.debrief.test.ts` — the entire `setDebriefPending / clearDebriefPending` and `updateDebriefReflectionSubmitted` describe blocks are deleted; the file is reduced to the `hasSessionIntention` and `getSessionIntention` describes only (since those are still in `AuthProvider`); if no debrief-specific assertions remain, the file is **renamed** to `authProvider.sessionIntention.test.ts` and any debrief-specific imports (`DebriefPendingData`, `SAMPLE_DEBRIEF`) are removed; (d) **a new Vitest test** is added to `packages/supabase/__tests__/auth/` (e.g. `authProvider.optionAWipe.test.ts`) asserting the boot-wipe semantics: GIVEN MMKV has a `SESSION_DEBRIEF_PENDING(userId)` entry on AuthProvider bootstrap, WHEN the SIGNED_IN listener fires, THEN the entry is deleted and no error is thrown if the key is absent

13. **CI gates pass and i18n keys cleaned up**

    Given the codebase has `home.state7.*` and `home.state8.*` i18n keys (en.json lines 131–139, hi.json lines 186–193) referenced only by the deleted State 7/8 JSX
    When this story is implemented
    Then the `state7` and `state8` blocks are removed from both `apps/mobile/src/i18n/locales/en.json` and `apps/mobile/src/i18n/locales/hi.json` (no other consumers exist — verified via repo-wide grep); `pnpm turbo typecheck` passes with zero errors; `pnpm turbo lint` passes with zero errors; `pnpm turbo test` passes — all updated tests green, no regressions in remaining 21 Jest suites (~175 tests) or Vitest suites; the `packages/core` boundary CI gate (ARC-011) passes — `home-screen-state.ts` has no new RN/Expo/Supabase imports

## Tasks / Subtasks

### T1 — Spec updates (AC: 1, 2, 3, 4, 5)

- [x] T1.1: Update `_bmad-output/planning-artifacts/prd.md` — FR Coverage Map line 195 rewrite, requirements line 66 addendum comment, Epic 8 introduction line 341 FR list edit (AC 1)
- [x] T1.2: Update `_bmad-output/planning-artifacts/epics.md`:
  - Mark Story 8.3 DEFERRED (AC 2)
  - Drop `FR-NOTIF-04` from Epic 8 introduction `**FRs covered:**`
  - Rewrite Epic 5 introduction line 1097 (drop State 7/8 sentence)
  - Remove Story 5.3 ACs 7 + 8 (lines 1213–1219), rewrite AC 6 home destination (line 1211)
  - Remove Story 6.2 countdown-interval AC (lines 1341–1343)
  - Rewrite Story 7.1 Calm Me "Not now" branch (line 1472) — route to home default state
- [x] T1.3: Update `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — drop two states from union, drop two rows from priority table, drop two required test cases, add Supersession block (AC 3)
- [x] T1.4: Update `_bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md` — rewrite F3/F4/F5 mermaid nodes, replace F6 section with deferral notice; update `index.md` and `component-strategy.md` State 7/8 references (AC 4)
- [x] T1.5: Append dated section to `_bmad-output/implementation-artifacts/deferred-work.md` with the 4 sub-bullets + 3 backlog stubs (AC 5)

### T2 — `packages/core` simplification (AC: 6, 7)

- [x] T2.1: Rewrite `packages/core/src/erp/home-screen-state.ts`:
  ```typescript
  // ARC-001: zero imports from react-native, expo-*, or @supabase/*
  //
  // Home screen state resolver (Story 5.6 — Issue #36).
  // States 7 (post-exposure) and 8 (expired) were removed 2026-06-15.
  // Epic 6 Story 6.2 will expand this function with the full HomeScreenContext
  // signature and the 8-state machine defined in ADR-HOME-STATE-RESOLVE.
  export type HomeDisplayState = 'default'

  export function resolveHomeScreenState(): HomeDisplayState {
    return 'default'
  }
  ```
- [x] T2.2: Delete `packages/core/src/types/debrief-pending-data.ts`
- [x] T2.3: Update `packages/core/src/index.ts` — drop `POST_EXPOSURE_WINDOW_MS`, `formatTimeRemaining`, and `DebriefPendingData` exports; keep `resolveHomeScreenState` and `HomeDisplayState`
- [x] T2.4: Reduce `packages/core/src/erp/home-screen-state.test.ts` to one trivial Vitest case asserting `resolveHomeScreenState()` returns `'default'` (drop all imports/constants tied to the removed surface)

### T3 — Home screen reduction (AC: 8, 13)

- [x] T3.1: Edit `apps/mobile/app/(app)/index.tsx`:
  - Drop `debriefPendingData` from `useAuth()` destructure (line 17)
  - Drop `HomeDisplayState`, `formatTimeRemaining`, and the `displayState` line entirely (line 47) — render default content unconditionally
  - Delete `buildDebriefUrl` helper (lines 49–59)
  - Delete State 7 block (lines 64–88) and State 8 block (lines 90–111)
  - Unwrap the `{displayState === 'default' && (...)}` conditional (lines 113–136) so the greeting + `CourageLadderEntryCard` + Calm Me render at top level
  - Remove unused styles (`postExposureCard`, `ctaText`, `acknowledgementText`, `windowTimeText`, `expiredCard`, `contextCardText`, `reflectNowButton`, `reflectNowText`)
  - Update the Epic 6 comment to point at Story 6.2
- [x] T3.2: Rewrite `apps/mobile/app/(app)/index.test.tsx`:
  - Delete State 7 and State 8 describe blocks (lines 153–263)
  - Reduce default state describe (lines 265–289) to a single test asserting `CourageLadderEntryCard` renders
  - Delete `makeDebriefPending` helper (lines 59–71); drop `debriefPendingData: null` from `defaultAuthValue`
  - Simplify `@exposure-buddy/core` jest.mock to mock only `resolveLowestPendingItem` and `resolveHomeScreenState: () => 'default'`
- [x] T3.3: Remove `home.state7` and `home.state8` blocks from `apps/mobile/src/i18n/locales/en.json` (lines 131–139) and `hi.json` (lines 186–193) — confirm zero remaining consumers via repo grep

### T4 — Debrief screen + active screen cleanup (AC: 9, 10)

- [x] T4.1: Edit `apps/mobile/app/session/debrief.tsx`:
  - Drop `POST_EXPOSURE_WINDOW_MS` import (line 16)
  - Drop `updateDebriefReflectionSubmitted` and `clearDebriefPending` from the `useAuth()` destructure (lines 47–48)
  - Remove `isLateDebrief` constant + `if/else` block (lines 118–125) — `handleSubmitReflection` becomes: enqueue UPDATE → `clearSessionIntention(sessionId)` → `router.replace('/(app)/index')`
  - Delete the orphaned "On state-8 late debrief path..." comment (lines 91–93)
- [x] T4.2: Edit `apps/mobile/app/session/active.tsx`:
  - Drop `setDebriefPending` and `hasSessionIntention` from `useAuth()` destructure (line 28)
  - Delete `hasLetter` computation (lines 123–124) and `setDebriefPending(...)` call (lines 127–136) and their commentary
  - Keep all other completion-flow enqueues intact (`suds_readings`, `exposure_sessions`, `fear_ladder_items`)
- [x] T4.3: Update `apps/mobile/app/session/debrief.test.tsx`:
  - Rename / consolidate the `handleSubmitReflection (state-7 path)` describe to a single `handleSubmitReflection` describe
  - Delete the `clears debrief pending on state-8 late debrief` test (lines 175–187)
  - Drop `mockUpdateDebriefReflectionSubmitted` and `mockClearDebriefPending` from the mock setup (lines 28–29, 62–68) — the new test asserts `mockEnqueue` was called, `mockClearSessionIntention` was called, `mockRouterReplace` was called with `/(app)/index`
- [x] T4.4: If `apps/mobile/app/session/active.test.tsx` references `setDebriefPending` or `mockSetDebriefPending`, remove those mocks/assertions (verify via grep before editing)

### T5 — AuthProvider cleanup + Option A boot wipe (AC: 11, 12)

- [x] T5.1: Edit `packages/supabase/src/auth/AuthProvider.tsx`:
  - Drop `DebriefPendingData` from the import on line 3
  - Drop `debriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted` from the `AuthContextValue` interface (lines 39–42) and from the default `AuthContext` (lines 66–69)
  - Delete the `debriefPendingData` `useState` (line 106)
  - Replace the rawDebrief parse block (lines 195–201) with the Option A defensive boot wipe:
    ```typescript
    // Option A (Story 5.6 / Issue #36): defensively wipe any stale SESSION_DEBRIEF_PENDING
    // left over from the State 7/8 era. Safe no-op when the key is absent.
    store.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(session.user.id))
    ```
  - Drop the `setDebriefPendingDataLocal(null)` line from the SIGNED_OUT branch (line 206)
  - Delete the `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted` function definitions (lines 321–350)
  - Drop the four entries from the Context Provider value object (lines 366–369)
- [x] T5.2: Edit `packages/supabase/src/auth/useAuth.ts`:
  - Drop `DebriefPendingData` from the import (line 5)
  - Drop the four debrief-pending fields from the merged interface (lines 36–38)
  - Drop the four merge passthroughs (line 74)
- [x] T5.3: Edit `packages/core/src/constants/kvKeys.ts` — keep the `SESSION_DEBRIEF_PENDING` key but replace the existing comment with:
  ```typescript
  // DEPRECATED 2026-06-15 (Story 5.6) — no longer written. AuthProvider deletes this
  // key on every SIGNED_IN to clean up stale data from the State 7/8 era. Safe to
  // remove from KV_KEYS entirely after one release cycle.
  SESSION_DEBRIEF_PENDING:      (userId: string) => `session:debrief_pending:${userId}`,
  ```
- [x] T5.4: Rewrite `packages/supabase/__tests__/auth/authProvider.debrief.test.ts`:
  - Delete the `setDebriefPending / clearDebriefPending` and `updateDebriefReflectionSubmitted` describes
  - If only the `hasSessionIntention` and `getSessionIntention` describes remain, **rename** the file to `authProvider.sessionIntention.test.ts` and drop the `DebriefPendingData` import + `SAMPLE_DEBRIEF` constant
- [x] T5.5: Add a new Vitest file at `packages/supabase/__tests__/auth/authProvider.optionAWipe.test.ts` covering:
  - **GIVEN** an in-memory MMKV stand-in seeded with `SESSION_DEBRIEF_PENDING(userId)` = a JSON blob
  - **WHEN** the boot-wipe helper runs (inline replica of the SIGNED_IN block)
  - **THEN** the key is absent afterwards
  - **AND** a second case proves the wipe is a no-op when the key was never set (no throw)

### T6 — CI verification (AC: 13)

- [x] T6.1: Run `pnpm turbo typecheck` — must pass with zero errors
- [x] T6.2: Run `pnpm turbo lint` — must pass with zero errors (no unused imports, no `react-i18next/no-literal-string` violations in edited files)
- [x] T6.3: Run `pnpm turbo test` — all Vitest and Jest suites green; verify no remaining references to `POST_EXPOSURE_WINDOW_MS`, `formatTimeRemaining`, `DebriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted`, `debriefPendingData`, `home.state7`, `home.state8` across `apps/`, `packages/` (grep before pushing)
- [x] T6.4: Verify `packages/core` ARC-011 boundary gate is still green (the simplified `home-screen-state.ts` has zero RN/Expo/Supabase imports)

## Dev Notes

### Locked dispositions for the three open questions (2026-06-15)

| # | Question | Decision | Where captured |
|---|----------|----------|----------------|
| 1 | Explicit clinician sign-off on overriding the 6h pacing rationale | **Proceed without sign-off; log as pending input.** | `deferred-work.md` → `BACKLOG-CLINICIAN-D1` (AC 5) |
| 2 | Soft recency acknowledgement on State 3 (Sally's suggestion) | **Out of scope.** | `deferred-work.md` → `BACKLOG-EPIC6-D1` (AC 5) |
| 3 | Crash-recovery for incomplete debrief after State 8 removal | **Option A — accept risk, wipe stale MMKV on boot.** Option B (auto-route on next launch) → backlog. | `AuthProvider.tsx` boot wipe (AC 11); `BACKLOG-EPIC9-D1` (AC 5) |

These decisions are **non-negotiable for this story** — the dev agent must not reintroduce a State 3 acknowledgement, a launch-time auto-route, or a clinician-gate step.

### Current state of code being modified (file:line precision)

The dev agent **must not introduce regressions** in adjacent behaviour. The following are the relevant invariants to preserve:

- `apps/mobile/app/(app)/index.tsx:31-40` — `useEffect` that sets accessibility focus on `cardRef` 100ms after mount. Survives unchanged.
- `apps/mobile/app/(app)/index.tsx:22-29` — `markFirstHomeVisitSeen` guarded by `authState.userId`. Survives unchanged.
- `apps/mobile/app/(app)/index.tsx:18-20` — `seenOnMount` ref capturing initial `firstHomeVisitSeen` to prevent greeting flicker (5-3-W3 / 5-3 history). Survives unchanged.
- `apps/mobile/app/session/debrief.tsx:104-131` — `handleSubmitReflection` outer structure (try / catch, isReadOnly guard, enqueue UPDATE, `clearSessionIntention`, `router.replace`) survives; only the `isLateDebrief` branch (lines 118–125) is removed.
- `apps/mobile/app/session/active.tsx:76-158` — `handleCompleteSession` completion sequence (transition guard, suds_readings INSERT, exposure_sessions UPDATE → 'completed', fear_ladder_items UPDATE, `clearSessionInProgress`, `setIsCompletingSession(false)`, `router.push`) survives; only `hasLetter` and `setDebriefPending` writes are removed.
- `packages/supabase/src/auth/AuthProvider.tsx:170-214` — `onAuthStateChange` listener — only the debrief-related branch is changed (replaced by Option A wipe). All other branches (`SESSION_IN_PROGRESS` read, `hasAuthedBefore` write, pending-deletion bootstrap) survive unchanged.

The "DEV-only `Clear rest period` escape hatch" referenced in Issue #36 line "shipped a DEV-only `Clear rest period` escape hatch" **does not exist** in the current `apps/mobile/app/(app)/index.tsx` (verified via repo-wide grep — no `Clear rest period`, `clearRestPeriod`, or `restPeriod` strings). The issue scope item "Remove the DEV 'Clear rest period' button" is therefore **a no-op** and the dev agent should not search for it.

### Architecture guardrails

- **ARC-011 (`packages/core` boundary):** the simplified `home-screen-state.ts` must keep zero imports of `react-native`, `expo-*`, or `@supabase/*`. The boundary CI gate fails the build on violation.
- **ARC-001 (no cross-package RN deps):** the rewritten `home-screen-state.ts` keeps the existing `// ARC-001: zero imports from react-native, expo-*, or @supabase/*` boundary comment.
- **No `database.types.ts` import outside `packages/supabase`:** unchanged — none of the edited files imports it; precommit hook still blocks regressions.
- **No `@supabase/supabase-js` in `apps/web`:** unchanged — `apps/web` is not touched by this story.
- **i18n boundary:** all user-facing strings in the unchanged default-state JSX continue to use `t()`. The removed JSX (and its strings) take their `home.state7.*` and `home.state8.*` keys with them.

### Boundary rules — what NOT to do in this story

The following are **out of scope** and must not be introduced even if tempting:

1. **Do not expand `resolveHomeScreenState` toward the 8-state machine.** Epic 6 Story 6.2 owns that work. This story leaves the function trivial (`() => 'default'`).
2. **Do not soft-acknowledge the recent session on State 3.** Sally's design is filed as `BACKLOG-EPIC6-D1`. No new copy keys, no new UI surface.
3. **Do not implement the launch-time auto-route to debrief on a stale `SESSION_DEBRIEF_PENDING`.** That is Option B, filed as `BACKLOG-EPIC9-D1`. The current story's Option A defensively wipes — it does not navigate.
4. **Do not drop or modify the `set_session_expires_at` server trigger or the `expires_at` column.** Migrations 0016–0019 stay intact. The trigger becomes inert (no UI consumer), and dropping it is a follow-up clean-up migration not bundled here. This story is **client-only**.
5. **Do not remove `SESSION_INTENTION` MMKV plumbing.** That key is still used by `intent.tsx` and `debrief.tsx` Branch A (letter-to-self readback). It is unrelated to State 7/8.
6. **Do not change `set_session_expires_at` trigger, `session_insert_guard` trigger, or `exposure_sessions` table schema.** No SQL migrations are produced by this story.
7. **Do not migrate `apps/web` or `apps/mobile/app/_layout.tsx`.** No layout-level changes are required — `AuthProvider` API shrinks but the provider mount stays unchanged.

### Anti-patterns to avoid (LLM-disaster prevention)

- **Don't add a "rest period" countdown or banner.** The whole point of this story is to remove the gate. Even a passive "you completed an exposure recently" pill is out of scope (it's `BACKLOG-EPIC6-D1`).
- **Don't keep `setDebriefPending` writes "for safety".** The whole MMKV plumbing is being dismantled because no consumer reads it. Leaving the writes makes the boot-wipe pointless and creates a dead-data leak that future devs will rediscover (see 5-3-W2 in Epic 5 retro).
- **Don't write a database migration to drop `expires_at` or its trigger.** That's a separate follow-up captured in `deferred-work.md` (AC 5). Shipping a DB migration broadens the blast radius and tangles client + schema concerns.
- **Don't preserve `formatTimeRemaining` "in case Epic 6 wants it".** Epic 6 Story 6.2 will compute its own time display from `Intl.DateTimeFormat` against PowerSync `expires_at` per Story 6.2 AC — not from a packages/core helper.
- **Don't extract a new "session completion ack" type or component.** No new abstractions; this is a removal story.
- **Don't change debrief.tsx routing (the `readOnly=true` deep link).** It's no longer reachable from the home screen but the route handler is preserved (defense in depth — see AC 9(e)).
- **Don't rename `HomeDisplayState`.** Keeping the named type lets Epic 6 expand the union without an API rename breaking-change.

### Testing standards

- **Vitest** for `packages/core` and `packages/supabase` (zero RN deps).
- **Jest** with `@testing-library/react-native` for `apps/mobile` screens (mocks RN modules per existing patterns).
- The new `authProvider.optionAWipe.test.ts` should follow the existing inline-MMKV-stand-in pattern from `authProvider.debrief.test.ts` lines 6–17 (do **not** import real `MMKV` — that pulls native module).
- After this story, `apps/mobile` Jest suite count drops by 2 describes; `packages/core` Vitest case count drops by ~10; `packages/supabase` Vitest case count is unchanged net (delete ~8 debrief cases, add ~2 wipe cases).
- Hindi locale (`hi.json`) test coverage is unchanged — no test asserts the presence of the `state7`/`state8` keys.

### Previous story intelligence — Story 5.3 dev notes and retro

Story 5.3 shipped the State 7/8 implementation that this story removes. From `_bmad-output/implementation-artifacts/5-3-erp-session-completion-debrief-and-home-state.md` and `epic-5-retro-2026-06-09.md`, the following are directly relevant:

- **5-3-W2 (deferred-work.md line 329):** *"`SESSION_DEBRIEF_PENDING` key persists after state-7 complete + window expiry — Epic 6 lifecycle cleanup required."* — This story closes that hole, via Option A boot wipe.
- **5-3-W3 (deferred-work.md line 331):** *"Sign-out race in `updateDebriefReflectionSubmitted` — async gap between enqueue() and updateDebriefReflectionSubmitted() call; sign-out during this window causes the MMKV write to silently no-op."* — This story removes the entire function, so the race goes away.
- **5-3-W1 (deferred-work.md line 327):** *"`resolveDisplayState()`/`formatTimeRemaining()` snapshot — both values are computed once at mount with `Date.now()`; the displayed countdown freezes and state-7→state-8 transition never fires while the screen is open. Epic 6 replaces with real-time countdown."* — Story 6.2 had an AC line 1341–1343 to refresh the countdown on a 60s interval. **That AC is removed by this story (AC 2)** since there is no longer a countdown to refresh.
- **5-3-W8 (deferred-work.md line 341):** *"`resolveDisplayState`/`formatTimeRemaining` belong in `packages/core` — both are pure derivation functions with no RN dependencies. Per the derived-state pattern they should live in `packages/core`."* — Story 5.3 already moved them. This story now removes them entirely.
- **B5 verification:** PR #35's `isCompletingSession` Fast-Refresh fix (Epic 5 retro action B5) is the discovery context for this story but unrelated to the State 7/8 removal — `active.tsx:149` already resets the flag before `router.push`. No re-work here.
- **CR-5-3-1 (deferred-work.md line 15):** *"`hasLetter` in `DebriefPendingData` can diverge from live MMKV state."* — Resolved by deletion. `hasLetter` no longer exists.
- **VER-5-3-2 (deferred-work.md line 7):** *"`session/_layout.tsx` leaves swipe-back enabled on `debrief`."* — Unchanged by this story. Out of scope.

The **Epic 5 retro** (`epic-5-retro-2026-06-09.md`) called out `AuthProvider` as a "performance timebomb" with 17+ concerns (challenge #1, key insight #2). This story **shrinks the `AuthProvider` API by 4 entries** (`debriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted`) — a small but real reduction toward action item B1 (`AuthProvider` context split). Not a full B1 resolution, but moves the needle.

### Git intelligence — recent commits relevant to this story

```
b922f23 chore(retro): Epic 5 retrospective, B1–B5 action items, and Epic 6 dependency audit
2d60fed docs(prd): reframe India as launch market, remove cost objective, split MVP/Phase 1 (#34)
f097f73 feat(erp): Story 5.3 — ERP Session Completion, Debrief & Home State (#31)   ← ships State 7/8
82c9369 feat(erp): Story 5.2 — ERP Session Start & SUDS Entry (#28)                  ← ships SESSION_DEBRIEF_PENDING key + ExposureSessions table
```

`f097f73` (Story 5.3) is the commit this story most directly modifies. Reviewing its diff is **not required** — every line being changed is identified in the ACs above with file:line precision — but the dev agent may consult it for tone/style consistency on the inverse change.

### Edge cases worth noting

- **Device with stale data after upgrade.** Users on the previous build had `SESSION_DEBRIEF_PENDING` in MMKV. On first launch of the new build, AuthProvider's `onAuthStateChange` SIGNED_IN listener fires and the Option A wipe runs. No user-visible artifact, no lingering reflection prompt.
- **MMKV degraded mode (`isStorageDegraded`).** When `mmkv === null`, the SIGNED_IN listener returns early without entering the wipe path (line 174 — `if (!mmkvReadyRef.current) return`). This is fine — there's no MMKV to wipe.
- **Multi-account on one device.** `KV_KEYS.SESSION_DEBRIEF_PENDING(userId)` is user-scoped. The Option A wipe runs against the currently signed-in user's key only. A second user signing in after sign-out triggers their own wipe.
- **Force-quit between session completion and debrief submission.** Without `setDebriefPending` writing to MMKV any longer, there is no reflection-recovery affordance. The session row sits with NULL `post_session_reflection`. This is the explicitly accepted Option A outcome (logged in `deferred-work.md`).
- **`readOnly=true` deep link to debrief.** The home screen no longer surfaces this link (State 7 was the only producer). The debrief screen's `readOnly` handler is preserved for future use (Story 8.5 achievements tab session detail view may surface it). No behaviour change.

### Project Structure Notes

- All edits stay within established package boundaries: `packages/core` (pure TS), `packages/supabase` (auth + MMKV), `apps/mobile` (Expo screens + Jest tests), plus `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/` for spec/decision-log updates.
- No new files are added outside `packages/supabase/__tests__/auth/authProvider.optionAWipe.test.ts`.
- One file is deleted: `packages/core/src/types/debrief-pending-data.ts`.
- One file is **renamed**: `packages/supabase/__tests__/auth/authProvider.debrief.test.ts` → `authProvider.sessionIntention.test.ts` (if only the `hasSessionIntention`/`getSessionIntention` describes survive — see AC 12c).
- No migrations, no new dependencies, no `_layout.tsx` changes, no new ADRs (the existing ADR-HOME-STATE-RESOLVE is updated in-place).

### References

- [Source: GitHub Issue #36 — Spec change: remove home screen State 7/State 8 blocking gate]
- [Source: _bmad-output/planning-artifacts/prd.md#FR-NOTIF-04 (line 66, line 195)]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5-introduction (line 1097), #Story-5.3-ACs (lines 1211–1219), #Story-6.2 (lines 1341–1343), #Story-7.1 (line 1472), #Story-8.3 (lines 1754–1805)]
- [Source: _bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md (lines 50–61, 67–80)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md#F3 (line 124), #F4 (line 160), #F5 (line 200), #F6 (lines 223–253)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/component-strategy.md (lines 40, 126, 165, 167, 185)]
- [Source: _bmad-output/implementation-artifacts/5-3-erp-session-completion-debrief-and-home-state.md (ACs 7, 8 — superseded)]
- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-06-09.md#Action-Items (B1, B2), #Deferred-Items (5-3-W1, W2, W3, W8)]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md (lines 7, 15, 327, 329, 331, 341)]
- [Source: packages/core/src/erp/home-screen-state.ts (current full file — to be rewritten)]
- [Source: packages/core/src/types/debrief-pending-data.ts (to be deleted)]
- [Source: packages/core/src/constants/kvKeys.ts (line 18 — deprecation comment update)]
- [Source: apps/mobile/app/(app)/index.tsx (current full file — State 7/8 blocks at lines 64–111 to be deleted)]
- [Source: apps/mobile/app/session/debrief.tsx (lines 16, 47–48, 91–93, 118–125 — to be edited)]
- [Source: apps/mobile/app/session/active.tsx (lines 28, 123–124, 127–136 — to be edited)]
- [Source: packages/supabase/src/auth/AuthProvider.tsx (lines 3, 39–42, 66–69, 106, 195–201, 206, 321–350, 366–369 — to be edited)]
- [Source: packages/supabase/src/auth/useAuth.ts (lines 5, 36–38, 74 — to be edited)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (`claude-opus-4-7`) via Claude Code, bmad-dev-story skill.

### Debug Log References

- `pnpm turbo typecheck` — 10/10 successful, 3.8s
- `pnpm turbo lint` — 7/7 successful, 1.1s
- `pnpm turbo test` — 9/9 successful, 4.0s
  - `@exposure-buddy/core`: 5 test files, 34 tests passed (was 39 → −5 from removed home-screen-state + formatTimeRemaining cases; +0 net for the trivial replacement)
  - `@exposure-buddy/supabase`: 5 passed + 8 skipped (RLS — environment-gated), 27 tests passed including new `authProvider.sessionIntention.test.ts` (6 tests, file renamed from `authProvider.debrief.test.ts`) and new `authProvider.optionAWipe.test.ts` (3 tests)
  - `exposure-buddy-mobile`: 21 suites, 163 tests passed (was 175 → −12 from removed State 7/State 8 + state-8 late-debrief + setDebriefPending coverage; expected reduction per AC 12)
- Repo-wide post-edit grep for `POST_EXPOSURE_WINDOW_MS`, `formatTimeRemaining`, `DebriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted`, `debriefPendingData`, `home.state7`, `home.state8` — zero hits across `apps/` and `packages/`. Remaining `'expired'` occurrence is in `apps/mobile/app/(auth)/otp-verification.tsx` for OTP token expiry semantics (unrelated to home States 7/8).
- ARC-011 boundary gate: `home-screen-state.ts` retains the `// ARC-001: zero imports from react-native, expo-*, or @supabase/*` comment and has no new imports — boundary preserved.

### Completion Notes List

- All 13 ACs satisfied; all 26 sub-tasks (T1.1–T6.4) marked complete.
- **Scope-shape note (no AC change):** AC 1 referenced the "PRD requirements line 66" but `FR-NOTIF-04` is canonically defined in `epics.md` (line 66 / FR Coverage Map line 195), not `prd.md`. PRD only listed FR-NOTIF-01/02/03 in its Re-Engagement Notifications section. Implementation handled this by (a) updating both lines in `epics.md` per AC intent (strike-through on the FR list line + full Decision record on the FR Coverage Map line); and (b) appending a deferral-pointer HTML comment to `prd.md` after the FR-NOTIF-03 entry so a reader of the PRD finds the cross-reference. The deferral intent is captured exactly as specified — only the file location was corrected.
- **Active.tsx — `authState` and `hasSessionIntention` deletions:** AC 10(b) called for dropping `setDebriefPending` and `hasSessionIntention` from the `useAuth()` destructure. After those two were removed, `authState` was also unreferenced inside `active.tsx`, so it was dropped from the destructure to avoid an unused-binding lint warning. No functional change. The fearItem-letter computation (`hasLetter`) that consumed `hasSessionIntention` was removed together with the `setDebriefPending` payload that consumed `hasLetter` — all in AC 10's scope.
- **Debrief.tsx — `completedAtMs` URL param:** Per AC 10(e) the URL params from `active.tsx` remain unchanged (still send `completedAtMs`). Inside `debrief.tsx` the destructure no longer extracts it (no consumer post-isLateDebrief removal), and the inline type for `useLocalSearchParams` still declares the field to keep the URL contract typed end-to-end. Zero behavioural impact.
- **`authProvider.debrief.test.ts` file rename → `authProvider.sessionIntention.test.ts`:** Per AC 12(c). Old file deleted, new file contains only `hasSessionIntention` (4 cases) and `getSessionIntention` (2 cases) describes. `DebriefPendingData` import and `SAMPLE_DEBRIEF` constant removed.
- **New `authProvider.optionAWipe.test.ts`:** 3 cases — deletes a stale key on SIGNED_IN, no-op when key absent, user-scoped deletion. Inline replica of the boot-wipe line in `AuthProvider.tsx`; follows the same in-memory MMKV stand-in pattern as the existing helper-test file.
- **`KV_KEYS.SESSION_DEBRIEF_PENDING` preserved with deprecation comment** per AC 11(j) — the boot wipe references it, so the key entry stays in `kvKeys.ts` with a "DEPRECATED 2026-06-15 — safe to remove after one release cycle" comment.
- **`exposure_sessions.expires_at` trigger and column untouched** per the "no migration in this story" guardrail. Migrations 0016/0018/0019 still set `expires_at` on session completion; no client now reads it. Drop is filed for a follow-up Story 9.x candidate in `deferred-work.md`.
- **AuthProvider API surface shrunk by 4 entries** (`debriefPendingData`, `setDebriefPending`, `clearDebriefPending`, `updateDebriefReflectionSubmitted`) — partial progress against Epic 5 retro action item B1 (AuthProvider context split), though full B1 is still outstanding (the provider retains 13+ concerns).
- **i18n cleanup verified** — `home.state7.*` and `home.state8.*` removed from both `en.json` and `hi.json`. Repo-wide grep for `home.state` returns zero hits.
- **No new dependencies, no new DB migrations, no `apps/web` changes, no `_layout.tsx` changes** — all per the boundary rules in Dev Notes.

### File List

**Modified — code (10 files):**
- `packages/core/src/erp/home-screen-state.ts` — rewritten to trivial `() => 'default'`
- `packages/core/src/erp/home-screen-state.test.ts` — reduced to one Vitest case
- `packages/core/src/index.ts` — dropped `DebriefPendingData`, `POST_EXPOSURE_WINDOW_MS`, `formatTimeRemaining` exports
- `packages/core/src/constants/kvKeys.ts` — deprecation comment on `SESSION_DEBRIEF_PENDING`
- `packages/supabase/src/auth/AuthProvider.tsx` — context API −4, Option A boot wipe added
- `packages/supabase/src/auth/useAuth.ts` — merged interface −4 fields, import cleanup
- `apps/mobile/app/(app)/index.tsx` — State 7/8 JSX deleted, default unwrapped
- `apps/mobile/app/(app)/index.test.tsx` — State 7/8/default-describe trimmed to single suite (10 tests)
- `apps/mobile/app/session/debrief.tsx` — `isLateDebrief` branch removed, imports cleaned
- `apps/mobile/app/session/debrief.test.tsx` — `state-7`/`state-8` paths consolidated to one submit test
- `apps/mobile/app/session/active.tsx` — `setDebriefPending` / `hasLetter` / unused `authState` removed
- `apps/mobile/app/session/active.test.tsx` — mocks for `setDebriefPending`/`hasSessionIntention` removed, peakSuds test rewritten to inspect URL
- `apps/mobile/src/i18n/locales/en.json` — `home.state7` and `home.state8` blocks removed
- `apps/mobile/src/i18n/locales/hi.json` — `home.state7` and `home.state8` blocks removed

**Added (2 files):**
- `packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts` — renamed and trimmed from old debrief test
- `packages/supabase/__tests__/auth/authProvider.optionAWipe.test.ts` — new test for Option A boot wipe

**Deleted (2 files):**
- `packages/core/src/types/debrief-pending-data.ts`
- `packages/supabase/__tests__/auth/authProvider.debrief.test.ts` (replaced by `authProvider.sessionIntention.test.ts` + `authProvider.optionAWipe.test.ts`)

**Modified — spec docs (7 files):**
- `_bmad-output/planning-artifacts/prd.md` — HTML comment after FR-NOTIF-03 pointing to FR Coverage Map decision record
- `_bmad-output/planning-artifacts/epics.md` — FR-NOTIF-04 list entry struck through + Coverage Map decision record + Epic 5 intro + Story 5.3 ACs 7+8 removed + Story 6.2 countdown-interval AC removed + Story 7.1 Calm Me "Not now" destination + Epic 8 FRs covered + Story 8.3 DEFERRED header
- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — 2 states dropped, priority table renumbered 1–8, `windowExpiredAt` field commented out, 2 required test cases removed, Supersession block appended
- `_bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md` — F3 line 124 + F4 line 160 nodes rewritten, F5 WINDOW_EXPIRED branch removed, F6 section replaced with deferral notice
- `_bmad-output/planning-artifacts/ux-design-specification/index.md` — F6 link annotated
- `_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md` — `HomeStateCard` states list reduced to 8 + 4 component usage notes scrubbed of State 7/8 refs
- `_bmad-output/implementation-artifacts/deferred-work.md` — dated section + 3 backlog stubs prepended

**Modified — sprint tracking (2 files):**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `5-6` flipped to `review`
- `_bmad-output/implementation-artifacts/5-6-remove-home-states-7-and-8.md` — this story file; Status `review`, all task boxes checked, Dev Agent Record filled, File List populated

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-06-15 | Story drafted from Issue #36; status `ready-for-dev` | Claude (bmad-create-story) |
| 2026-06-15 | Implementation complete — 26 sub-tasks, 16 files modified, 2 added, 2 deleted; all CI gates green (typecheck/lint/test); status flipped to `review` | Claude Opus 4.7 (bmad-dev-story) |
