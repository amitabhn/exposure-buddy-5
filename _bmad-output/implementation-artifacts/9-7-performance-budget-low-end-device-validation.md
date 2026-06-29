# Story 9.7: Performance Budget — Low-End Device Validation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user on a low-end Android device,
I want the app to feel responsive during exposure sessions,
so that micro-frictions do not compound anxiety during a vulnerable moment (NFR-PERF-01).

## Acceptance Criteria

1. **Given** the performance budget targets **When** this story is implemented **Then** the following budgets are defined and documented in `apps/mobile/docs/performance-budget.md`: (1) cold start to interactive: ≤2 seconds on the reference device profile; (2) frame rate during the active exposure screen (SUDS slider interaction): ≥55 fps; (3) Calm Me button tap-to-screen latency: ≤200ms; ~~(4) Achievements tab initial render with 10 sessions of data: ≤1 second~~ — N/A for MVP; Story 8.5 (Achievements tab) deferred post-MVP 2026-06-21.

2. **Given** the reference device profile **When** performance is measured **Then** the reference profile is Android, 2GB RAM, Snapdragon 439 or equivalent (Redmi 9A / Samsung Galaxy M02 tier); iOS performance at this tier is expected to be sufficient and is not the primary validation target for MVP; the Android reference is tested via an emulator with 2× CPU throttle if a physical device is not available.

3. **Given** measurement tooling **When** performance is measured **Then** React Native's built-in Performance Monitor is used for frame rate; cold start is measured via `adb shell am start -W` or equivalent; Flashlight CLI (`@perf-tools/flashlight`) is used if available and installed; manual stopwatch measurement is acceptable as a fallback with results documented in `apps/mobile/docs/performance-budget.md`.

4. **Given** the performance audit results **When** a budget violation is found **Then** violations in cold start (>2s) and Calm Me tap-latency (>200ms) targets are P0 blockers — the story does not close until they are resolved; frame rate below 45fps during SUDS slider interaction is P0; frame rate between 45–55fps is P1 and may be deferred to post-MVP with explicit sign-off in the story's Completion Notes; a `// PERF` comment is added to any component where a workaround or optimisation is applied, explaining the constraint.

## Tasks / Subtasks

- [ ] **Task 1 — Define reference device profile and measurement methodology; create `performance-budget.md` (AC: 1, 2, 3)**
  - [ ] 1.1 Create `apps/mobile/docs/performance-budget.md`. Include: (a) reference device profile (Android, 2GB RAM, Snapdragon 439 equivalent; Redmi 9A / Samsung Galaxy M02 tier); (b) emulator fallback instructions (2× CPU throttle via Android Studio AVD manager or `emulator -prop persist.cpu.throttle=2`); (c) the three budget targets from AC1; (d) the measurement tools to use for each metric; (e) a results table to fill in during Tasks 2–4; (f) a findings section for any P0/P1 violations.
  - [ ] 1.2 Verify Flashlight CLI (`@perf-tools/flashlight`) is available. Run `npx @perf-tools/flashlight --version` to check. If not installed globally, note in `performance-budget.md` that the fallback (manual stopwatch / RN Performance Monitor) was used. Do NOT add Flashlight as a project dependency — it is a local measurement tool, not a shipped package.
  - [ ] 1.3 Confirm `adb` is available on the local machine (`adb version`). Document the Android emulator or physical device to be used, including Android version and available RAM configuration.

- [ ] **Task 2 — Cold start measurement and remediation (AC: 1, 4)**
  - [ ] 2.1 Set up the reference emulator: create or confirm an Android 10+ AVD with 2GB RAM and enable 2× CPU throttle. Launch the Expo development or preview build (`eas build --profile preview` or the existing preview build).
  - [ ] 2.2 Measure cold start: force-stop the app (`adb shell am force-stop com.exposurebuddy`), then run `adb shell am start -W -n com.exposurebuddy/.MainActivity` three times and record the `TotalTime` for each run. Use the median. Document in `performance-budget.md` results table.
  - [ ] 2.3 **If cold start exceeds 2 seconds:** identify the bottleneck by temporarily adding `console.time`/`console.timeEnd` markers at key startup boundaries in `apps/mobile/app/_layout.tsx`: before and after `initErrorHandler()`, before and after MMKV key derivation, before and after PowerSync init (`PowerSyncConnectionManager`), and at the route decision point. Remove all markers after diagnosis. Look especially at: (a) `PowerSyncConnectionManager` in `_layout.tsx` — the `useEffect` that initialises the PowerSync database opens a native SQLite file; (b) `AuthProvider` hydration in `packages/supabase/src/auth/AuthProvider.tsx` — MMKV reads block the startup sequence per ARC-004; (c) `_dbByUserId` Map in `packages/sync/src/client.ts` — on a device that has signed in before, an existing db handle is reused rather than reopened, so this should be fast on warm starts.
  - [ ] 2.4 Apply any remediations found (e.g. lazy PowerSync init, deferring non-critical effects). Add `// PERF` comment explaining the optimisation. Re-measure after changes.
  - [ ] 2.5 Document final cold start measurement (3 runs, median value) in `performance-budget.md`. If the budget passes, mark P0 resolved. If 45-55fps range applies (see Task 3), document P1 deferral rationale here.

- [ ] **Task 3 — Frame rate audit during SUDS slider interaction on the active session screen (AC: 1, 4)**
  - [ ] 3.1 Enable the React Native Performance Monitor: shake the device / emulator and enable FPS monitoring, or open Flipper and use the Performance plugin. Navigate to an active ERP session.
  - [ ] 3.2 Interact with the SUDS slider by repeatedly tapping `SudsScale` values (0–10) while the Performance Monitor is running. Record the minimum fps observed during slider interaction. The session timer tick is N/A for this story — `apps/mobile/app/session/active.tsx` does not currently render a visible countdown or elapsed timer; if a timer is added in a future story it must not drop frame rate below 55fps.
  - [ ] 3.3 Key files to inspect if fps drops below 55: `apps/mobile/app/session/active.tsx` (Modal re-renders on each `setPendingSuds` call; consider `React.memo` or `useCallback` on the onChange handler); `apps/mobile/src/components/session/SudsScale.tsx` (each tap triggers `onChange` → state update → re-render cycle).
  - [ ] 3.4 If fps < 45 (P0): investigate whether `SudsScale` re-renders the parent `ActiveScreen` on every value change. Guard with `useCallback` on the `setPendingSuds` setter. If the Modal re-renders the entire screen, extract it to a separate component.
  - [ ] 3.5 Document final fps measurement in `performance-budget.md`. Add `// PERF` comment to any optimised component.

- [ ] **Task 4 — Calm Me button tap-to-screen latency (AC: 1, 4)**
  - [ ] 4.1 From any screen where `CalmMeFab` is visible (home screen `(app)/index.tsx`, ladder, an active session), tap the Calm Me button. Measure the time from tap to when the Calm Me screen is interactive (i.e. the courage affirmation text is visible and the action buttons are tappable). Use Flashlight CLI if available; otherwise use a stopwatch on a screen recording.
  - [ ] 4.2 Key files: `apps/mobile/src/components/CalmMeFab.tsx` — the FAB calls `handlePress` which runs `router.push('/calm-me')` after an auth check; `apps/mobile/app/calm-me/index.tsx` — the Calm Me shell renders the affirmation and action buttons; `packages/ui/src/components/CalmMeButton.tsx` — the button itself (no animation on press per ADR — must never show loading state).
  - [ ] 4.3 The Calm Me button must have zero loading state and instant render per UX-DR8 and the CalmMeButton ADR. If latency exceeds 200ms, the most likely cause is navigation overhead from Expo Router `router.push`. Check whether the Calm Me route can be pre-loaded using Expo Router's `<Link prefetch>` or `router.prefetch('/calm-me')`.
  - [ ] 4.4 Document final latency measurement (3 taps, median) in `performance-budget.md`. Add `// PERF` comment if any workaround is applied.

- [ ] **Task 5 — Validate and close (AC: 1–4)**
  - [ ] 5.1 Run `pnpm turbo typecheck lint test` repo-wide; confirm all packages green. Any optimisation code change (memoisation, component extraction, lazy init) must not introduce TypeScript errors or lint violations.
  - [ ] 5.2 Confirm `apps/mobile/docs/performance-budget.md` exists and contains: reference device profile; measurement methodology; a completed results table for all three metrics; P0/P1 classification for any violation; resolution status for any P0.
  - [ ] 5.3 Grep for `// PERF` in `apps/mobile` — confirm every workaround location has the comment.
  - [ ] 5.4 If any P1 deferral was applied (frame rate 45–55fps range), document the explicit deferral sign-off in this story's Completion Notes and in `_bmad-output/implementation-artifacts/deferred-work.md`.

## Dev Notes

### Reference device emulator setup

The target reference is Android 10+, 2GB RAM, Snapdragon 439-class CPU (Redmi 9A / Samsung Galaxy M02 tier). In the Android Studio AVD Manager:

1. Create a Pixel 4a or "Medium Phone" AVD with `Target: Android 10 (API 29)`, RAM: 2048 MB.
2. To apply 2× CPU throttle: in the emulator toolbar → Extended controls → Settings → Throttling → select "2×" (or launch with `emulator @AVD_NAME -prop persist.cpu.throttle=2`). The 2× throttle is a CI-friendly approximation for mid-range devices — physical device is preferred if available.
3. A EAS `preview` build is required (`expo-dev-client` cannot measure cold start accurately due to extra dev overhead). If a preview APK from the most recent successful EAS build is available, use it directly.

### Performance budget rationale

| Metric | Budget | NFR reference | P0 threshold |
|---|---|---|---|
| Cold start to interactive | ≤2s | NFR-PERF-01 (<3s P90) | >2s |
| SUDS slider frame rate | ≥55fps | NFR-PERF-02 (<500ms SUDS write) | <45fps |
| Calm Me tap-to-screen | ≤200ms | UX-DR8 (instant render, no loading state) | >200ms |

Note: NFR-PERF-01 specifies <3 seconds at P90. Story 9.7 adopts the stricter ≤2s budget to give Story 9.9 (India launch) headroom for the 2G fallback validation.

### Cold start bottleneck suspects

The MMKV startup sequence per ARC-004: key derivation → MMKV sync reads → PowerSync init → route decision. All four stages are sequential in `apps/mobile/app/_layout.tsx`. The PowerSync database open (`getPowerSyncDatabase()` in `packages/sync/src/client.ts`) is the most likely cold-start bottleneck — it opens a native SQLite file via `@journeyapps/react-native-quick-sqlite`. On warm restarts the `_dbByUserId` Map returns the existing handle (fast); on cold start with no prior db, the file is created.

Known deferred issue (from Story 6.2-A code review): the `_dbByUserId` Map in `packages/sync/src/client.ts` never evicts entries — open `PowerSyncDatabase` handles accumulate on shared devices over time. This is not a cold-start concern (Map lookup is O(1)) but may contribute to memory pressure on 2GB RAM devices over long sessions. Do NOT fix the eviction issue in this story — it is already tracked in `deferred-work.md` under Story 6.2-A.

### Frame rate on the active session screen

`apps/mobile/app/session/active.tsx` does not currently render a visible session timer or countdown. The "session timer tick" mentioned in the epics is N/A for the current implementation. Frame rate audit scope is SUDS slider interaction only (`SudsScale.tsx`). The screen uses a `Modal` for SUDS entry — each `setPendingSuds` call re-renders the Modal content. If fps drops during slider interaction, a `useCallback`-memoised `onChange` handler is the first optimisation to try.

### Calm Me button architecture

`CalmMeFab` (`apps/mobile/src/components/CalmMeFab.tsx`) calls `router.push('/calm-me')`. Per UX-DR8 and the CalmMeButton ADR, the Calm Me button must never show a loading state. The 200ms budget covers Expo Router navigation overhead + Calm Me screen mount time. `@rn-primitives/portal` is already installed (`package.json`) and used in `apps/mobile` — the CalmMeFab uses zIndex positioning above the Stack (not a portal), so portal overhead is not relevant here.

### Previous story learnings (Story 9.6)

Story 9.6 (Error State & Empty State UX Audit) established the following patterns that remain relevant:
- **Validation command**: `pnpm turbo typecheck lint test` — use this before marking any task complete.
- **`// PERF` comment convention**: analogous to Story 9.6's `accessibilityLiveRegion` requirement on every error Text node — every optimisation site must be annotated. This makes future perf regressions easier to locate.
- **No new i18n keys in this story**: performance measurement and documentation is dev-facing only; no user-visible copy is added or changed.
- **Pre-confirmed finding**: the `_dbByUserId` Map in `packages/sync/src/client.ts` is a known deferred issue — do not fix it here; just note its existence if memory pressure is observed during testing.
- **Double-submit guard pattern** (isSubmittingRef): Story 9.6 added this to several screens. If cold-start optimisation touches `_layout.tsx`, do not remove any of the Story 9.6 error boundary export or the `initErrorHandler()` call.

### Files likely to create or modify

- **New**: `apps/mobile/docs/performance-budget.md` — the primary artefact of this story; analogous to `accessibility-audit.md` (9.3) and `error-state-inventory.md` (9.6).
- **Possibly modified** (only if violations are found and remediations are needed):
  - `apps/mobile/app/session/active.tsx` — `useCallback` on `setPendingSuds`/`setPendingDebriefSuds` handlers if fps < 45
  - `apps/mobile/src/components/session/SudsScale.tsx` — render optimisation if fps < 45
  - `apps/mobile/app/_layout.tsx` — lazy init or deferred effect if cold start > 2s; must not touch the `ErrorBoundary` export or `initErrorHandler()` added in Story 9.6
  - `apps/mobile/src/components/CalmMeFab.tsx` — prefetch or routing optimisation if tap latency > 200ms

### What success looks like

- `apps/mobile/docs/performance-budget.md` exists with completed results table.
- All three metrics pass their P0 thresholds (or P1 deferrals are explicitly signed off in Completion Notes + deferred-work.md).
- Any optimised component has a `// PERF` comment.
- `pnpm turbo typecheck lint test` green.
- No Story 9.6 regressions (ErrorBoundary, accessibilityLiveRegion, isSubmittingRef guards all still present).

### Excluded from scope

- **Story 8.5 Achievements tab render**: explicitly deferred post-MVP 2026-06-21; the budget table row is struck through in AC1 and retained as reference copy for when the tab ships (see `deferred-work.md` 2026-06-21 entry).
- **Load testing (10,000 concurrent users)**: this is Story 9.9's scope (Phase 1 India gate — NFR-SCALE-01).
- **Hindi locale / RTL rendering**: Story 9.9 scope.
- **`_dbByUserId` Map eviction**: tracked in `deferred-work.md` under Story 6.2-A; do not fix in this story.
- **Session timer implementation**: no countdown or elapsed timer is currently on `active.tsx`; if one is needed, it is a new feature outside Epic 9's audit scope.
- **haptic/audio degradation**: Story 9.8.
- **`SudsArcChart` performance** (debrief screen): the debrief screen is not in the active session hot path; its rendering latency is not measured in this story.

### Architecture compliance

- ARC-004: MMKV startup sequence must remain intact (key derivation → MMKV reads → PowerSync init → route decision). Any cold-start optimisation that re-orders or parallelises these stages must explicitly document why the ordering constraint is preserved.
- ARC-005: No direct `PowerSyncDatabase.execute()` calls from `apps/mobile` — all writes remain via `adapter.enqueue()`. Performance optimisations do not bypass the sync adapter.
- ARC-011: `packages/core` has zero RN/Expo/Supabase imports — any memoisation helpers added to core must be pure TypeScript.
- ADR-DARK-MODE-NATIVEWIND: `colorScheme="light"` locked at root; no performance optimisation may alter app-level color scheme config.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 9.7`] — Acceptance criteria, budget targets, measurement tooling, violation triage
- [Source: `_bmad-output/planning-artifacts/epics.md`] — NFR-PERF-01 (<3s cold start P90), NFR-PERF-02 (<500ms SUDS write), NFR-DEVICE-01 (2GB RAM Android 10+), UX-DR8 (CalmMe instant render)
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`] — Naming, structure, prohibited imports
- [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`] — ARC-004 (MMKV startup), ARC-005 (SyncAdapter), ARC-011 (core boundary)
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md`] — `_dbByUserId` Map eviction (6.2-A), Achievements tab deferral (2026-06-21)
- [Source: `apps/mobile/app/session/active.tsx`] — SUDS slider interaction, no visible session timer, Modal-based SUDS entry
- [Source: `apps/mobile/src/components/CalmMeFab.tsx`] — Calm Me FAB implementation, `router.push('/calm-me')` pattern
- [Source: `apps/mobile/app/_layout.tsx`] — Root layout, ErrorBoundary (Story 9.6), PowerSyncConnectionManager, MMKV startup sequence
- [Source: `packages/sync/src/client.ts`] — `_dbByUserId` Map, `getPowerSyncDatabase()` cold start path
- [Source: `apps/mobile/docs/accessibility-audit.md`] — Precedent for durable audit doc format (Story 9.3)
- [Source: `apps/mobile/docs/error-state-inventory.md`] — Precedent for durable audit doc format (Story 9.6)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6) — story context generated by create-story workflow; implementation agent model recorded here on dev-story run.

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Change |
|---|---|
| 2026-06-29 | Story 9.7 created via create-story workflow. Pre-audit analysis confirmed: `active.tsx` has no visible session timer (N/A noted in Task 3.2); `CalmMeFab` uses `router.push('/calm-me')` with no loading state; `_dbByUserId` Map eviction is a known deferred issue (6.2-A) not addressed in this story; Achievements tab budget line struck through per 2026-06-21 deferral of Story 8.5. Reference device profile: Android 10+, 2GB RAM, Snapdragon 439-equivalent (emulator with 2× CPU throttle as fallback). |
