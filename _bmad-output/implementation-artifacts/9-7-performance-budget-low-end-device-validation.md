# Story 9.7: Performance Budget — Low-End Device Validation

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user on a low-end Android device,
I want the app to feel responsive during exposure sessions,
so that micro-frictions do not compound anxiety during a vulnerable moment (NFR-PERF-01).

## Acceptance Criteria

1. **Given** the performance budget targets **When** this story is implemented **Then** the following budgets are defined and documented in `apps/mobile/docs/performance-budget.md`: (1a) cold start — TotalTime (`adb shell am start -W`): ≤2 seconds on the reference device, Profile B (returning user, valid token), release APK; (1b) cold start — content-visible (all `ActivityIndicator` spinners gone, home screen list rendered): ≤3.5 seconds, same build and profile; (2a) SUDS Modal slide-in animation fps (`active.tsx` `animationType="slide"` Modal): ≥55fps on release APK; (2b) SUDS button tap-to-selection-highlight latency: ≤100ms; (3) Calm Me button tap-to-mount latency (from `onPress` in `CalmMeFab.handlePress` to first `onLayout`/`useEffect` mount in `calm-me/index.tsx`): ≤200ms; ~~(4) Achievements tab initial render with 10 sessions of data: ≤1 second~~ — N/A for MVP; Story 8.5 (Achievements tab) deferred post-MVP 2026-06-21.

2. **Given** the reference device profile **When** performance is measured **Then** the reference profile is Android, 2GB RAM, Snapdragon 439 or equivalent (Redmi 9A / Samsung Galaxy M02 tier); iOS performance at this tier is expected to be sufficient and is not the primary validation target for MVP; the Android reference is tested via an emulator with 2× CPU throttle if a physical device is not available.

3. **Given** measurement tooling **When** performance is measured **Then** all metrics are measured against a **release APK** (`eas build --profile preview` or existing preview build) — debug/dev-client builds are not valid measurement environments; Flashlight CLI (`@perf-tools/flashlight`) is **required** for SUDS Modal fps measurement — install locally before Task 3 if not present (`npm install -g @perf-tools/flashlight`), do not add as a project dependency; fallback for fps if Flashlight genuinely cannot run: 60fps screen recording on the release APK with frame-counting via VLC or `ffprobe`; cold start TotalTime is measured via `adb shell am start -W`; cold start content-visible is measured via stopwatch on 60fps screen recording; Calm Me tap-to-mount latency is measured via Flashlight or stopwatch on screen recording; all results documented in `apps/mobile/docs/performance-budget.md` with the measurement tool recorded per row.

4. **Given** the performance audit results **When** a budget violation is found **Then** violations in cold start TotalTime (>2s), cold start content-visible (>3.5s), and Calm Me tap-to-mount (>200ms) are P0 blockers — the story does not close until they are resolved; SUDS Modal slide-in fps below 45fps is P0; fps between 45–55fps is P1 and may be deferred to post-MVP with explicit sign-off in the story's Completion Notes **and** in `_bmad-output/implementation-artifacts/deferred-work.md`; SUDS tap-to-highlight latency above 100ms is P0; a `// PERF` comment is added to any component where a workaround or optimisation is applied, explaining the constraint.

## Tasks / Subtasks

- [x] **Task 1 — Define reference device profile and measurement methodology; create `performance-budget.md` (AC: 1, 2, 3)**
  - [x] 1.1 Create `apps/mobile/docs/performance-budget.md`. Include: (a) reference device profile (Android, 2GB RAM, Snapdragon 439 equivalent; Redmi 9A / Samsung Galaxy M02 tier); (b) emulator fallback instructions (2× CPU throttle via Android Studio AVD Manager); (c) the five budget targets from AC1 (1a, 1b, 2a, 2b, 3); (d) the measurement tools to use for each metric and the build type (release APK for all); (e) a results table with columns: Metric / Budget / Result (Profile A) / Result (Profile B) / Tool / Build Type / Pass/Fail; (f) a findings section for any P0/P1 violations.
  - [x] 1.2 Install Flashlight CLI (`@perf-tools/flashlight`) if not already present: `npm install -g @perf-tools/flashlight` then verify with `npx @perf-tools/flashlight --version`. Flashlight is **required** for fps measurement — do NOT add it as a project dependency. If Flashlight genuinely cannot run on this machine (ADB device connection issue, OS incompatibility), document the reason in `performance-budget.md` and use the fallback: 60fps screen recording (`adb shell screenrecord` or device recorder) + frame-count analysis with VLC or `ffprobe`. — **RESULT: Both `@perf-tools/flashlight` and `@bamlab/flashlight` returned 404 on npm (package unavailable). `adb` is also not installed on this machine. Documented in `performance-budget.md` §Tooling Availability. Measurement tasks require a machine with Android SDK installed.**
  - [x] 1.3 Confirm `adb` is available on the local machine (`adb version`). Confirm the release APK (`eas build --profile preview`) is available or build one. Document the Android emulator or physical device to be used, including Android version and available RAM configuration. — **RESULT: `adb` not found on this machine (no Android SDK installed). Documented in `performance-budget.md` §Tooling Availability. Tasks 2, 3, 4 measurements require a machine with `adb` and a connected device/emulator.**

- [ ] **Task 2 — Cold start measurement and remediation (AC: 1, 4)**
  - [ ] 2.1 Set up the reference device/emulator: create or confirm an Android 10+ AVD with 2GB RAM and 2× CPU throttle (Android Studio AVD Manager → Extended Controls → Settings → Throttling). Confirm the release APK is sideloaded: `adb install <path-to-preview.apk>`. Do NOT use Expo Dev Client — it inflates cold-start significantly.
  - [ ] 2.2 Measure cold start — **two auth profiles, run each 3 times, use median:**
    - **Profile A ("first-install"):** `adb shell pm clear com.exposurebuddy` to wipe all app data, then `adb shell am start -W -n com.exposurebuddy/.MainActivity`. Record `TotalTime`. This isolates startup code from auth network.
    - **Profile B ("returning user, valid token"):** sign in once in the app, then `adb shell am force-stop com.exposurebuddy`, then `adb shell am start -W -n com.exposurebuddy/.MainActivity`. Record `TotalTime`. Before each run, verify the stored token is not expired (check app → sign out → sign back in if needed to refresh).
    - Record `TotalTime` (P0 gate: ≤2s for Profile B), then immediately record content-visible time on a 60fps screen recording (stopwatch from tap to all spinners gone on home screen; P0 gate: ≤3.5s for Profile B). Both measurements documented in the results table.
    - **Known Limitation:** Profile C (expired token on 2G) is excluded from P0 gating — the variable is network round-trip latency in `supabase.auth.refreshSession()`, not app startup code. Document in `performance-budget.md` under "Known Limitations."
  - [ ] 2.3 **If TotalTime or content-visible exceeds budget:** identify the bottleneck by temporarily adding `console.time`/`console.timeEnd` markers at key startup boundaries in `apps/mobile/app/_layout.tsx`: before and after `initErrorHandler()`, before and after MMKV key derivation, before and after PowerSync init (`PowerSyncConnectionManager`), and at the route decision point. Look especially at: (a) `PowerSyncConnectionManager` in `_layout.tsx` — the `useEffect` that initialises the PowerSync database opens a native SQLite file via `@journeyapps/react-native-quick-sqlite`; (b) `AuthProvider` hydration in `packages/supabase/src/auth/AuthProvider.tsx` — MMKV reads block the startup sequence per ARC-004; for Profile C users (expired token), the `supabase.auth.setSession()` call triggers a network refresh before `onAuthStateChange` fires — this is network latency, not fixable in app code; (c) `_dbByUserId` Map in `packages/sync/src/client.ts` — on Profile A (first-install after pm clear), no prior db handle exists and the SQLite file is created fresh, which is slower than Profile B.
    - [ ] 2.3a After diagnosis, confirm all `console.time`/`console.timeEnd` markers have been removed: `grep -r "console.time" apps/mobile/app/_layout.tsx` must return no results.
  - [ ] 2.4 Apply any remediations found (e.g. lazy PowerSync init, deferring non-critical effects). Add `// PERF` comment explaining the optimisation. Re-measure both profiles after changes.
  - [ ] 2.5 Document final cold start measurement (3 runs per profile, median values) in `performance-budget.md`. If both sub-budgets pass on Profile B, mark P0 resolved.

- [ ] **Task 3 — SUDS performance audit: Modal slide-in fps and button tap latency (AC: 1, 4)**

  **Context:** `SudsScale.tsx` renders 11 discrete `TouchableOpacity` buttons in a `flexWrap` row — there is no pan gesture or slider drag. The fps risk is not button presses; it is the `<Modal animationType="slide">` in `active.tsx` (used for both SUDS entry and session completion). Two distinct measurements are required.

  - [ ] **3a — SUDS Modal slide-in fps (release APK, Flashlight)**
    - [ ] 3a.1 Use Flashlight CLI against the release APK on the reference device. Navigate to an active ERP session in the app. Attach Flashlight: `flashlight measure --bundleId com.exposurebuddy`. Open the SUDS logging Modal (tap a SUDS button if it does not open automatically). Flashlight records frame timeline data from Android Choreographer during the slide-in animation. Record the minimum sustained fps across the slide-in window. Repeat 3 times; use median.
    - [ ] 3a.2 If Flashlight is unavailable: record the screen at 60fps while the Modal slides in. Open the recording in VLC (`Tools → Frame by Frame`) or use `ffprobe -v quiet -show_frames` to count frames in the slide-in interval (~300ms window). Calculate fps from frame count ÷ interval.
    - [ ] 3a.3 If fps < 45 (P0): inspect `apps/mobile/app/session/active.tsx` — the Modal re-renders on each `setPendingSuds` call. Guard `setPendingSuds` with `useCallback`. If the Modal re-renders the entire `ActiveScreen`, extract the Modal to a separate component. Add `// PERF` comment.
    - [ ] 3a.4 Document Modal slide-in fps (3 runs, median) in `performance-budget.md`. If 45–55fps (P1): document explicit deferral sign-off in Completion Notes **and** `_bmad-output/implementation-artifacts/deferred-work.md`.

  - [ ] **3b — SUDS button tap-to-selection-highlight latency**
    - [ ] 3b.1 Record the screen at 60fps (device screen recorder). Tap a `SudsScale` button repeatedly (at least 5 taps across the 0–10 range). For each tap, count frames from the tap event frame to the frame where the button's selected visual state is visible. Latency = frame count × (1000ms ÷ fps). Record the median across 5 taps.
    - [ ] 3b.2 If tap-to-highlight > 100ms (P0): investigate whether `SudsScale` re-renders the parent `ActiveScreen` on every `onChange` call. In `apps/mobile/src/components/session/SudsScale.tsx`, guard the `onChange` prop with `useCallback` in the parent. Verify `SudsScale` itself does not cause parent re-renders via prop reference churn.
    - [ ] 3b.3 Document tap-to-highlight latency (median of 5 taps) in `performance-budget.md`. Add `// PERF` comment to any optimised component.

- [ ] **Task 4 — Calm Me button tap-to-mount latency (AC: 1, 4)**
  - [ ] 4.1 Measurement: from the home screen `(app)/index.tsx` (canonical reference screen for reproducibility), tap the Calm Me FAB. Measure from `onPress` in `CalmMeFab.handlePress` to the first `onLayout` or `useEffect` mount event firing in `apps/mobile/app/calm-me/index.tsx`. The navigation fade animation runs *after* mount — it is not part of the 200ms budget. Use Flashlight CLI against the release APK, or measure via 60fps screen recording with a frame-counter. Run 3 taps; use median. **Note:** `CalmMeFab.handlePress` guards on `navigatingRef.current` (double-tap prevention) and `isInSession` (session recovery state) — there is no auth check. These guards add negligible overhead.
  - [ ] 4.2 Key files: `apps/mobile/src/components/CalmMeFab.tsx` — the FAB calls `router.push('/calm-me')` via `handlePress` (guards: `navigatingRef.current`, `isInSession` — no auth check); `apps/mobile/app/calm-me/index.tsx` — the Calm Me shell (entry animation disabled per Task 4.3); `packages/ui/src/components/CalmMeButton.tsx` — the button itself (no animation on press per ADR — must never show loading state).
  - [x] 4.3 **First remediation (required regardless of latency result): remove the navigation entry animation from `calm-me/index.tsx`.** The `Stack.Screen options={{ animation: 'fade' }}` cross-fade takes ~300–350ms on target hardware (Mali-G31 GPU), exceeding the 200ms budget independently of routing overhead. Change to `animation: 'none'`. Add comment: `// PERF: animation disabled — UX-DR8 requires instant render; cross-fade (~300ms on Mali-G31) violates the 200ms tap-to-mount budget. UX sign-off: UX-DR8 + Story 9.7 spec review.` If latency still exceeds 200ms after removing the animation, check whether the calm-me route can be pre-loaded using `router.prefetch('/calm-me')` from `CalmMeFab` or the root layout. — **DONE: `animation: 'fade'` → `animation: 'none'` applied in `apps/mobile/app/calm-me/index.tsx` line 92–94. `// PERF` comment added above the Stack.Screen line.**
  - [ ] 4.4 Document final tap-to-mount latency measurement (3 taps, median) in `performance-budget.md`. Confirm `animation: 'none'` is in place in `calm-me/index.tsx`.

- [ ] **Task 5 — Validate and close (AC: 1–4)**
  - [x] 5.1 Run `pnpm turbo typecheck lint test` repo-wide; confirm all packages green. Any optimisation code change (memoisation, component extraction, lazy init, animation removal) must not introduce TypeScript errors or lint violations. — **DONE: 374 tests pass, 19 turbo tasks successful. No regressions.**
  - [ ] 5.2 Confirm `apps/mobile/docs/performance-budget.md` exists and contains: reference device profile; measurement methodology; a completed results table for all five metrics (1a TotalTime, 1b content-visible, 2a Modal fps, 2b tap-to-highlight, 3 Calm Me tap-to-mount) with both Profile A and Profile B columns for cold start; P0/P1 classification for any violation; resolution status for any P0; Known Limitations section covering Profile C (expired token). — **PARTIAL: file created with template/methodology, but results table rows are blank pending device measurement (Tasks 2, 3, 4).**
  - [x] 5.3 Grep for `// PERF` in `apps/mobile` — confirm every workaround or optimisation location has the comment. Also grep for `animation: 'none'` in `apps/mobile/app/calm-me/index.tsx` to confirm the fade removal is in place. — **DONE: `// PERF` comment present at `calm-me/index.tsx:92`; `animation: 'none'` confirmed at line 94.**
  - [ ] 5.4 If any P1 deferral was applied (SUDS Modal fps 45–55fps range), document the explicit deferral sign-off in this story's Completion Notes **and** in `_bmad-output/implementation-artifacts/deferred-work.md`. — **Pending: cannot assess until SUDS fps is measured in Task 3.**
  - [x] 5.5 Verify Story 9.6 regression guards are intact in any modified files: grep `apps/mobile/app/_layout.tsx` for `ErrorBoundary` export and `initErrorHandler()` call; grep all modified screen files for `isSubmittingRef`. If any of these are missing, restore before closing. — **DONE: `ErrorBoundary` exported at line 37, `initErrorHandler()` called at line 71. `isSubmittingRef` not expected in `calm-me/index.tsx` (not a form-submit flow). All guards intact.**
  - [ ] 5.6 Update `_bmad-output/implementation-artifacts/sprint-status.yaml`: set `9-7-performance-budget-low-end-device-validation: done` and update `last_updated`. — **Pending: blocked on measurement tasks.**

### Review Findings

- [x] [Review][Decision] Define "interactive" endpoint for cold-start budget — **RESOLVED (party-mode roundtable 2026-06-29): two sub-budgets adopted** — (1a) TotalTime ≤2s via `adb shell am start -W`; (1b) content-visible ≤3.5s via stopwatch on 60fps screen recording. Both are P0 blockers on Profile B. Applied to AC1, Task 2.2, Dev Notes table. [`apps/mobile/app/_layout.tsx`]
- [x] [Review][Decision] Specify auth state for cold-start measurement — **RESOLVED (party-mode roundtable 2026-06-29): two auth profiles** — Profile A (first-install, `pm clear`) as baseline; Profile B (returning user, valid token) as P0 gate. Profile C (expired token) excluded from P0 gating — network latency, not app code. Applied to AC3, Task 2.2. [`packages/supabase/src/auth/AuthProvider.tsx`]
- [x] [Review][Decision] Resolve build-type contradiction for fps measurement — **RESOLVED (party-mode roundtable 2026-06-29): release APK for all metrics** — Flashlight CLI required (not optional) for SUDS fps; instruments Android Choreographer at system level on release builds. Fallback: 60fps screen recording on release APK. Applied to AC3, Task 1.2, Task 3. [`apps/mobile/app/session/active.tsx`]
- [x] [Review][Decision] Redefine SUDS fps measurement target — **RESOLVED (party-mode roundtable 2026-06-29): both metrics** — (3a) fps during Modal `animationType="slide"` slide-in, measured via Flashlight on release APK, ≥55fps P0 / 45–55fps P1; (3b) tap-to-selection-highlight latency ≤100ms, P0. "Slider" terminology corrected; `SudsScale.tsx` is 11 discrete buttons, not a slider. Applied to AC1, Task 3. [`apps/mobile/src/components/session/SudsScale.tsx`, `apps/mobile/app/session/active.tsx`]
- [x] [Review][Decision] Define Calm Me 200ms measurement endpoint relative to navigation animation — **RESOLVED (party-mode roundtable 2026-06-29): remove `animation: 'fade'`** → `animation: 'none'` in `calm-me/index.tsx`; measure `onPress` → `onLayout`/mount event, ≤200ms. UX-DR8 is the sign-off authority ("instant render, no loading state"). Animation removal documented as UX-DR8 compliance fix, not performance workaround. Applied to AC1, Task 4, Dev Notes. [`apps/mobile/app/calm-me/index.tsx`]

- [x] [Review][Patch] Remove duplicate subtask 1.2 — applied: Task 1 rewritten; single 1.2 retained. [Story Tasks § Task 1]
- [x] [Review][Patch] Move fps P1 deferral clause from Task 2.5 to Task 3.5 — applied: Task 2.5 rewritten without fps cross-reference; Task 3a.4 carries the P1 deferral instruction. [Story Tasks § Task 2.5]
- [x] [Review][Patch] Add P1 column to Dev Notes performance budget table — applied: table rewritten with P1 zone column. [Story § Dev Notes performance budget table]
- [x] [Review][Patch] Correct CalmMeFab description in Task 4.2 — applied: "after an auth check" removed; guards described correctly as `navigatingRef.current` and `isInSession`. [`apps/mobile/src/components/CalmMeFab.tsx`]
- [x] [Review][Patch] Align AC4 with Task 5.4 on deferred-work.md update — applied: AC4 now includes `_bmad-output/implementation-artifacts/deferred-work.md` requirement. [Story § AC4]
- [x] [Review][Patch] Fix NFR reference for SUDS fps in Dev Notes table — applied: table note updated; NFR-PERF-02 flagged as write-latency (not fps), fps budget attributed to UX rendering quality guidance. [Story § Dev Notes performance budget table]
- [x] [Review][Patch] Add sprint-status.yaml update to Task 5 — applied: Task 5.6 added. [Story § Task 5]
- [x] [Review][Patch] Add Story 9.6 regression guard as an explicit Task 5 subtask — applied: Task 5.5 added with specific grep targets. [Story § Task 5]
- [x] [Review][Patch] Add independent checkbox for console.time marker removal in Task 2.3 — applied: subtask 2.3a added. [Story § Task 2.3]
- [x] [Review][Patch] Add auth token refresh to cold-start bottleneck suspects in Task 2.3 — applied: included in Task 2.3(b) for Profile C context. [`packages/supabase/src/auth/AuthProvider.tsx`]
- [x] [Review][Patch] Acknowledge calm-me fade animation in Task 4.3 latency guidance — applied: Task 4.3 rewritten to lead with animation removal as primary remediation. [`apps/mobile/app/calm-me/index.tsx`]

- [x] [Review][Defer] No CI integration for performance checks — all measurement is manual/local; no automated performance regression gate exists. Deliberate for MVP. — deferred, pre-existing
- [x] [Review][Defer] iOS performance is asserted sufficient, not measured — AC2 states iOS at this tier is expected to pass without requiring validation. Deliberate out-of-scope decision for MVP. — deferred, pre-existing
- [x] [Review][Defer] NFR-PERF-01 P90 vs 3-run-median methodology gap — the NFR specifies <3s at P90; the story measures 3 runs at median (~P50 on one device). Acknowledged in Dev Notes as an accepted MVP limitation. — deferred, pre-existing
- [x] [Review][Defer] Android emulator GPU cannot be throttled — the 2× CPU throttle does not affect GPU; modal animation fps measured in the emulator reflects host GPU performance, not Snapdragon 439 + Mali-G31. Physical device is preferred per spec; emulator is an acknowledged fallback. — deferred, pre-existing
- [x] [Review][Defer] `_dbByUserId` Map eviction — pre-existing deferred issue already tracked under Story 6.2-A in `deferred-work.md`. — deferred, pre-existing
- [x] [Review][Defer] Flipper support removed in React Native 0.74+ — Task 3.1 suggests Flipper as an fps option; if the project runs RN ≥0.74, this instruction is inoperative. Depends on project RN version; investigate before Task 3. — deferred, pre-existing
- [x] [Review][Defer] P1 sign-off authority is undefined — AC4 allows P1 deferrals "with explicit sign-off" but names no approver role or process. Process governance gap beyond this spec's scope. — deferred, pre-existing

## Dev Notes

### Reference device emulator setup

The target reference is Android 10+, 2GB RAM, Snapdragon 439-class CPU (Redmi 9A / Samsung Galaxy M02 tier). In the Android Studio AVD Manager:

1. Create a Pixel 4a or "Medium Phone" AVD with `Target: Android 10 (API 29)`, RAM: 2048 MB.
2. To apply 2× CPU throttle: in the emulator toolbar → Extended controls → Settings → Throttling → select "2×" (or launch with `emulator @AVD_NAME -prop persist.cpu.throttle=2`). The 2× throttle is a CI-friendly approximation for mid-range devices — physical device is preferred if available.
3. A EAS `preview` build is required (`expo-dev-client` cannot measure cold start accurately due to extra dev overhead). If a preview APK from the most recent successful EAS build is available, use it directly.

### Performance budget rationale

| Metric | Budget | NFR reference | P0 threshold | P1 zone | Build type |
|---|---|---|---|---|---|
| Cold start — TotalTime (Profile B) | ≤2s | NFR-PERF-01 (<3s P90) | >2s | — | Release APK |
| Cold start — content-visible (Profile B) | ≤3.5s | NFR-PERF-01 (user-perceivable) | >3.5s | — | Release APK |
| SUDS Modal slide-in fps | ≥55fps | UX (rendering quality; NFR-PERF-02 is write-latency, not fps) | <45fps | 45–55fps | Release APK + Flashlight |
| SUDS tap-to-selection-highlight | ≤100ms | UX (JS thread responsiveness) | >100ms | — | Release APK, 60fps recording |
| Calm Me tap-to-mount | ≤200ms | UX-DR8 (instant render, no loading state) | >200ms | — | Release APK |

Note: NFR-PERF-01 specifies <3 seconds at P90. Story 9.7 adopts the stricter ≤2s TotalTime budget plus a ≤3.5s content-visible budget to give Story 9.9 (India launch) headroom. The two cold-start sub-budgets together satisfy the NFR-PERF-01 user-perceivable intent. Cold start is measured on Profile B (returning user, valid token) for P0 gating; Profile A (first-install, `pm clear`) is documented as baseline reference.

### Cold start bottleneck suspects

The MMKV startup sequence per ARC-004: key derivation → MMKV sync reads → PowerSync init → route decision. All four stages are sequential in `apps/mobile/app/_layout.tsx`. The PowerSync database open (`getPowerSyncDatabase()` in `packages/sync/src/client.ts`) is the most likely cold-start bottleneck — it opens a native SQLite file via `@journeyapps/react-native-quick-sqlite`. On warm restarts the `_dbByUserId` Map returns the existing handle (fast); on cold start with no prior db, the file is created.

Known deferred issue (from Story 6.2-A code review): the `_dbByUserId` Map in `packages/sync/src/client.ts` never evicts entries — open `PowerSyncDatabase` handles accumulate on shared devices over time. This is not a cold-start concern (Map lookup is O(1)) but may contribute to memory pressure on 2GB RAM devices over long sessions. Do NOT fix the eviction issue in this story — it is already tracked in `deferred-work.md` under Story 6.2-A.

### SUDS performance: Modal animation and button response

`apps/mobile/app/session/active.tsx` does not currently render a visible session timer or countdown (N/A for the current implementation). `SudsScale.tsx` renders 11 discrete `TouchableOpacity` buttons in a `flexWrap` row — there is no pan gesture or drag; the original "SUDS slider" framing was a misnomer. Two separate performance concerns exist:

**Modal slide-in fps:** `active.tsx` uses `<Modal animationType="slide">` for both SUDS entry (around `setPendingSuds`) and session completion. The slide-in is the GPU-intensive event — compositing two full-screen layers on Mali-G31 at 2× CPU throttle is the actual fps risk. Measured via Flashlight CLI on release APK; if fps drops, first optimisation is `useCallback` on `setPendingSuds` to prevent re-render of the Modal content on each parent render cycle; second is extracting the Modal to a separate component to isolate its render tree.

**Tap-to-highlight latency:** Each button tap triggers `onChange` → parent state update → `SudsScale` re-render with new `value` prop. If this cycle takes >100ms (P0), the JS thread is under pressure. Guard: `useCallback` on the `onChange` prop in the parent component that wraps `SudsScale`.

### Calm Me button architecture

`CalmMeFab` (`apps/mobile/src/components/CalmMeFab.tsx`) calls `router.push('/calm-me')` via `handlePress`. Guards: `navigatingRef.current` (double-tap prevention) and `isInSession` (session recovery state check). There is no auth check — the original spec description was incorrect. Per UX-DR8 and the CalmMeButton ADR, the Calm Me button must never show a loading state.

**Navigation animation:** `calm-me/index.tsx` originally used `options={{ animation: 'fade' }}` on its Stack.Screen. The cross-fade takes ~300–350ms on Mali-G31, which exceeds the 200ms tap-to-mount budget independently of any routing overhead. Task 4.3 removes this animation (`animation: 'none'`). This is a UX-DR8 compliance fix, not a performance workaround — the "instant render" requirement is incompatible with a visible entry transition. A future story may revisit a ≤100ms transition if user research supports it.

**Measurement endpoint:** The 200ms budget is from `onPress` in `CalmMeFab.handlePress` to the first `onLayout`/`useEffect` mount event firing in `calm-me/index.tsx`. This is deterministic and unaffected by post-mount animation. `@rn-primitives/portal` is already installed and used in `apps/mobile` — the CalmMeFab uses zIndex positioning above the Stack (not a portal), so portal overhead is not relevant here.

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

Claude Sonnet 4.6 (claude-sonnet-4-6) — story context generated by create-story workflow; dev-story implementation run: 2026-06-29.

### Debug Log References

- Task 1.2: `@perf-tools/flashlight` → npm 404. `@bamlab/flashlight` → npm 404. Package appears deprecated/removed from registry.
- Task 1.3: `adb version` → not found. Android SDK not installed on this machine (macOS dev environment without Android toolchain).
- Task 4.3: `animation: 'fade'` → `animation: 'none'` applied. Tests pass (374/374). `// PERF` comment added per spec.
- Task 5.1: `pnpm turbo typecheck lint test` → 19 tasks successful, 374 tests pass, 0 failures.
- Task 5.3: `grep -rn "// PERF" apps/mobile/` → found at `calm-me/index.tsx:92`. `animation: 'none'` confirmed at line 94.
- Task 5.5: `ErrorBoundary` export at `_layout.tsx:37`; `initErrorHandler()` at line 71. Regression guards intact.

### Completion Notes List

**Completed tasks (2026-06-29):**
- Task 1.1: Created `apps/mobile/docs/performance-budget.md` — includes reference device profile, emulator fallback, all 5 budget targets, measurement procedure, blank results table (to be filled after device measurement), findings section, tooling availability, known limitations.
- Task 1.2: Attempted Flashlight install — both `@perf-tools/flashlight` and `@bamlab/flashlight` returned npm 404. Documented in `performance-budget.md §Tooling Availability`. Fallback: 60fps screen recording + frame-count via VLC/ffprobe.
- Task 1.3: `adb` not installed on this machine. Android SDK not present. Documented in `performance-budget.md §Tooling Availability`. Tasks 2, 3, 4 require a machine with Android SDK + device/emulator.
- Task 4.3: Required animation removal applied — `animation: 'fade'` → `animation: 'none'` in `apps/mobile/app/calm-me/index.tsx`. `// PERF` comment added per spec. This is a UX-DR8 compliance fix.
- Task 5.1: `pnpm turbo typecheck lint test` → green (374 tests, 19 turbo tasks).
- Task 5.3: `// PERF` grep → confirmed at `calm-me/index.tsx:92`; `animation: 'none'` at line 94.
- Task 5.5: Story 9.6 regression guards verified intact.

**HALT — pending device measurement:**
Tasks 2 (cold start), 3 (SUDS Modal fps + tap latency), 4.1/4.2/4.4 (Calm Me tap-to-mount measurement), 5.2 (results table completion), 5.4 (P1 deferral assessment), 5.6 (sprint-status done) cannot proceed without `adb` + Android device/emulator + release APK. See `performance-budget.md §Measurement Procedure` for step-by-step instructions.

### File List

- `apps/mobile/docs/performance-budget.md` — NEW: performance budget document with reference profile, methodology, blank results table, tooling availability section
- `apps/mobile/app/calm-me/index.tsx` — MODIFIED: `animation: 'fade'` → `animation: 'none'` (Task 4.3, UX-DR8 compliance); `// PERF` comment added

## Change Log

| Date | Change |
|---|---|
| 2026-06-29 | Story 9.7 created via create-story workflow. Pre-audit analysis confirmed: `active.tsx` has no visible session timer (N/A noted in Task 3.2); `CalmMeFab` uses `router.push('/calm-me')` with no loading state; `_dbByUserId` Map eviction is a known deferred issue (6.2-A) not addressed in this story; Achievements tab budget line struck through per 2026-06-21 deferral of Story 8.5. Reference device profile: Android 10+, 2GB RAM, Snapdragon 439-equivalent (emulator with 2× CPU throttle as fallback). |
| 2026-06-29 | dev-story run: Task 1.1 (performance-budget.md created), Task 1.2 (Flashlight unavailable — documented), Task 1.3 (adb not installed — documented), Task 4.3 (`animation: 'none'` applied in `calm-me/index.tsx`), Task 5.1 (typecheck/lint/test green), Task 5.3 (PERF grep verified), Task 5.5 (9.6 regression guards verified). HALT: Tasks 2, 3, 4.1/4.2/4.4 blocked on device tooling. |
