# Story 9.2: Offline Session Recovery Integration Tests

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer verifying the offline-first session loop,
I want integration tests that prove session writes are preserved and recoverable when the network drops mid-session,
so that the offline degradation guarantees documented in ADR-OFFLINE-DEGRADATION are machine-verified, not just asserted (NFR-OFFLINE-01, NFR-REL-02).

## Acceptance Criteria

1. **Given** Story 9.1 is complete and ADR-OFFLINE-DEGRADATION is accepted **When** this story is implemented **Then** integration tests cover all three offline failure scenarios: (1) network drops during active exposure — `adapter.enqueue()` calls succeed locally; session state remains `active`/`started` (see Dev Notes "Vocabulary: two session-state representations" — the DB enum and the in-memory state machine use different words for the same state); the outbox queue count increments; (2) app is backgrounded mid-session and re-foregrounded — session state is recovered; the correct home screen state is restored; no data is lost; (3) app is killed mid-session and re-launched — session state is recovered on cold start; the session state machine re-enters the correct state on hydration. [Source: epics.md#Story 9.2] **Correction:** the epic AC cites `packages/core/src/session/SessionStateMachine.ts` — this file does not exist. The real file is `packages/core/src/erp/session-state-machine.ts` (kebab-case, per this repo's naming convention — see Dev Notes "Where the SessionStateMachine actually lives").

2. **Given** the integration test harness **When** offline scenarios are simulated **Then** network connectivity is mocked at the PowerSync adapter layer — not via OS-level airplane mode (flaky in CI); the mock is a test-only artifact (not new production/source code shipped in `apps/mobile`'s bundle) — see Dev Notes "What 'contained to packages/core or test utilities' actually means here" for where each scenario's mock and test file should live, since the epic's literal wording does not match this repo's actual module boundaries. [Source: epics.md#Story 9.2]

3. **Given** all three offline scenario tests pass **When** the CI pipeline runs **Then** the test suite is gated in CI alongside existing unit tests; failures in offline recovery tests block merge to `main`. **Correction:** there is currently no CI job that runs `pnpm turbo test` at all (see Dev Notes "No test gate exists in CI today" — `.github/workflows/ci.yml` has gates for boundaries/build/typecheck/lint but never invokes the `test` task). This story must add one. [Source: epics.md#Story 9.2; .github/workflows/ci.yml]

4. **Given** the `SessionStateMachine` states in `packages/core/src/erp/session-state-machine.ts` (corrected path — see AC1) **When** this story is implemented **Then** if the offline recovery scenarios require a new state or transition, it is added to `session-state-machine.ts` and covered by tests in the existing `session-state-machine.test.ts` file before the integration tests reference it; no integration test depends on a `SessionStateMachine` state that does not yet exist. **Note:** the current module is a pure, stateless `transition(currentState, event)` function with no concept of "hydrating" a state from persisted data (DB row / MMKV blob) — that hydration/derivation logic does not exist yet and is very likely required for scenario 3 (see Dev Notes "No hydration function exists today"). [Source: epics.md#Story 9.2; packages/core/src/erp/session-state-machine.ts]

## Tasks / Subtasks

- [ ] **Task 1 — Re-verify Story 9.1 assumptions before building tests (AC: 1)**
  - [ ] 1.1 Story 9.1's Dev Notes explicitly flag this: re-check `supabase/sync-rules.yaml`'s `users`/`user_onboarding_metadata` bucket fix and confirm it doesn't change what data is actually available in the local PowerSync replica during the offline scenarios below. [Source: 9-1-powersync-schema-sync-and-offline-degradation-adr.md § "Out of scope"]
  - [ ] 1.2 Confirm `ADR-OFFLINE-DEGRADATION.md` is still `Accepted` (Decisions 1/3/4) before treating it as ground truth for test assertions — it was finalized 2026-06-22 in Story 9.1, immediately prior to this story.

- [ ] **Task 2 — Add session-state hydration support (AC: 1, 4)**
  - [ ] 2.1 Add a pure function to `packages/core/src/erp/session-state-machine.ts` that derives a `SessionState` from persisted data (e.g. `deriveStateFromSession(dbStatus: 'started'|'completed'|'abandoned', hasActiveGrounding: boolean): SessionState` or equivalent — exact signature is an implementation decision, but it must be a pure function with no I/O). **Decision (party-mode review, 2026-06-22):** this function is required, not conditional — Dev Notes already establishes that `transition()` has no hydration concept and scenario 3 cannot be tested without it. Treat this as settled; do not re-litigate "is it needed" at implementation time. Structurally separate it from `transition()` within the file (own exported section, with a comment noting it derives initial state from persisted data and is never invoked from `transition()` itself) — it's a projection/reconciliation function, not part of the transition graph. If its signature grows past two scalar params in a future story, that's the trigger to split it into a co-located `session-hydration.ts`.
  - [ ] 2.2 Add tests for the new function to `packages/core/src/erp/session-state-machine.test.ts` (co-located, per existing convention) BEFORE any integration test references it — this is AC4's literal requirement, not optional sequencing.
  - [ ] 2.3 ~~If no new state/transition is actually needed, document why~~ — superseded by 2.1's decision. If, while implementing, hydration turns out to map cleanly onto existing states with no new enum member required, that's fine (the function itself is still required) — just note in Completion Notes that no new `SessionState` value was needed.

- [ ] **Task 3 — Resolve the `getPendingCount()` stub gap (AC: 1)**
  - [ ] 3.1 `PowerSyncSyncAdapter.getPendingCount()` (`packages/sync/src/adapter.ts:78`) is currently `async getPendingCount(): Promise<number> { return 0 }` — a hardcoded stub, never wired to PowerSync's actual local outbox (`ps_crud` table). It is not called anywhere in `apps/mobile` today. Scenario 1's AC literally requires "queue count increments" to be observable.
  - [ ] 3.2 **Decision (party-mode review, 2026-06-22): option (b).** Test queue-increment behaviour against the mock adapter's call count (`mockDb.execute` invocation count, following the existing `adapter.test.ts` pattern). Do not implement a real `getPendingCount()` against `ps_crud` in this story — pinning down the exact PowerSync 1.34.0 outbox query shape is its own piece of work with its own risk, and AC1 only requires the *test* to demonstrate an increment, not that `getPendingCount()` itself becomes functional. Explicitly document in Completion Notes that `getPendingCount()` remains a non-functional stub, tracked separately, out of scope here. Do not write a test that silently asserts against the always-0 stub as if it were meaningful — that is a vacuous test, not a verified guarantee.
  - [ ] 3.3 Because of 3.2's decision, AC1's "outbox queue count increments" is verified via a call-count proxy on the mock, not via a real outbox count — update any assertion language/comments in the Scenario 1 test to say so explicitly, so a future reader doesn't mistake the proxy assertion for proof that `getPendingCount()` works.

- [ ] **Task 4 — Scenario 1: network drop during active exposure (AC: 1, 2)**
  - [ ] 4.1 Add test(s) to `packages/sync/__tests__/integration/offline-recovery.test.ts` (new file; `packages/sync/vitest.config.ts` already includes `__tests__/**/*.test.ts` at the top level, so this location is picked up without config changes). Reuse the `makeMockDb()` mock pattern from `packages/sync/__tests__/adapter.test.ts` to simulate offline by having `mockDb.execute` resolve normally (no thrown network error — per ADR Decision 1, `enqueue()` always succeeds against local SQLite regardless of network state; the adapter has no network awareness at all, network state is irrelevant to its own success/failure).
  - [ ] 4.2 Assert: `adapter.enqueue()` resolves without throwing for an `exposure_sessions` row during an active session; whatever queue-count mechanism Task 3 settled on shows an increment; the in-memory `SessionState` (via `transition()`) stays `active` across the enqueue call (the adapter and the state machine are independent — calling `enqueue()` must not itself transition state; confirm this is actually true by reading both modules, don't assume).

- [ ] **Task 5 — Scenario 2: backgrounded mid-session, re-foregrounded (AC: 1, 2)**
  - [ ] 5.1 Read Dev Notes "Backgrounding vs. process kill — these may be the same code path" before writing this test — in this architecture, AppState background→foreground without OS process death requires no recovery code at all (JS memory is untouched). The clinically-relevant case is backgrounding on the NFR-DEVICE-01 reference profile (2GB RAM, Snapdragon 439 tier — see Story 9.7), where Android frequently kills backgrounded apps, making this scenario mechanically identical to Scenario 3.
  - [ ] 5.2 Test both sub-cases explicitly so the distinction is documented, not assumed: (a) process survives backgrounding — assert no state is lost without any recovery code path executing (trivial, but document why it's trivial rather than skipping it); (b) process is killed while backgrounded — this collapses into Scenario 3's recovery mechanism (Task 6); do not duplicate Scenario 3's test, just assert this case is covered by it.
  - [ ] 5.3 For sub-case (a), exercise `resolveHomeScreenState()` (`packages/core/src/erp/home-screen-state.ts`) with `activeThread.exists: true` and confirm it returns `'progressing'` — this is the "correct home screen state is restored" assertion from the AC.

- [ ] **Task 6 — Scenario 3: app killed mid-session, re-launched (AC: 1, 2, 4)**
  - [ ] 6.1 Place this test in `packages/core/src/__tests__/integration/offline-recovery.test.ts` (NOT `packages/core/__tests__/integration/` — see Dev Notes "vitest include glob only covers `src/**`" for why the architecture doc's stated path silently produces a test file that never runs).
  - [ ] 6.2 Per `ADR-OFFLINE-DEGRADATION.md` Decision 3, the real recovery mechanism is two layers working together, not two separate mechanisms per scenario: (1) MMKV `SESSION_IN_PROGRESS` read (fast, synchronous, available before PowerSync hydrates) and (2) the PowerSync local-replica query (`useActiveExposureSession`, authoritative once hydrated). Test both layers using mock patterns already established in this repo: a mock MMKV object matching `packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts`'s `makeMockMmkv()` shape for the MMKV layer, and a mocked query result shape (matching `useActiveExposureSession.test.ts`'s `BASE_ROW`) for the PowerSync-replica layer.
  - [ ] 6.3 Assert: a corrupt/unparseable MMKV `SESSION_IN_PROGRESS` value is handled by clear-and-ignore (existing `AuthProvider.tsx:199-202` behaviour) — write this assertion against the parsing logic as a pure function, not by rendering `AuthProvider`; if no such pure function currently exists, extract one (mirrors the `hasSessionIntention`/`getSessionIntention` extraction pattern already used in `authProvider.sessionIntention.test.ts` — don't render the full `AuthProvider` component for this, no existing test in the repo does that).
  - [ ] 6.4 Assert: given a valid `SessionRecoveryData` blob, the derived `SessionState` (Task 2's hydration function) and `resolveHomeScreenState()` output are consistent with the recovered session data.

- [ ] **Task 7 — CI gating (AC: 3)**
  - [ ] 7.0 **Decision (party-mode review, 2026-06-22): pre-check before any other task starts.** This job will, for the first time, make every existing Vitest/Jest suite in the repo merge-blocking — that is the single highest-blast-radius change in this story, not a footnote to "add a job." Before starting Task 1, run `pnpm turbo test` cold against `main` as it stands today and confirm it is green. If it is not green, this story also owns triaging what's broken (fix or explicitly quarantine with a tracked follow-up) before Task 7.1 lands — do not let a pre-existing red suite become an accidental, unreviewed merge-blocker the first time someone else's unrelated PR trips it.
  - [ ] 7.1 `.github/workflows/ci.yml` has no job running `pnpm turbo test` today (only `build`, `typecheck`, `lint`, plus the 8 boundary/drift gates). Add a new `test` job, matching the existing `typecheck`/`lint` job pattern: `needs: [build]`, `pnpm install --frozen-lockfile`, `run: pnpm turbo test`.
  - [ ] 7.2 Confirm this single new job covers ALL existing Vitest/Jest suites repo-wide (it does — `pnpm turbo test` fans out to every package via `turbo.json`'s `test` task), not just this story's new tests — this is a pre-existing CI gap this story is closing as a side effect, not scope creep specific to offline tests. Call this out explicitly in the PR description (not just Completion Notes) so reviewers evaluate it as a repo-wide policy change, not as an incidental detail of an offline-recovery test PR.

### Out of Scope

- Do not build new user-visible error/retry UI for the silent enqueue-failure call sites (`assessment.tsx:handleNext`, `grounding.tsx:52-56`) — `ADR-OFFLINE-DEGRADATION.md` Decision 2 explicitly defers this; this story is test-only.
- Do not implement the 2G-throttle network condition test — that is explicitly Story 9.9's scope, which "extends the offline integration tests from Story 9.2." [Source: epics.md#Story 9.9]
- Do not touch `supabase/sync-rules.yaml` or `packages/sync/src/schema.ts` unless Task 1.1's re-verification finds an actual discrepancy — this story consumes Story 9.1's output, it doesn't re-open it.

## Dev Notes

### Where the SessionStateMachine actually lives

The epic text cites `packages/core/src/session/SessionStateMachine.ts`. The real file is `packages/core/src/erp/session-state-machine.ts` (kebab-case filename, per this repo's "Non-component files: kebab-case" naming rule), exporting `transition()`, `SessionState`, and `SessionEvent`. It is a pure, stateless function: `transition(currentState: SessionState, event: SessionEvent): Result<SessionState>`. States: `idle | pre_session | active | grounding | completed | abandoned`. [Source: packages/core/src/erp/session-state-machine.ts]

### No hydration function exists today

`transition()` has no concept of reading an existing state from persisted data — it only advances a known current state on a known event. Scenario 3's AC ("re-enters the correct state on hydration") has no implementation to test yet. Task 2 requires adding this. Decide the function's exact inputs based on what's actually available at cold-start time: `exposure_sessions.status` (DB enum: `started | completed | abandoned`) from the PowerSync local replica, plus whatever in-app context (e.g. was grounding active) is recoverable from MMKV's `SessionRecoveryData`.

### Vocabulary: two session-state representations

The DB column `exposure_sessions.status` uses `started | completed | abandoned`. The in-memory `SessionState` (session-state-machine.ts) uses `idle | pre_session | active | grounding | completed | abandoned`. `'started'` (DB) and `'active'` (in-memory) refer to the same real-world state but are different strings. When AC1 scenario 1 says "session state remains `active`," check which representation the test is actually asserting against and don't conflate the two without an explicit mapping.

### "Contained to packages/core or test utilities" — what this actually means here

The epic AC's literal wording doesn't map onto this repo's module boundaries: `packages/core` has **zero** dependencies (not even `@powersync/react-native` — its `package.json` lists none), so it cannot host a mock of the real `SyncAdapter`/`PowerSyncSyncAdapter` (those live in `packages/sync`, which does depend on `@powersync/react-native`). Read this AC as: *don't add new offline-simulation mock code as production source under `apps/mobile/src`* (which would ship in the app bundle) — test-only files in any package's test directory are fine. Concretely:
- Scenario 1 (adapter-level): `packages/sync/__tests__/integration/` — reuses the existing `makeMockDb()` mock pattern from `adapter.test.ts`.
- Scenarios 2/3 (session-recovery logic): `packages/core/src/__tests__/integration/` — pure-function tests using mock MMKV/query-result shapes, following the extraction pattern in `packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts` (test pure logic functions, not the rendered `AuthProvider` component — no existing test in this repo renders `AuthProvider` directly).

### vitest include glob only covers `src/**` for packages/core

`packages/core/vitest.config.ts` has `include: ['src/**/*.test.ts']` — there is no top-level `__tests__/**` glob (unlike `packages/sync/vitest.config.ts`, which explicitly includes both `src/**` and `__tests__/**`). The architecture doc (`implementation-patterns-consistency-rules.md`) states the integration-test convention as `packages/core/__tests__/integration/` — **a test placed there will not run** under the current config; `pnpm --filter core test` / `pnpm turbo test` will silently skip it. The repo's actual working convention is `packages/core/src/__tests__/<topic>/*.test.ts` (see `src/__tests__/crisis/`, `src/__tests__/selectors/` — both already exist and are picked up). Use `packages/core/src/__tests__/integration/offline-recovery.test.ts`, not the architecture doc's literal path. [Source: packages/core/vitest.config.ts; packages/sync/vitest.config.ts; packages/core/src/__tests__/crisis/keywordDetector.test.ts]

### Backgrounding vs. process kill — these may be the same code path

React Native JS context survives normal AppState backgrounding — there is no unmount/remount, so in-memory session state is untouched by default. Process death (common on the 2GB RAM reference device under memory pressure — see Story 9.7's device profile) is what actually triggers the cold-start MMKV+PowerSync recovery flow in `AuthProvider.tsx`. The epic's Scenario 2 ("backgrounded, re-foregrounded") and Scenario 3 ("killed, re-launched") may therefore exercise the *same* recovery code path on the reference device, while the trivial in-memory-survives case needs no recovery code at all. Test both sub-cases of Scenario 2 explicitly (Task 5.2) rather than assuming they're distinct mechanisms — they aren't, per `ADR-OFFLINE-DEGRADATION.md` Decision 3's two-layer description.

### No test gate exists in CI today

`.github/workflows/ci.yml` jobs: `core-boundary-gate`, `dark-mode-gate`, `web-import-gate`, `sdk-dep-audit`, `supabase-import-gate`, `actual-suds-rename-gate`, `verify-schema-drift`, `verify-sync-bucket-coverage`, `build`, `typecheck`, `lint`. None of these run `pnpm turbo test`. The root `package.json` and `turbo.json` both already define a working `test` task (`turbo test` → fans out to every package's Vitest/Jest suite) — it's just never invoked in CI. Task 7 adds this as a new job. This closes a pre-existing repo-wide gap (all packages' existing tests are currently unenforced in CI), not a narrow addition for this story's tests alone.

### Existing mock/test patterns to reuse (do not reinvent)

- `packages/sync/__tests__/adapter.test.ts` → `makeMockDb()`: `{ execute: vi.fn(), writeTransaction: vi.fn(...) }` — the established way to mock PowerSync's `AbstractPowerSyncDatabase` at the adapter boundary.
- `packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts` → `makeMockMmkv()`: in-memory `Map`-backed MMKV stand-in (`getString`/`set`/`delete`/`has`). Same file demonstrates the pattern of extracting AuthProvider-adjacent logic into standalone pure functions for testing, rather than rendering the component.
- `apps/mobile/src/hooks/useActiveExposureSession.test.ts` → `jest.mock('@exposure-buddy/sync', () => ({ useQuery: ... }))` — the established way to mock the PowerSync `useQuery` hook in Jest/RNTL tests, if any apps/mobile-level test turns out to be needed (prefer the packages/core pure-function approach per Task 6.3 first).

### Relevant ADR-OFFLINE-DEGRADATION decisions (already Accepted, Story 9.1)

- **Decision 1** (queued vs rejected writes): all 5 synced tables go through `enqueue()` → local SQLite → outbox; no client-side rejection path ever. Network state doesn't affect `enqueue()`'s own success — this is why Scenario 1's mock doesn't need to simulate a network error at all, just confirm the call succeeds and the queue grows.
- **Decision 3** (cold-start recovery): two layers — MMKV `SESSION_IN_PROGRESS` (fast, sync, drives routing) + `useActiveExposureSession` PowerSync-replica query (authoritative once hydrated). Both are confirmed live code, not dead code.
- **Decision 2** (silent enqueue failures): accepted MVP state, deferred remediation, out of scope for this story (see "Out of Scope" above).

[Source: _bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md]

## Project Structure Notes

- New test files: `packages/sync/__tests__/integration/offline-recovery.test.ts` (Scenario 1), `packages/core/src/__tests__/integration/offline-recovery.test.ts` (Scenarios 2/3) — **not** `packages/core/__tests__/integration/` as the architecture doc states (see Dev Notes "vitest include glob").
- Possible source changes: `packages/core/src/erp/session-state-machine.ts` (+ co-located `.test.ts`) for hydration support; `packages/sync/src/adapter.ts` only if Task 3.2 chooses to fix `getPendingCount()`.
- CI change: new `test` job in `.github/workflows/ci.yml`, following the `typecheck`/`lint` job template (`needs: [build]`).
- No `apps/mobile` source changes are expected for this story unless Task 6.3's extraction reveals AuthProvider parsing logic that genuinely cannot be tested without it — avoid this path if possible, per the established pure-function-extraction precedent.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.2] — full AC text
- [Source: packages/core/src/erp/session-state-machine.ts, session-state-machine.test.ts] — actual SessionStateMachine location/shape
- [Source: packages/sync/src/adapter.ts] — `PowerSyncSyncAdapter`, `getPendingCount()` stub (line 78), `makeMockDb` precedent in `__tests__/adapter.test.ts`
- [Source: packages/supabase/src/auth/AuthProvider.tsx:199,202,291,299] — MMKV `SESSION_IN_PROGRESS` read/write/delete call sites
- [Source: packages/core/src/constants/kvKeys.ts, packages/core/src/types/session-recovery-data.ts] — `KV_KEYS.SESSION_IN_PROGRESS`, `SessionRecoveryData` shape
- [Source: apps/mobile/src/hooks/useActiveExposureSession.ts, .test.ts] — PowerSync-replica session query + Jest mock pattern
- [Source: packages/core/src/erp/home-screen-state.ts] — `resolveHomeScreenState`, `'progressing'` state
- [Source: packages/core/vitest.config.ts, packages/sync/vitest.config.ts] — test include globs (core: `src/**` only; sync: `src/**` + `__tests__/**`)
- [Source: .github/workflows/ci.yml] — no existing `test` job; job template to follow (`typecheck`/`lint`)
- [Source: turbo.json, package.json] — `test` task already defined, just never invoked in CI
- [Source: _bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md] — Decisions 1, 2, 3 (Accepted, Story 9.1)
- [Source: _bmad-output/implementation-artifacts/9-1-powersync-schema-sync-and-offline-degradation-adr.md § "Out of scope"] — explicit flag for whoever picks up 9.2 re: re-verifying sync-rules assumptions
- [Source: _bmad-output/planning-artifacts/prd.md] — NFR-OFFLINE-01 (l.458), NFR-OFFLINE-02 (l.459), NFR-OFFLINE-03 (l.460), NFR-REL-02 (l.465)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md l.45-50,66] — test co-location conventions (architecture doc's integration-test path is stale for packages/core — see Dev Notes)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.9] — confirms 2G-throttle testing is 9.9's scope, extending (not duplicating) this story's tests

## Testing Requirements

- All new tests run under Vitest: `pnpm --filter @exposure-buddy/sync test` (Scenario 1) and `pnpm --filter @exposure-buddy/core test` (Scenarios 2/3, plus the new hydration-function unit tests in `session-state-machine.test.ts`).
- Re-run `packages/sync/__tests__/adapter.test.ts` and `packages/sync/__tests__/connector.test.ts` to confirm no regressions if `adapter.ts` is touched (Task 3.2 option a).
- No OS-level airplane-mode or Maestro/E2E testing in this story — that's explicitly Story 9.5's domain (network stays connected in Maestro flows per that story's AC) and Story 9.9's 2G-throttle extension.
- After Task 7, run `pnpm turbo test` from repo root and confirm all packages pass (this is the first time this command runs as a CI-equivalent local check across the whole repo for this story — treat any pre-existing failure surfaced as a blocker to investigate, not silently ignore, since it would also block the new CI gate).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-06-22 | Story 9.2 created via create-story workflow. |
| 2026-06-22 | Party-mode review (Amelia, Winston, John): pinned 3 implementer-discretion decisions before dev — Task 2 hydration function is required (not conditional); Task 3.2 resolved to option (b) (mock call-count proxy, real `getPendingCount()` stays a tracked stub); Task 7 gets a pre-check (`pnpm turbo test` must be green on `main` before work starts) given it's the first repo-wide CI test gate. |
