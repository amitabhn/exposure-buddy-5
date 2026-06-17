# Deferred Work

## Deferred from: code review of 6-2-a-powersync-foundation implementation (2026-06-16)

_Post-implementation review (Blind Hunter + Acceptance Auditor). Original findings: `6-2-a-powersync-foundation.md` → "Code Review — Post-Implementation (2026-06-16)"._

- **`_dbByUserId` Map never evicts entries — open `PowerSyncDatabase` handles accumulate on shared devices.** On a device signed into N distinct accounts over its lifetime, N open PowerSyncDatabase instances remain in memory. Relevant for shared-phone India use case. Epic 9 cleanup; evaluate close+evict on `disconnectAndClear`. [`packages/sync/src/client.ts`]
- **`PowerSyncConnectionManager` useEffect has no cleanup return — DB connection not closed if root layout unmounts.** Hot reload and error-boundary resets trigger unmount. Low-risk in prod but can cause orphaned connections in dev. [`apps/mobile/app/_layout.tsx`]
- **No test coverage for `SupabasePowerSyncConnector`.** `fetchCredentials`, `uploadData`, and `_uploadEntry` (PUT/PATCH/DELETE branches, ON_CONFLICT_OVERRIDES) are entirely untested. Not required by Story 6.2-A T9; add in a future hardening pass. [`packages/sync/src/connector.ts`]
- **Migration 0022 pre-cleanup UPDATE is not atomic with CREATE UNIQUE INDEX.** A concurrent INSERT arriving between the two statements can cause the index to fail to create on a live DB. Mitigation: `CREATE UNIQUE INDEX CONCURRENTLY` or app-side write-lock. Already in deferred-work from spec review (AC 9 item); re-confirmed by implementation review. [`supabase/migrations/0022_exposure_sessions_active_thread.sql`]

---

## Deferred from: code review of 6-2-a-powersync-foundation (2026-06-16)

_Multi-layer spec review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — items below are real concerns not addressed by Story 6.2-A but classed as out-of-scope or system-wide rather than blockers for this story. Original findings live in the Review Findings section of `6-2-a-powersync-foundation.md`._

- **Module-scope `getPowerSyncDatabase()` throw produces white-screen — no error boundary.** If native SQLite open fails (corrupt db, missing migration, unsupported device), the app crashes before any React render. App-lifecycle topic, not 6.2-A specific. [`apps/mobile/app/_layout.tsx`]
- **AC 5 schema-bump local reset risk audit beyond `user_onboarding_metadata`.** The spec asserts this is the only at-risk table; no runtime check verifies `ps_crud` is empty for other tables at upgrade time. Add a one-shot pre-upgrade audit log in a follow-up. [`packages/sync/src/schema.ts`]
- **AC 9 `CREATE UNIQUE INDEX uq_active_thread` not `CONCURRENTLY` — racing with concurrent INSERTs during deploy can fail.** Production-deployment concern; mitigation is `CREATE UNIQUE INDEX CONCURRENTLY` or an app-side write-lock at deploy time. [`supabase/migrations/0022_exposure_sessions_active_thread.sql`]
- **AC 7 `_userId` parameter is dead while local SQLite is multi-tenant on the same device.** Sync-rules-based isolation only works when connected; offline + user switch leaks. Decision-needed item in the spec proposes mitigations; this defer covers the residual "minor cases" if the team chooses the lightest option. [`apps/mobile/src/hooks/useFearLadderItems.ts`]
- **AC 4 `OR IGNORE` for client-generated UUID PKs has negligible collision probability but no test of the duplicate-id path.** Add a property-based test in a future hardening pass. [`packages/sync/src/adapter.ts`]
- **Fast Refresh re-running module scope in dev causes `initAdapter` double-init.** Make `initAdapter` idempotent (warn-and-replace or no-op) in a follow-up. Low impact: dev-only. [`packages/sync/src/adapter.ts`]
- **Service-role test cleanup leakage on failed test runs.** When test process is killed mid-run, `exposure_sessions` rows attached to the test user leak. System-wide pattern (already present in `dpo_audit_log.test.ts`), not 6.2-A specific. [`packages/supabase/__tests__/rls/`]
- **`predicted_suds` is nullable in PowerSync schema but `NOT NULL` in DB.** Verify at implementation time; add app-level validation if PowerSync ever produces a null row. [`packages/sync/src/schema.ts`]
- **Optimistic INSERT in `ladder.tsx` not rolled back on `enqueue` throw.** `setItems` fires before `getAdapter().enqueue()` resolves. If enqueue throws (e.g. DB not yet init, constraint violation), the item stays in local UI state as a phantom until the next PowerSync sync overwrites. Surfacing errors to UI is Out-of-Scope #13; fix in a future UX hardening pass. [`apps/mobile/app/ladder.tsx`]
- **`handleDragEnd` only enqueues two positions; intermediate items' positions lost on multi-item drag.** `DraggableFlatList` reassigns all N positions on drag; only the dragged item and the item at the drop target are written via `_reorder`. Items shifted in between keep their old Supabase positions until the next full ladder reload from sync. Pre-existing design (spec models 2-item swap); Story 6.2-C `swap_ladder_positions` RPC addresses atomicity. [`apps/mobile/app/ladder.tsx`]
- **`uq_active_thread` partial index has NULL gap for `fear_item_id IS NULL`.** When a ladder item is deleted (`ON DELETE SET NULL` from migration 0016), multiple `status='started'` sessions with `fear_item_id IS NULL` can coexist — `NULL != NULL` in SQL bypasses the uniqueness guarantee. FR-HOME-03 is unenforceable for orphaned sessions. Only activates once ladder-item deletion is implemented (Story 6.2-C). [`supabase/migrations/0022_exposure_sessions_active_thread.sql`]
- **`_urlValidationWarned` module-level flag suppresses repeated invalid-URL warnings after first log.** On shared devices, if User A's connector fires the warning, User B's new connector instance inherits the silenced flag. P2 observability gap only; `return null` still fires correctly. [`packages/sync/src/connector.ts`]

- **`createPowerSyncDatabase()` test escape hatch creates test/prod semantic divergence.** Whatever bug only manifests on the shared singleton (state leak, schema reset race) is invisible to the test suite. Consider replacing with explicit `__resetForTests__` on the singleton. [`packages/sync/src/client.ts`]
- **Two-PATCH non-atomic reorder retry consistency.** Listed as Out-of-Scope item #8 in the spec — full atomic fix is the `swap_ladder_positions` Postgres RPC in Story 6.2-C. Until then, partial failure during reorder upload can leave server in inconsistent state until next reorder. [Story 6.2-C]
- **AC 8 references `intent.tsx:107–115` and `ladder.tsx:149` by line number.** Coordinates drift the moment anyone edits these files. Use code-region quotes or function names in future stories.
- **AC 1 "useQuery and usePowerSync work in all screens" is untestable as written.** No screen enumeration, no smoke list. Narrow to explicit screens in future ACs.
- **AC 6 lint claim "zero ARC-005 violations" is narrow.** Verify `packages/sync/.eslintrc` (or root config matching `packages/sync/**`) does not forbid the new `@powersync/react-native` re-exports. The boundary owner package needs its own lint allowance.
- **AC 3 PATCH retry has no idempotency key.** Last-write-wins is the system-wide pattern; documenting here so the next reviewer doesn't re-flag.
- **`AbstractPowerSyncDatabase.writeTransaction` existence not asserted in spec.** Verify at impl against installed `@powersync/common@1.53.1` type declarations.
- **Multi-instance connector recreation on user switch may leak prior `SupabaseClient` auth listeners and realtime channels.** AC 2 mandates a fresh `SupabasePowerSyncConnector(createSupabaseClient())` per `userId` change. Whether this leaks depends on whether `createSupabaseClient()` returns a fresh client or the module singleton. Verify at impl. [`apps/mobile/app/_layout.tsx`, `packages/supabase/src/client.ts`]

---

## 2026-06-15 — Stories 5.4 and 5.5 formally deferred post-Phase-1

- **FR-LADDER-03 — Clinician read access deferred post-Phase-1.** Stories 5.4 (clinician access schema & RLS policies) and 5.5 (clinician access pgTAP coverage) are marked `deferred-post-mvp` in `sprint-status.yaml`; `epic-5` is now closed. Full decision record at `epics.md` FR Coverage Map (FR-LADDER-03) and `prd.md` ("Therapist portal → Phase 2"). The `therapist_patient_relationships` stub table (Story 4.3) and ARC-006/007 stub RLS policies remain in place; Phase 2 activates the real policies via migration with no schema rebuild.

---

## 2026-06-15 — Story 5.6 / Issue #36 — Home states 7/8 removed

- **FR-NOTIF-04 — Window-close push notification deferred post-MVP.** Rationale: Story 5.6 / Issue #36 removed the home screen post-exposure reflection window (State 7) and the late-debrief gate (State 8). The window-close notification semantically depends on a 6-hour reflection window that the UI no longer presents — the notification copy ("the window is still available") loses its referent. Reflection capture happens entirely on the debrief screen (FR-ERP-03) before the user reaches home. Original Story 8.3 in `epics.md` is marked DEFERRED. PRD `FR-NOTIF-04` line in `epics.md` line 66 is struck through with the deferral note; FR Coverage Map line 195 carries the full decision record.

- **State 8 (`expired`) orphaned and removed.** Rationale: State 8 was a soft gate that re-offered the debrief screen indefinitely after the 6-hour window expired. It collected zero new reflection input — it was a pure routing affordance. With State 7 removed, State 8 had no upstream trigger, and its existence depended on the same `expires_at` referent that no longer surfaces in the UI.

- **`exposure_sessions.expires_at` server trigger kept inert.** Rationale: Migrations `0016_exposure_sessions.sql` (column), `0018_set_session_expires_at_trigger.sql` (AFTER UPDATE trigger setting `expires_at = now() + 6h` on `status = 'completed'`), and `0019_session_insert_guard.sql` (forces `expires_at := NULL` on INSERT) are not modified by this story. The trigger continues to run on session completion and the column continues to be populated — but no UI consumer reads it. Dropping the trigger/column is a follow-up migration not bundled here (broader blast radius, separate Story 9.x candidate).

- **`window_notified_at` column never landed.** Story 8.3 (which would have added this column on `exposure_sessions`) is deferred — no migration is required for this story.

### Backlog stubs filed 2026-06-15

- **BACKLOG-EPIC6-D1: Soft recency acknowledgement on State 3.** Sally's design suggestion from the 2026-06-13 party-mode review: when a user lands on State 3 shortly after submitting a debrief, render a slim, dismissible recency note ("Earlier today — you faced <fearItem>. Nice work.") above the `CourageLadderEntryCard`. Passive, no CTA, no countdown. Requires: new copy keys (EN+HI), a short-lived `lastCompletedSessionAt` data source (MMKV or PowerSync `exposure_sessions.completed_at`), a justified recency threshold, and new tests. Out of scope of Story 5.6 — filed as Epic 6 candidate.

- **BACKLOG-EPIC9-D1: Option B — auto-route to debrief on next launch when `SESSION_DEBRIEF_PENDING` is non-empty.** Crash-recovery affordance for users who completed the active phase but lost the debrief screen (force-quit, OS-kill — relevant on low-memory Android devices in the India launch market). On AuthProvider hydration with a non-empty `SESSION_DEBRIEF_PENDING(userId)` blob and `reflectionSubmitted: false`, navigate to `/session/debrief` once on launch. Whether the user submits or backs out, clear the key. Story 5.6 explicitly chose Option A (silent wipe — accept risk) over this option to keep scope tight.

- **BACKLOG-CLINICIAN-D1: Explicit clinician acknowledgement of overriding the original 6-hour pacing rationale.** Story 5.6 proceeded without explicit clinician sign-off on removing the 6h post-exposure window. The original design had clinician input on the pacing rationale (containment / nervous-system regulation framing). Engineering/PM decided the rationale is intentionally set aside — the debrief screen now absorbs the entire reflection job — but no clinician has signed off in writing. Capture clinician disposition before any future feature reintroduces a pacing gate.

---

## Deferred from: code review of 5-6-remove-home-states-7-and-8 (2026-06-15)

- **`authProvider.optionAWipe.test.ts` tests an inline replica, not the real `onAuthStateChange` listener.** The test defines a local `optionAWipe` helper and calls it directly — it does not mount `AuthProvider`, fire a `SIGNED_IN` event, or exercise the surrounding `if (store)` / `mmkvReadyRef` guards. Follows the pre-existing inline-MMKV-stand-in pattern used by the prior `authProvider.debrief.test.ts`; a true integration test would require mounting the provider with a Supabase mock. Accepted for now. [`packages/supabase/__tests__/auth/authProvider.optionAWipe.test.ts`]

- **Option A boot wipe fires on every `SIGNED_IN`/`TOKEN_REFRESHED` auth event with no userId-change guard.** `onAuthStateChange` in `AuthProvider.tsx` does not track the previous userId to skip token-refresh re-runs; both the `SESSION_IN_PROGRESS` read and the `SESSION_DEBRIEF_PENDING` delete fire on every session-present event. After the first run the wipe is a safe no-op (key absent). Pre-existing architecture gap — not introduced by Story 5.6. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **Combined `SESSION_IN_PROGRESS` + stale `SESSION_DEBRIEF_PENDING` boot state is not covered by any test.** When both MMKV keys are present on boot (force-quit mid-session on a pre-Story-5.6 build), the Option A wipe and the `SESSION_IN_PROGRESS` recovery run in sequence. No test seeds both keys and verifies both outcomes. Pre-existing gap — not in scope of Story 5.6. [`packages/supabase/__tests__/auth/`]

- **`clearSessionIntention(sessionId)` has no guard against `undefined` sessionId.** Expo Router `useLocalSearchParams` returns `string | string[]`; the generic cast to `string` is a compile-time convenience, not a runtime guarantee. If `sessionId` is absent from the deep link, `clearSessionIntention(undefined)` silently targets the wrong MMKV key (`session:intention:undefined`) and leaves the real key stale. Pre-existing from Story 5.3. [`apps/mobile/app/session/debrief.tsx:108`]

---

## Deferred from: verification of 5-3-erp-session-completion-debrief-and-home-state (2026-06-08)

- **VER-5-3-1: `isCompletingSession` survives Fast Refresh on the success path** — In `apps/mobile/app/session/active.tsx`, `handleCompleteSession` only resets `setIsCompletingSession(false)` in the `!result.ok` early-return and the `catch` block. On the success path the screen `router.push`es to debrief and the active screen unmounts in production, so the stuck flag is invisible. During dev, Fast Refresh preserves component state across edits — a subsequent fresh session lands on `active.tsx` with `isCompletingSession=true` from the previous attempt, and the "Finish session" button renders gray and ignores taps. Workaround: full reload (Cmd+R). Production behaviour is correct; consider adding a `useEffect` cleanup or resetting the flag immediately after the navigation `router.push` for dev ergonomics. [`apps/mobile/app/session/active.tsx:77-83, 153`]

- **VER-5-3-2: `session/_layout.tsx` leaves swipe-back enabled on `debrief`; "Done is the only exit" is implicit** — `pause`, `active`, and `grounding` explicitly set `gestureEnabled: false`; `debrief` inherits the default (enabled). A user can swipe back from debrief without committing reflection; the state-7/8 entry on home preserves `SESSION_DEBRIEF_PENDING` so the flow still works correctly on return. The behaviour is benign but undocumented — neither the spec nor a code comment mentions that the gestural exit is intentional. Add either a `gestureEnabled: false` on debrief (if Done should be the only exit) or a comment on `session/_layout.tsx` explaining why debrief is allowed to be gesturally dismissed. [`apps/mobile/app/session/_layout.tsx`]

## Deferred from: backlog review (2026-06-07)

- **OB-D1: Onboarding screen should not mandate entry of challenges** — The current onboarding ladder setup requires users to enter fear ladder items before proceeding. This is a UX friction point; users should be able to skip challenge entry during onboarding and add items later from the main Courage Ladder screen. Requires UX design update for the skip flow and a change to the onboarding progress gate logic. [`apps/mobile/app/(onboarding)/ladder.tsx`]

## Deferred from: code review of 5-3-erp-session-completion-debrief-and-home-state (2026-06-07)

- **CR-5-3-1: `hasLetter` in `DebriefPendingData` can diverge from live MMKV state** — Home screen uses the stored `hasLetter` field to choose state-7 CTA text; `debrief.tsx` re-reads live MMKV via `getSessionIntention()`. If `SESSION_INTENTION` is cleared between session completion and home render (e.g., prior debrief), home shows "Read your letter" CTA but debrief opens to Branch B/C. Two sources of truth; resolve in Epic 6 when PowerSync makes the session's intent queryable. [`apps/mobile/app/(app)/index.tsx`, `apps/mobile/app/session/debrief.tsx`]

- **CR-5-3-2: State machine transition failure shows no user feedback** — When `transition('active', { type: 'session.completed', ... })` returns `!result.ok`, `isCompletingSession` is reset and the function returns silently. The "Finish session" button re-enables, but the user receives no error message. Acceptable for MVP (button re-enables, trigger condition is effectively unreachable in normal operation). [`apps/mobile/app/session/active.tsx:83`]

- **CR-5-3-3: Debrief screen Branch tests do not assert opposite branch content is absent** — `debrief.test.tsx` Branch B and C tests verify the expected acknowledgement text is present but do not assert that the other branch's content is absent. A regression where multiple branches render simultaneously would pass undetected. Scope: Epic 9 test quality audit. [`apps/mobile/app/session/debrief.test.tsx`]

- **CR-5-3-4: `authProvider.debrief.test.ts` tests inline reimplementations of MMKV helpers** — The Vitest test file tests locally-defined copies of `setDebriefPending`, `updateDebriefReflectionSubmitted`, etc. rather than the actual `AuthProvider` functions. Divergence between the test copy and the production implementation would be invisible. Architectural limitation of testing hooks/closures without a full React context harness; address in Epic 9 test infrastructure work. [`packages/supabase/__tests__/auth/authProvider.debrief.test.ts`]

## Deferred from: post-MVP navigation review (2026-06-04)

- **NAV-D1: Ladder as a dedicated bottom tab** — The current UX design specifies the Ladder screen as reachable from the `CourageLadderEntryCard` on the Home screen (FR-LADDER-01: "screen reachable from the home screen entry card"), not as a bottom tab. The tab bar is intentionally Home + Settings only at MVP. If a Ladder tab is added post-MVP, it requires a UX design update (tab bar structure, icon, active/inactive states) and a PRD change before implementation. [`apps/mobile/app/(app)/_layout.tsx`, `_bmad-output/planning-artifacts/epics.md:FR-LADDER-01`]

## Deferred from: code review of 5-2-erp-session-start-and-suds-entry — Group D: Mobile App (2026-06-06)

- **5-2-W15: Abandonment MMKV cleanup and navigation execute unconditionally outside try/catch in `grounding.tsx`** — `clearSessionInProgress()`, `clearSessionIntention()`, and `router.push('/session/abandoned')` run regardless of whether the two enqueue calls succeeded or failed. Intentional MVP design: the user chose to stop, so cleanup must always happen; the no-op stub never throws. Broader offline/enqueue-failure recovery covered by 5-2-D2. [`apps/mobile/app/session/grounding.tsx:52-56`]

- **5-2-W16: `SudsScale` buttons use `accessibilityRole="button"` instead of the more semantically correct `"radio"` for mutually exclusive selection** — ARIA's `radiogroup`/`radio` pattern would better express that only one value can be selected at a time. Not required by the current spec; defer to Story 9.3 accessibility audit. [`apps/mobile/src/components/session/SudsScale.tsx:32-34`]

## Deferred from: code review of 5-2-erp-session-start-and-suds-entry — Group C: Supabase Package (2026-06-05)

- **5-2-W11: `fromExposureSession` test asserts only 5 of 11 fields** — The individual `fromExposureSession` test in `exposure-session.mapper.test.ts` checks only `id`, `user_id`, `fear_item_id`, `session_type`, `status`; the remaining 6 fields (`pre_session_intention`, `post_session_reflection`, `started_at`, `ended_at`, `expires_at`, `created_at`) are only covered transitively by the round-trip test. Minor coverage gap; the `round-trip is lossless` test fully compensates via `toEqual`. [`packages/supabase/__tests__/mappers/exposure-session.mapper.test.ts`]

- **5-2-W12: `SESSION_INTENTION` MMKV keys never cleared on sign-out** — AuthProvider sign-out branch clears `sessionRecoveryData` and the `SESSION_IN_PROGRESS` blob, but `SESSION_INTENTION(sessionId)` is never deleted because the sessionId is unknown at sign-out time. Intention text persists across sign-outs and for future users on shared devices. Same root cause as W9; address together in Epic 9 Story 9.4 MMKV key hygiene audit. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **5-2-W13: `setSessionInProgress`/`clearSessionInProgress` silently no-op when called pre-auth** — If a screen calls `setSessionInProgress` before `authState.userId` is populated (e.g., auth hydration race on cold-start), the function returns without writing to MMKV and `sessionRecoveryData` stays null. Pre-existing pattern shared with all other MMKV helpers in AuthProvider; callers are gated on `isAuthenticated` at call sites, making this unreachable in normal operation. [`packages/supabase/src/auth/AuthProvider.tsx:352-368`]

- **5-2-W14: `ExposureSessionRow` hand-rolled rather than aliasing generated `Database` type** — `exposure-session.mapper.ts` defines its own `ExposureSessionRow` interface instead of using `Database['public']['Tables']['exposure_sessions']['Row']` from `database.types.ts` (which is legitimately importable within `packages/supabase`). The hand-rolled type will silently drift from the generated type on future schema changes. The concrete divergence (started_at nullability) is fixed by P2. Resolve in a future mapper refactor pass. [`packages/supabase/src/mappers/exposure-session.mapper.ts`]

## Deferred from: code review of 5-2-erp-session-start-and-suds-entry — Group B: Core Domain (2026-06-05)

- **5-2-W9: `SESSION_INTENTION` MMKV key orphaned on unexpected SESSION_IN_PROGRESS clear** — `KV_KEYS.SESSION_INTENTION(sessionId)` is only clearable if the `sessionId` is known; the only place it's stored is in the `SESSION_IN_PROGRESS` blob. If that blob is corrupted or cleared outside the normal abandonment/completion path (e.g. OS storage pressure, sign-out without active session cleanup), the intention text persists in MMKV indefinitely with no expiry mechanism. Address in Epic 9 Story 9.4 MMKV key hygiene audit. [`packages/core/src/constants/kvKeys.ts`]

- **5-2-W10: State machine error codes don't distinguish "wrong state for valid event" from "truly unknown event"** — `TRANSITIONS[state]?.[event.type]` returns `undefined` for both a valid event sent to the wrong state and an event type unknown to the machine. Both produce `INVALID_TRANSITION`. TypeScript prevents unknown events at compile time, so this is a runtime debugging ergonomics concern only. Defer to a future diagnostic improvement story if observability tooling requires finer-grained error codes. [`packages/core/src/erp/session-state-machine.ts`]

## Deferred from: code review of 5-2-erp-session-start-and-suds-entry — Group A: DB & Sync (2026-06-05)

- **5-2-W8: Fat-finger SUDS correction UX (in-session undo)** — `suds_readings` are now append-only (immutable RLS). The correction path is INSERT a new reading (single-entry submit already supports this). A future story should add an explicit in-session undo affordance: e.g. a "Undo last entry" action within the active session screen that INSERTs a corrective reading with the revised value and a note. No DELETE or UPDATE at the DB level. [`apps/mobile/app/session/active.tsx`]


- **5-2-W5: Plaintext sync of `pre_session_intention`/`post_session_reflection` to all devices** — Both free-text fields containing personal anxiety content are included in `sync-rules.yaml` SELECT with no encryption or exclusion. In a multi-device scenario, content lands in on-device SQLite on every authenticated device. DPDPA 2023 sensitivity classification and any field-level encryption decisions deferred to Epic 6 sync hardening story. [`supabase/sync-rules.yaml`]

- **5-2-W6: `fear_item_id ON DELETE SET NULL` silently orphans `peak_suds` update** — If a `fear_ladder_items` row is deleted (currently only possible via service-role), associated `exposure_sessions.fear_item_id` becomes NULL. Story 5.2+ logic that writes `peak_suds` back to the fear item on session completion will silently skip the update with no error signal. Epic 6 connector must guard against null `fearItemId` before writing `peak_suds`. [`supabase/migrations/0016_exposure_sessions.sql`]

## Deferred from: code review of 6-1-technique-selection-and-pre-exposure-briefing (2026-06-15)

- **6-1-D1: `technique` param not forwarded from `intent.tsx` to `briefing.tsx`** — By design: the DB row already holds the selected technique; `briefing.tsx` does not display nor pass it forward. If a future story needs `briefing.tsx` to show the selected technique (e.g., "You chose Somatic — here's what that means"), thread `technique` as a URL param from `intent.tsx` → `briefing.tsx` → (drop at active.tsx). No code change required now.

- **6-1-D2: `setLastUsedTechnique` MMKV write precedes the `exposure_sessions` INSERT** — Technique is written to MMKV in `technique.tsx` before `intent.tsx` enqueues the session INSERT. If the user aborts at `intent.tsx`, the MMKV key holds the technique from a session that never completed; on re-entry to `technique.tsx`, the same technique is pre-selected. This is intentional last-used preference behaviour (consistent with other MMKV preference keys) and is benign — the user can change their selection. No change required.

- **6-1-D3: No back affordance from `briefing.tsx`** — Intentional UX decision: `briefing.tsx` is forward-only (`gestureEnabled: false`, `headerShown: false`, no `BackButton`). Session row was already created in `intent.tsx`; the recovery modal in `(app)/_layout.tsx` handles killed-app re-entry directly to `active.tsx`. If a future story decides users should be able to abort from `briefing`, add a "Cancel session" affordance that calls `clearSessionInProgress` and pops to home.

- **6-1-D4: `pause.tsx` remains accessible via direct deep-link after deprecation** — `pause.tsx` keeps its `_layout.tsx` registration and is not deleted in this story. A cached or bookmarked deep-link to `/session/pause?...` will still work and route to `active.tsx` as before. Fully intentional — cleanup deferred until all clients upgrade past the old flow. Delete `pause.tsx` and its `_layout.tsx` entry in a future housekeeping story.

- **6-1-D5: `briefing.tsx` unprotected against direct deep-link bypass (no auth guard, no session-existence check)** — A direct deep-link to `/session/briefing?sessionId=X&...` bypasses `intent.tsx` entirely; the caller can reach `active.tsx` with a `sessionId` for which no `exposure_sessions` row exists. Pre-existing architectural pattern shared by all session flow screens — none validate session row existence before proceeding. Address in a global session-guard story (Epic 9 candidate).

- **6-1-D6: `accessibilityRole="radio"` / `accessibilityState` on technique cards has no unit test coverage** — AC 3 requires proper ARIA radio semantics on each card; AC 8 specifies no test case verifying these attributes. Unit tests (Jest + RNTL) can assert on `accessibilityRole` but this codebase does not currently do so for any component. Defer to Story 9.3 accessibility audit.

- **6-1-D7: `DmSerifSurface: 'pre-exposure-readback'` comment in `briefing.tsx` enforced by convention only** — The four permitted DM Serif Display Italic surfaces (UX-DR21) are advisory; there is no runtime type guard or lint rule preventing addition of the font to non-permitted surfaces. Convention is enforced at code review. A future story could add an ESLint no-restricted-syntax rule or a type-level `DmSerifSurface` literal union to make this machine-enforceable.

## Deferred from: code review of 6-1-technique-selection-and-pre-exposure-briefing — post-implementation (2026-06-15)

- **6-1-CR-D1: Android hardware back button not suppressed in `briefing.tsx`** — `gestureEnabled: false` (set in `session/_layout.tsx`) disables iOS swipe-back and the Android edge-swipe gesture but does NOT suppress the Android system back button. A user who presses the hardware/software back button after `intent.tsx` has already written the `exposure_sessions` INSERT (status: `started`) returns to `intent.tsx`. Re-submitting the form triggers a DB primary-key conflict on the same `sessionId` UUID. Extends story D3 (intentional forward-only design for swipe gestures); the Android back button surface was not addressed. Fix: add a `useFocusEffect` + `BackHandler.addEventListener('hardwareBackPress', () => true)` in `briefing.tsx` to intercept and suppress the Android back event. Epic 9 candidate or addressable in a housekeeping pass. [`apps/mobile/app/session/briefing.tsx`]

- **6-1-CR-D2: `getLastUsedTechnique` returns null during auth-state loading race on cold launch** — The `useState` lazy initialiser in `technique.tsx` runs once on mount. If `authState.userId` is still null at that point (MMKV session bootstrap is async; `isLoading` may still be `true`), `getLastUsedTechnique` returns null and the preference is never loaded — the pre-selection is permanently missed for that mount without any `useEffect` re-read. Pre-existing pattern shared with `getSessionIntention` and all other MMKV helpers in `AuthProvider.tsx` (none re-read after auth resolves). Addressing this requires a `useEffect` that re-reads on `userId` change, or a loading-gate upstream that delays screen render until auth is settled. [`packages/supabase/src/auth/AuthProvider.tsx:313`, `apps/mobile/app/session/technique.tsx:23`]

- **6-1-CR-D3: `preSuds` forwarded unguarded through `briefing.tsx` to `active.tsx`** — If `briefing.tsx` is reached via a direct deep-link that omits `preSuds`, the value is `undefined`; `handleReady` forwards it as `preSuds=undefined` in the URL. `active.tsx` uses `parseInt(preSuds ?? '0')`, silently defaulting to `0` and initialising `maxSudsLogged` at zero — producing incorrect peak SUDS tracking for the session. Pre-existing pattern: no screen in the session flow validates param presence before forwarding. `SessionRecoveryData` MMKV blob holds `preSuds` but is not consulted as a fallback here. Epic 9 candidate. [`apps/mobile/app/session/briefing.tsx:22`]

- **5-2-W7: Trigger re-stamps `expires_at` if a completed session is reset and re-completed** — The guard `OLD.status IS DISTINCT FROM 'completed'` (once P4 is applied) prevents re-stamp on idempotent updates, but if a service-role operation resets `status` to `'started'` and then back to `'completed'`, the trigger fires again and overwrites `expires_at`. Application layer never performs this sequence; no action needed at the app level. [`supabase/migrations/0018_set_session_expires_at_trigger.sql`]

## Deferred from: spec review of 5-2-erp-session-start-and-suds-entry (2026-06-04)

- **5-2-D1: userId null race in recovery modal End CTA** — Auth expiry race between the recovery modal's initial display and the user tapping End could leave SESSION_IN_PROGRESS under the wrong MMKV key (`session:in_progress:null`). Requires deeper auth lifecycle hardening out of scope for this story. [AC7 / (app)/_layout.tsx]

- **5-2-D2: active→grounding crash gap — ended_at never set on intermediate crash** — If the app crashes between the Stop Exposure navigation push to grounding and the abandonment enqueue executing in grounding.tsx, the exposure_sessions row is left with `status: 'started'` and null `ended_at`. Fixing requires persisting ended_at at the navigation boundary (e.g., writing it to MMKV before navigating). Epic 6 retry/recovery obligation. [AC11, AC13]

- **5-2-D3: Analytics events (session.started, session.abandoned) not specified** — Architecture event schema requires `domain.verb` events; no session lifecycle analytics are emitted in this story. Add to Epic 6 or a dedicated analytics story. [Architecture §Analytics event schema]

- **5-2-D4: sudsReadingsCount initial value ambiguity vs pre-session reading guard** — Depends on D3 (useState vs useReducer decision) and Story 5.3 COMPLETE_SESSION guard design. If count starts at 0, the pre-session reading (enqueued in intent.tsx) is not counted toward the guard, blocking completion until at least one in-session log. Revisit when implementing active.tsx and Story 5.3. [AC6, AC11]

## Deferred from: code review of 5-1-full-courage-ladder-screen (2026-06-04)

- **5-1-D1: No rollback on optimistic add/edit when enqueue fails** — `setItems(optimistic)` fires before `await enqueue(...)`; the `catch` only logs; `closeForm()` is unconditional. With the no-op stub this is invisible, but when Epic 6 wires a real adapter, failed enqueues leave ghost items (add path) or stale edits (edit path) in the UI with no user feedback and no way to retry. Rollback logic (`setItems(prev)`) should be added to both catch blocks when the real adapter is wired. [`apps/mobile/app/ladder.tsx:84–127`]

- **5-1-D2: Inconsistent `reorder_positions` enqueue convention between screens** — The onboarding ladder (`apps/mobile/app/(onboarding)/ladder.tsx`) enqueues position swaps as `operation: 'UPDATE'` with a `{ type: 'reorder_positions', ... }` payload. The new ladder screen (`apps/mobile/app/ladder.tsx`) uses `operation: 'reorder_positions'` directly (as per Story 5.1 spec). Epic 6's outbox connector must handle both conventions, or one path will be silently dropped. Reconcile the envelope format before implementing the connector. [`apps/mobile/app/ladder.tsx:138` vs `apps/mobile/app/(onboarding)/ladder.tsx`]

- **5-1-D3: Accessibility focus timing race for non-empty list state** — The 100 ms `setTimeout` for `AccessibilityInfo.setAccessibilityFocus` fires before `DraggableFlatList` has laid out and attached `firstInteractiveRef` to the first item row when items exist. Currently `useFearLadderItems` returns `[]` (stub), so the Add button always gets focused. When Epic 6 replaces the stub with live data, focus will land on the wrong element. Add a ref-callback or a longer/adaptive delay before Epic 6. [`apps/mobile/app/ladder.tsx:38–52`]

- **5-1-D4: Position number duplication risk when Epic 6 wires real data** — `position: items.length + 1` is computed from the optimistic local state snapshot at submit time. If the sync effect (`useEffect` on `remoteItems`) runs between two adds and resets `items` from the stub (empty), the next add reuses position `1`, creating duplicate position integers in the outbox. Assign positions server-side or use a stable monotonic counter when the real connector is implemented. [`apps/mobile/app/ladder.tsx:103`]

- **5-1-D5: Non-integer SUDS value from database not validated in edit path** — `item.predictedSuds` is typed as `number` with no integer constraint. A decimal value arriving from a future database migration or sync conflict (e.g., `7.5`) would be displayed in the TextInput and re-enqueued as `predicted_suds: 7.5` without rounding or rejection. Add `Math.round()` or integer validation in `openEditForm` when the real data path is wired. [`apps/mobile/app/ladder.tsx:246–249`]

- **5-1-D6: Swipe-to-delete not implemented** — The PR test plan specified swipe-to-delete as a flow but no swipe gesture handler exists in `renderItem`; only long-press (drag) and tap (edit) are wired. Items cannot be deleted via the UI. Implement a delete affordance — either a swipe-left gesture via `react-native-gesture-handler` Swipeable, or a Delete button inside the existing edit modal — before Epic 6 wires real data, so users can correct mistakes without requiring a database-side cleanup. [`apps/mobile/app/ladder.tsx:188–213`]

## Deferred from: code review of 4-4-onboarding-completion-and-home-screen-entry (2026-06-03)

- **4-4-D1: `markOnboardingComplete()` ordering vs Expo Router concurrent render** — The spec assumes calling `markOnboardingComplete()` before `router.replace('/(app)/index')` guarantees `isOnboardingComplete = true` before `(app)/_layout.tsx` mounts, relying on React 18 event-handler batching. Expo Router navigation triggers a new render cycle; whether this batching holds across the router boundary is an architectural assumption shared by all onboarding stories. Monitor if users report unexpected onboarding re-entry post-completion. [`packages/supabase/src/auth/AuthProvider.tsx`, `apps/mobile/app/(app)/_layout.tsx`]

- **4-4-D2: Degraded-mode `markOnboardingComplete()` no-op saved by undocumented `isStorageDegraded` escape hatch** — In degraded mode, `markOnboardingComplete()` returns without flipping `isOnboardingComplete`. Navigation still proceeds. `(app)/_layout.tsx` guard includes `!isStorageDegraded`, which prevents a redirect loop. The spec never documents this escape hatch. Pre-existing pattern; document in a future architectural clarity pass. [`packages/supabase/src/auth/AuthProvider.tsx`, `apps/mobile/app/(app)/_layout.tsx`]

- **4-4-D3: `FearLadderItem.status` permitted values unspecified** — `status: string` is a deliberate stub. Epic 6 will define real schema values and the selector's `status === 'pending'` filter must be validated against that schema. [`packages/core/src/selectors/fearLadder.ts`]

- **4-4-D4: `FIRST_HOME_VISIT_SEEN` MMKV key not cleared on account deletion** — User-scoped MMKV keys (like all onboarding keys) persist across sign-out. If the same userId re-registers, `firstHomeVisitSeen` would be stale `true`, skipping the "ready to start" greeting. Address in the MMKV key hygiene audit (Epic 9, Story 9-4). [`packages/core/src/constants/kvKeys.ts`]

- **4-4-CR-D1: `resolveLowestPendingItem` sort has no tiebreaker for equal `position` values** — No secondary sort key (e.g. `id` or `created_at`) defined; sort order is engine-dependent if two items share the same position integer. Moot while the function is called with `[]` in Story 4.4; Epic 6 defines real schema and should add a tiebreaker. [`packages/core/src/selectors/fearLadder.ts`]

- **4-4-CR-D2: Auth listener MMKV reads deferred to `TOKEN_REFRESHED` if `SIGNED_IN` fires before MMKV ready** — Pre-existing auth pattern: if `mmkvReadyRef.current = false` when the initial `SIGNED_IN` event fires, the listener returns early and `isLoading` stays `true`, blocking premature renders. The MMKV read (including new `firstHomeVisitSeen` + `crisisFlaggedInOnboarding` reads) happens on the next event where `lastOnboardingReadUserIdRef.current` is still `null`. Recovery path works; window is covered by loading state. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **4-4-CR-D3: `calm-me` `Stack.Screen` registration orphaned if file moves** — Root `_layout.tsx` registers `<Stack.Screen name="calm-me">`. If `calm-me.tsx` is moved to `(app)/` or `(onboarding)/` when Epic 7 fills the stub, the root registration becomes orphaned and `router.push('/calm-me')` from `HomeScreen` would silently fail. Structural note; no current bug. [`apps/mobile/app/_layout.tsx`]

- **4-4-CR-D4: `CourageLadderEntryCard` SUDS label lacks range clamping** — `"Anxiety: X/10"` renders `predictedSuds` raw without bounds check. If PowerSync data ever carries values outside 0–10 (e.g. due to a sync conflict or migration error), the label misleads. Add clamping or a fallback in the Epic 6 data validation story. [`packages/ui/src/components/CourageLadderEntryCard.tsx`]

## Deferred from: code review of 4-3-initial-fear-ladder-setup (2026-06-02)

- **4-3-W1: UUID uses `Math.random()`** — Client-generated UUIDs for `fear_ladder_items.id` use a non-cryptographic PRNG (same pattern as `assessment.tsx`). Low collision risk at MVP scale; server-side `gen_random_uuid()` is the authoritative PK once synced. Address in an Epic 9 security-hardening pass if client-generated IDs are retained. [`apps/mobile/app/(onboarding)/ladder.tsx:22`]

- **4-3-W2: `handleNext` sets progress step before navigation completes** — `setOnboardingProgressStep(4)` is called before `router.replace` resolves; if navigation is cancelled or crashes, MMKV progress is permanently at 4 and the user skips the ladder on next launch. Pre-existing pattern from Story 4.2; Epic 6 durable outbox should address progress-state atomicity. [`apps/mobile/app/(onboarding)/ladder.tsx:109`]

- **4-3-W3: `userId` null mid-flight between auth guard and enqueue** — Session expiry between the `if (!userId) return` guard and `getAdapter().enqueue(...)` means the item is queued with a valid-looking userId that no longer has an active session; RLS rejects the INSERT silently at sync time while local state shows the item. General session management concern; address when the real outbox adapter is wired in Epic 6. [`apps/mobile/app/(onboarding)/ladder.tsx:49`]

- **4-3-W4: No `accessibilityHint` on description TextInput** — The fear-item description field has `accessibilityLabel` but no `accessibilityHint` explaining that the input may surface support resources. Given the mental-health sensitivity of this field, a hint improves clarity for screen reader users. Add in a future accessibility polish pass. [`apps/mobile/src/components/onboarding/FearItemForm.tsx:39`]

- **4-3-D1: `swapItems` `reorder_positions` envelope — Epic 6 connector contract** — `apps/mobile/app/(onboarding)/ladder.tsx` enqueues reorder as a custom `{ type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt }` envelope (not column-shaped). Current adapter is a no-op stub; the real Epic 6 connector must handle this type and translate it into two SQL UPDATEs for `fear_ladder_items`. Documented at the call site with a comment. [`apps/mobile/app/(onboarding)/ladder.tsx`]

- **4-3-D5: `UNIQUE(user_id, position)` on `fear_ladder_items` — consider in Epic 6 migration** — No unique DB constraint on `(user_id, position)`. App-layer stale-closure bugs fixed in this story (P5/P6). Add `DEFERRABLE INITIALLY DEFERRED UNIQUE(user_id, position)` in the Epic 6 migration that wires the real connector, when concurrent writes from multiple devices become possible. [`supabase/migrations/0013_fear_ladder_items.sql`]

## Deferred from: code review of 4-2-fear-ladder-introduction-and-suds-calibration (2026-06-01)

- **4-2-D4: Enqueue error leaves MMKV at step 3 with no server record** — `setOnboardingProgressStep(3)` is committed before enqueue; on catch the function returns without navigating; next cold start routes to `/(onboarding)/ladder` stub; calibration value is in MMKV so offline-first intent is preserved but server row is absent. Epic 6 durable outbox must deliver the queued row; documented in 4-2-D2. [`apps/mobile/app/(onboarding)/assessment.tsx:handleNext`]

- **4-2-D5: PowerSync `user_onboarding_metadata` schema omits `id` column** — The enqueue payload includes a client-generated UUID (`crypto.randomUUID()`) as the primary key, but `packages/sync/src/schema.ts` does not declare an `id` column for this table. When Epic 6 wires the real adapter, PowerSync's sync engine will not track the client UUID as row identity, causing a schema mismatch on sync. Add `id: column.text` to the `user_onboarding_metadata` table definition in `schema.ts` before Epic 6. [`packages/sync/src/schema.ts`]

- **4-2-D6: `setSudsCalibration` has no in-memory fallback in degraded-storage mode** — Unlike `setOnboardingProgressStep` (which mirrors to `setOnboardingProgressStepLocal` React state), `setSudsCalibration` writes only to MMKV. In degraded mode the SUDS value is lost permanently; session flow still completes (enqueue uses `selectedValue` from local state). Add a React state mirror if calibration recovery in degraded mode is required. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **4-2-D7: `getAdapter()` eagerly instantiates `PowerSyncSyncAdapter` at module-import time** — The module-level `const _adapter = new PowerSyncSyncAdapter()` runs at import time. If the constructor ever throws (future dependency or init order change), the error surfaces at import rather than at the call site, making the failure hard to trace. Convert to lazy init in Epic 6 when the real adapter is wired. [`apps/mobile/src/sync/adapter.ts`]

## Deferred from: adversarial review of 4-2-fear-ladder-introduction-and-suds-calibration (2026-06-01)

- **4-2-D1: `user_onboarding_metadata` re-submission via back-nav** — Back-navigate from ladder re-mounts assessment (`router.push` intentional in welcome.tsx flow), which re-enables the widget and allows a second `enqueue()` call. The `UNIQUE(user_id)` constraint added in the migration will reject the second insert at the DB layer; Epic 6's real outbox adapter should use `ON CONFLICT (user_id) DO UPDATE` for idempotent upsert semantics. No UX affordance (e.g. toast on duplicate attempt) is specified for MVP. [`apps/mobile/app/(onboarding)/assessment.tsx`, `supabase/migrations/0012_user_onboarding_metadata.sql`]

- **4-2-D2: `enqueue()` error handling stub — Epic 6 must fill** — `handleNext` contains a try/catch with a `console.error` and early return. The `TODO(Epic 6)` comment marks where a user-visible error toast and retry path must be added when `PowerSyncSyncAdapter` is replaced by the real durable outbox. The stub never throws, so this path is untested at MVP. **Addendum (code review 2026-06-01):** On the error path, `setOnboardingProgressStep(3)` has already been called before the catch; on next app relaunch `welcome.tsx` will route the user to `/(onboarding)/ladder` (step 3) rather than back to assessment. This is intentional offline-first behaviour — the calibration value IS locally persisted in MMKV. Epic 6 must ensure the outbox eventually delivers the row. [`apps/mobile/app/(onboarding)/assessment.tsx:handleNext`]

- **4-2-D3: Practice scenario cultural validation** — `onboarding.assessment.practiceScenario` uses a Western clinical baseline ("short speech to 5 strangers") that has not been validated against the India target population. Content is an i18n key (safe to change without code change). Requires India user research before production; flagged as PLACEHOLDER in `en.json`. [`apps/mobile/src/i18n/locales/en.json`]

## Deferred from: code review of 4-1-onboarding-flow-shell-and-navigation (2026-05-28)

- **4-1-D1: assessment.tsx — gesture disabled with no back-button UI** — `gestureEnabled: false` on the assessment stub screen with no alternative navigation. Story 4.2 replaces stub content and must add back navigation per AC3 ("back navigation is available on all steps except the first"). [`apps/mobile/app/(onboarding)/assessment.tsx:642`]

- **4-1-D2: `UseAuthResult` type duplicates `AuthContextValue` — drift risk** — Both interfaces define the same 11+ fields independently with no `Pick<>` or shared type alias. Adding or changing a field in `AuthContextValue` requires a matching manual update in `UseAuthResult`. Refactor when the auth module's public API is hardened. [`packages/supabase/src/auth/useAuth.ts:9-16`]

- **4-1-D3: `OnboardingStepIndicator` no out-of-range step validation** — `accessibilityValue={{ min: 1, max: 4, now: step }}` will be out of range if a future caller passes `step` outside `[1, ONBOARDING_STEP_COUNT]`, violating the ARIA progressbar contract. No out-of-range callers exist yet. Add bounds check (clamp or throw) when Stories 4.3/4.4 introduce steps 3 and 4. [`apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx:13`]

- **4-1-D4: React 18 async batching race on token refresh** — `onAuthStateChange` is a non-React async SDK callback; multiple sequential `setState` calls inside it could theoretically surface a momentary inconsistent state in `(app)/_layout.tsx` between batch flushes. React 18 automatic batching should prevent this in practice. Monitor if users report unexpected onboarding re-entries post token refresh. [`packages/supabase/src/auth/AuthProvider.tsx:161-186`]

## Deferred from: code review of 3-2-dpdpa-consent-schema-and-consent-record-edge-function (2026-05-26)

- **D0 [HARD GATE]: consent_records retention strategy — pre-condition for Story 3.3** — `consent_records` uses `ON DELETE CASCADE` on the `auth.users` FK, meaning hard user-deletion immediately destroys consent records. DPDPA 2023 §8(7) requires consent records to be retained for account lifetime + 2 years post-deletion. Before any `auth.admin.deleteUser()` call is permitted in Story 3.3 (or any future story), a retention strategy must be designed and implemented: options include an archive table (copy before delete), orphaning rows (change FK to `ON DELETE SET NULL`), or a deferred cleanup job. This is a blocker for the erasure flow — do not ship Story 3.3 without resolving this. [`supabase/migrations/0004_consent_records.sql:8`]

- **D1: No rate limiting or duplicate-insert guard on `/consent-record` Edge Function** — An authenticated user can insert unlimited consent records for the same `(user_id, purpose_id)` pair; the view surfaces only the latest but the table grows unboundedly. Add idempotency key or rate-limiting in a future operational hardening story. [`supabase/functions/consent-record/index.ts`]

- **D2: `callEdgeFn` error opacity — caller cannot distinguish 400 / 401 / 500** — All Edge Function HTTP error responses surface as a `FunctionsHttpError` thrown without status context. Callers cannot distinguish retriable (5xx) from non-retriable (4xx) failures. Improve in a future error-handling pass. [`packages/supabase/src/functions/call-edge-fn.ts`]

- **D3: `callEdgeFn` returns `Promise<void>` — success response body discarded** — If the Edge Function ever returns a useful body (e.g. inserted record ID for idempotency), the caller has no access to it without a breaking signature change. Revisit when needed. [`packages/supabase/src/functions/call-edge-fn.ts`]

- **D4: `LOCAL_URL = 'http://localhost:54321'` hardcoded in RLS test** — Matches existing project test pattern; will silently fail if local Supabase runs on a different port. Configurable via env var in a future test-infra cleanup story. [`packages/supabase/__tests__/rls/consent_records.test.ts:10`]

- **D5: Test password hardcoded in RLS test source** — Matches existing `profiles.test.ts` pattern; acceptable for local-only test users. Revisit if test pattern is ever used for staging environments. [`packages/supabase/__tests__/rls/consent_records.test.ts:17`]

- **D6: `authState.userId` in `otp-verification.tsx` effect deps creates subtle re-trigger risk** — The `prevIsAuthenticated` ref guard is synchronous and should hold in practice, but `authState.userId` in the deps array means any session-object update can re-enter the consent path. Pre-existing pattern; not introduced by this story. [`apps/mobile/app/(auth)/otp-verification.tsx`]

## Deferred from: Epic 2 retrospective (2026-05-26) — Epic 9 candidates

- **OTP consent-flow test coverage** — New branches in `otp-verification.tsx` introduced across Stories 2.2 and 2.4 have zero test coverage: consent write success path, consent write failure + retry path, pending deletion guard path. Two stories deferred this independently. Target: Epic 9 quality story. [`apps/mobile/app/(auth)/otp-verification.tsx`]

- **`packages/supabase` React test infrastructure** — `AuthProvider` has no unit tests because `@testing-library/react` + jsdom is not configured in the package. The D1 fix in Story 2.4 (injected `dpoService` prop) requires a test asserting `requestErasure` is called with the correct `userId`. Add test infra and coverage in the next infrastructure story. [`packages/supabase/src/auth/AuthProvider.tsx`]

## Deferred from: code review of 2-4-account-deletion-and-session-sign-out (2026-05-24)

- **W1: `pending_deletion_request` MMKV key never cleared** — Intentional MVP design; the MMKV flag persists on-device until Epic 3's `/dpo/erase-user` Edge Function clears it on server-side confirmation. Documented cross-device limitation: a different device won't have the key and can log in (server-side guard is Epic 3). [`packages/supabase/src/auth/session.ts`]

- **W2: DPO email `privacy@exposure-buddy.com` hardcoded in two files** — `DeleteAccountModal.tsx` uses a module-level `DPO_EMAIL` constant; `otp-verification.tsx` inlines the literal. No single source of truth. Story 3.5 Privacy Notice will introduce a centralised DPO contact constant. [`apps/mobile/src/components/settings/DeleteAccountModal.tsx`, `apps/mobile/app/(auth)/otp-verification.tsx`]

- **W3: `pending_deletion_request` stored in unencrypted MMKV** — Contains `userId` and ISO timestamp in plaintext. Pre-existing architectural choice (SecureStore is already used for auth tokens; MMKV stores app state). Story 9-4 (MMKV key hygiene and storage audit) is the correct remediation vehicle. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **W4: `DpoServiceStub` used as production implementation in `AuthProvider`** — The stub (writes only to MMKV, no server call) is the intentional pre-Epic 3 path. No account is actually deleted from Supabase until Epic 3 wires the real `/dpo/erase-user` Edge Function. [`packages/supabase/src/auth/AuthProvider.tsx:106`]

- **W5: `PendingDeletionRecord.status` only allows literal `'pending'`** — No state machine for `cancelled` or `completed` states. Breaking type change required when Epic 3 introduces server-side deletion acknowledgement. [`packages/core/src/services/IDpoService.ts:3`]

- **W6: `signOut` exported as standalone from `packages/supabase` requiring caller-managed MMKV** — Public API exposes a function that requires the caller to supply the MMKV instance directly. Callers outside `AuthProvider` risk runtime errors if they pass the wrong MMKV instance. Pre-existing pattern; revisit when the auth module's public API is hardened. [`packages/supabase/src/index.ts`]

- **W8: Unit test for `AuthProvider.requestAccountDeletion` injection seam** — The D1 patch added `dpoService?: IDpoService` prop injection to `AuthProvider`. A unit test asserting that `requestErasure` is called with the correct `userId` when the prop is supplied requires React component testing (`@testing-library/react` + jsdom) which is not configured in `packages/supabase`. Add test infra and the test in the next infrastructure story. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **W7: `isAuthenticated` / `authState.userId` brief timing divergence** — `isAuthenticated` is derived from `session !== null` while the deletion guard checks `authState.userId`. Brief window on bootstrap where session is non-null but `userId` may not yet be populated. Pre-existing bootstrap race from Story 2.1; not introduced by this PR. [`packages/supabase/src/auth/AuthProvider.tsx`]

## Deferred from: code review of 2-2-account-creation-safety-checkboxes (2026-05-24)

- **W1: Duplicate consent-write logic / retry timestamp differs** — `ConsentRecord` constructed inline in two places; retry timestamp differs from original attempt. Refactor into a helper when Epic 3 wires real service. [otp-verification.tsx:101–108, 132–139]

- **W2: `consentError` indistinguishable from OTP error; Verify button label confusing during retry** — Both errors use `styles.errorText`; button still reads "Verify" on consent-retry. UX improvement; address in a polish pass.

- **W3: Consent bypass via client-only `isNewAccount` param** — No server-side enforcement; Epic 3 Edge Function provides the guard (AC7 production gate).

- **W4: Missing test coverage for OTP consent flow** — New branches in `otp-verification.tsx` (consent write success/failure/retry) have no tests. Epic 9 candidate.

- **W5: ✓ checkmark Unicode cross-platform rendering** — May differ across font stacks; consider vector icon in a polish story. [SafetyCheckboxes.tsx:27, 41]

- **W6: `SafetyCheckboxes` intro `<Text>` lacks `accessibilityRole`** — Low severity; announce as plain text. [SafetyCheckboxes.tsx:16]

- **W7: Deep-link `isNewAccount` param fragility** — Expo Router URL reconstruction could drop the param; revisit when deep-linking is added.

- **W8: `emitAccountCreated` else-branch navigates without `userId` guard** — Pre-existing from Story 2.1; inconsistency vs. new `isNewAccount` branch. [otp-verification.tsx:118]

## Deferred from: simulator testing of 2-2-account-creation-safety-checkboxes (2026-05-24)

- **ENV-1: React Native version drift blocks local simulator builds** — Project has `react-native@0.81.6` but Expo SDK 54 expects `0.81.5`. On this machine (Xcode 16 / Apple Clang 16), this causes a `getDevServer is not a function` crash during lazy bundle init, preventing `AppRegistry.registerComponent` from running. Fix: pin `react-native` to `0.81.5` in `apps/mobile/package.json`, or upgrade to Expo SDK 55+ which supports 0.81.6. Also affects: `react@19.1.4` vs expected `19.1.0`, `expo-localization@56.0.5` vs `~17.0.8`, `expo-splash-screen@0.29.24` vs `~31.0.13`. [apps/mobile/package.json]

## Deferred from: code review of 1-7-data-foundation-supabase-mmkv-and-powersync-adapter-scaffold (2026-05-23)

- **W1: In-memory `_pending` outbox** — `PowerSyncSyncAdapter` holds queued entries in a plain array; all entries lost on app restart. Documented scaffold behavior; real durability wired in Epic 6. [`packages/sync/src/adapter.ts`]

- **W2: `zod ^4.4.3` vs spec's `^3`** — zod 4.x is now the stable `latest` on npm; the spec predated v4 GA; no functional regression in CI. Update the Dev Notes version table in the next story. 

- **W3: AES-256 key entropy under-provisioned** — `crypto.randomUUID().replace(/-/g, '')` yields 16 bytes (128 bits); AES-256 requires 32 bytes. The `encryptionType: 'AES-256'` claim may be incorrect. Address in Epic 9 MMKV key hygiene (story 9-4). [`packages/supabase/src/auth/session.ts`]

- **W4: `resolveConflict` stub has no guard** — returns `_remote` with no "not implemented" signal; future callers cannot distinguish scaffold from intentional policy. Acceptable at scaffold stage; Epic 6 hardens. [`packages/sync/src/utils/conflict.ts`]

- **W5: `supabase-import-gate` CI step hardcodes scanned directories** — new packages silently bypass the boundary check. Fix in Epic 9 or next CI cleanup story. [`.github/workflows/ci.yml`]

- **W6: `email` column in `public.users` duplicates `auth.users.email` with no sync trigger** — stale on email change. Pre-existing design choice; no trigger migration in scope this story. [`supabase/migrations/0001_users.sql`]

- **W7: Clinician stub test runs live assertions** — 4th test in `users.test.ts` signs in as User B and performs an active cross-user read; AC2 describes the slot as "empty (ARC-007 deferred)". Functionally validates cross-user blocking; disputable AC interpretation. [`packages/supabase/__tests__/rls/users.test.ts`]

## Deferred from: code review of 1-6-developer-infrastructure-i18n-scaffold-and-accessibility-gates (2026-05-22)

- **i18n side-effect import mid-block** — `import '../src/i18n'` placed between other imports in `_layout.tsx`; import auto-fixers (e.g. `import/order` eslint rule) could reorder it and silently break i18n init sequence. Add an explicit comment anchor or move to a designated side-effect block. [apps/mobile/app/_layout.tsx:7]

- **useFocusOnMount stale reduced:true boot value** — AnimationContext initialises `reduced: true` as a fail-safe before `isReduceMotionEnabled` resolves asynchronously; `useFocusEffect` may fire during this window, causing `setAccessibilityFocus` to be called even when the user hasn't enabled reduced motion. Requires an `isReady` / `loaded` flag in AnimationContext. Pre-existing AnimationContext design from Story 1.5. [apps/mobile/src/hooks/useFocusOnMount.ts:17, apps/mobile/src/contexts/AnimationContext.tsx]

- **useFocusEffect no cleanup** — Callback returns no cleanup function; if back-navigation or unmount interrupts before TalkBack processes the focus, the stale handle is a no-op at best, accessibility service crash at worst on some Android versions. Low risk at scaffold stage; address when the hook is used in real screens. [apps/mobile/src/hooks/useFocusOnMount.ts:18]

## Deferred from: code review of 1-5-motion-layout-and-mode-foundations (2026-05-22)

- **ADR unverified MVP scope claim** — "No Epic 2–7 screen requires CalmMeButton above native system UI" is asserted without citation. Validate against each epic's feature list before the In-the-moment sprint begins. [ADR-CALMME-RENDER.md]

- **Story 1.2 evaluation not summarised inline in ADR** — The ADR cross-references Story 1.2 completion notes but does not reproduce key findings inline. Future readers must navigate to a separate artifact to verify the evaluation. Acceptable for MVP; revisit if ADR becomes a standalone document. [ADR-CALMME-RENDER.md]

- **No sign-off enforcement gate before Epic 7** — ADR must be signed before the In-the-moment sprint; no automation reminds the team. Add a CI check or sprint planning checklist item before Epic 7 kicks off. [ADR-CALMME-RENDER.md]

- **No Alternatives Considered for `@rn-primitives/portal` vs React Native `Modal`** — Only `@gorhom/bottom-sheet` vs `@rn-primitives/portal` was evaluated. RN's built-in `Modal` (transparent + `animationType="none"`) was not explicitly rejected. Low risk given the portal-first architecture decision; document if challenged. [ADR-CALMME-RENDER.md]

- **`surface.secondary` (#EBF0EE) missing from Preparation token table** — `theme.ts` tags `surface.secondary` as "cards, sheets, preparation register" but the brief's Token Surface table omits it. Preparation card/sheet components will need to infer the correct surface. Add in the story that introduces the first Preparation card component. [docs/ux/mode-briefs/preparation.md]

- **2-second In-the-moment SLA underspecified** — Start event (tap-down vs tap-up), reach definition (first frame vs interactive), and reference device (e.g. "2GB RAM Android 10") are not defined. Specify in the SLA section before Epic 7 performance testing begins. [docs/ux/mode-briefs/in-the-moment.md]

- **`reflect.background` vs `surface.primary` in mixed-mode screens** — No guidance on which background token to use when a screen transitions between Reflection and another mode. Clarify when the first mixed-mode screen is designed. [docs/ux/mode-briefs/reflection.md]

## Deferred from: code review of 1-4-token-system-and-typography-architecture (2026-05-21)

- **DMSerifDisplay_400Regular (non-italic) loaded but no token uses it** — Spec-compliant load; no existing token references the upright face. Reserve for a future typography token (e.g. a non-italic `display` variant). [apps/mobile/app/_layout.tsx:13]

- **ESLint groundingTokens rule misses import paths 3+ levels deep and non-standard file naming** — Relative paths `../tokens/theme` and `../../tokens/theme` covered; `../../../tokens/theme` and deeper escape the rule. Non-conventional file names (e.g. `grounding-context.ts`) also bypass the glob. Low risk while packages/ui is shallow; revisit if nested directory structure grows. [packages/ui/.eslintrc.js]

- **ESLint rule scope limited to packages/ui — apps/mobile Context/Provider files unprotected** — The `no-grounding-token-in-context` rule lives in `packages/ui/.eslintrc.js` and has no effect on `apps/mobile`. Any `GroundingContext.tsx` created in the app package can import `groundingTokens` without ESLint error. Add an equivalent `overrides` block to `apps/mobile/.eslintrc.js` when Context/Provider files are created there. [packages/ui/.eslintrc.js]

- **accent.grounding (4.37:1) — no machine-enforceable normal-text-use constraint** — Constraint is advisory (token comment + WCAG sign-off doc). No lint rule or TypeScript enforcement prevents misuse on normal body text. Consider a design-system lint rule targeting `color.accent.grounding` in Text-style positions when the component library matures. [packages/ui/src/tokens/theme.ts:23]

- **accent.progress decorative-only — advisory comment only, no enforcement** — No rule prevents `accent.progress` being used as a `<Text>` foreground color. Enforce via design-system lint or a wrapped colour type when the component primitives layer is built. [packages/ui/src/tokens/theme.ts:22]

- **DmSerifSurface type is voluntary — typography.display and typography.narrative spread freely** — The type guard documents the constraint but does not prevent access. A component-level wrapper (e.g. `<DmSerifText surface={…}>`) that validates the `DmSerifSurface` union at the JSX boundary would give compile-time enforcement. Defer until the primitive component layer is built. [packages/ui/src/tokens/theme.ts]

- **No timeout fallback if expo-font hangs indefinitely** — If `useFonts` never resolves (network failure, slow device), the splash screen is permanently displayed. Add a `setTimeout(() => SplashScreen.hideAsync(), 5000)` fallback in a follow-up story covering defensive app-shell resilience. [apps/mobile/app/_layout.tsx:42-44]

- **fontError not reported to Sentry** — Font load failures are silent in production. Wire `fontError` into `Sentry.captureException` when full Sentry integration is implemented. [apps/mobile/app/_layout.tsx:34-38]

- **PortalHost unmounted during null-return font-loading phase** — Portals triggered before fonts load (deep links, push notifications) have no host to mount into and will silently disappear. Address when portal consumers are implemented and the startup sequence is hardened. [apps/mobile/app/_layout.tsx:46]

## Deferred from: code review of 1-2-ui-library-evaluation-rn-primitives-and-bottom-sheet (2026-05-21)

- **`react-dom@18.3.1` cross-major + Expo web bundling risk** — `@radix-ui/react-dialog` imports `react-dom` only for its web render path; on a native Metro build this is excluded. If an Expo web target is added, the web build will get a `react-dom@18` + `react@19` cross-major mismatch. Revisit before adding Expo web. [docs/decisions/ui-library-evaluation.md: Section 1]

- **`@rn-primitives/*` as `dependencies` vs `peerDependencies`** — Listed as hard `dependencies` in `packages/ui/package.json`. In a publishable shared package, these should be `peerDependencies`. Benign in this internal monorepo with pnpm workspace deduplication, but revisit if `@exposure-buddy/ui` is ever extracted or published. [packages/ui/package.json]

- **Metro cold-start not verified on a running dev server** — Evaluation confirmed `pnpm turbo build` passes but a running Metro dev server was not available. Verify no new cold-start warnings when a dev build is available in Story 1.3. [docs/decisions/ui-library-evaluation.md: Section 4]

- **`zustand` deduplication fragile on future direct adoption** — `@rn-primitives/portal` owns `zustand@5.0.x` as a runtime dep. If any future workspace package adds a direct `zustand` dep at a conflicting range, two zustand instances will be installed, isolating portal's store. Review when zustand is first adopted directly. [packages/ui/package.json]

- **`@radix-ui/react-dialog` web-only code bundled on Expo web target** — Not in Phase 1 scope. Revisit before adding an Expo web build target. [pnpm-lock.yaml]

## Deferred from: code review of 1-1-monorepo-initialisation-mobile-app-shell-and-build-pipeline (2026-05-21)

- **`turbo.json` `.env*` cache input may expose secrets to Turbo Remote Cache** — `"inputs": ["$TURBO_DEFAULT$", ".env*"]` in `turbo.json` causes `.env` file contents to be hashed into Turbo's content-addressed cache key. If Turbo Remote Cache is ever enabled (`TURBO_TOKEN`), these hashes could leak into remote cache metadata. Revisit before enabling remote caching. [turbo.json:7]

- **`web-import-gate` does not account for future `apps/` directories** — the grep scope in `ci.yml` is limited to `apps/mobile/src apps/mobile/app packages/`; new `apps/` directories added in later phases (e.g., `apps/desktop`) would not be checked for `apps/web` imports. Low risk at current project size but should be widened when a second app is added. [.github/workflows/ci.yml:63]

- **`typecheck` CI job rebuilds from scratch on fresh runners** — `pnpm turbo typecheck` depends on `build` outputs that live on a different runner; there is no Turbo Remote Cache configured, so the build is re-run from scratch on the typecheck runner. Makes `needs: [build]` ordering redundant and doubles CI time. Address when Turbo Remote Cache is configured. [.github/workflows/ci.yml:117]

## Deferred from: code review of 3-1-crisis-keyword-detection-engine (2026-05-26)

- **D1: Unicode homoglyph/lookalike substitution bypasses detection** — Characters like Cyrillic small dze (U+0455) replacing Latin 's', full-width ASCII, or combining diacritics are not normalized before matching. Requires NFKC confusable folding — beyond the scope of a pure substring detector. Address if adversarial bypass becomes a concern; document as a known gap for now. [`keywordDetector.ts:4-5`]

- **D2: Substring false positives on 'overdose' and 'want to die' in casual speech** — `overdose` matches "I overdosed on coffee"; `want to die` matches "I want to die of embarrassment". Inherent limitation of the substring-match design mandated by Story 3.1 spec. False positives increase alert fatigue; consider context-window scoring in a future NLP upgrade story. [`keywords.ts:10,21`]

- **D3: Hindi keyword coverage gaps — gendered and conjugation variants absent** — `'मरना चाहता'` covers masculine only; feminine plural (`चाहते`), informal conjugations, and Romanized transliterations are missing. Clinical review required before production (flagged in source comment). Address during the clinician keyword review pass before production release. [`keywords.ts:24-31`]

- **D4: Devanagari word-boundary false positives** — Hindi script has no equivalent of `\b` word boundaries; short keywords like `'जान'` (life/soul) appear as common standalone words and in vocative usage. Design limitation of substring matching; acceptable at MVP. Revisit if false-positive rate proves clinically significant. [`keywords.ts:24-31`]

- **D5: No false-positive test cases documenting known substring-match scope** — The test suite covers true-positive branches but has no tests asserting that common benign phrases ("suicide prevention", "I overdosed on coffee") do or do not trigger detection. Add documentation tests when the NLP approach is revisited. [`keywordDetector.test.ts`]


## Deferred from: code review of 3-5-dpo-appointment-privacy-notice-and-analytics-boundary (2026-05-28)

- **F1: `device_context JSONB` has no structural PII enforcement** — No CHECK constraint limits JSONB keys; any caller can store arbitrary fields including PII once Phase 2 removes CHECK(false). Add an allowed-key constraint in the Phase 2 analytics activation migration. [`supabase/migrations/0011_analytics_events_stub.sql:7`]

- **F2: Date format test validates YYYY-MM-DD pattern only; no freshness check** — `PRIVACY_NOTICE_LAST_UPDATED` test passes format regex but cannot detect a stale date after Privacy Notice content changes. DPDPA §7 compliance obligation is a process control, not an automated test invariant. [`apps/mobile/src/i18n/i18n.test.ts:27`]

- **F3: Deep-link → `otp-verification` (no params) → `sign-in` → `(app)/` redirect loop** — Pre-existing routing contract from Story 2.2; not introduced by Story 3.5. [`apps/mobile/app/(auth)/otp-verification.tsx:97`]

- **F4: `KEY_PATTERN` regex only validates `en.json` key naming; `hi.json` key typos uncaught** — Test suite structural conformance covers English locale only; a malformed key in a partial Hindi locale (e.g. capitalised first character) would silently pass. Extend to validate all registered locale files in a future i18n quality story. [`apps/mobile/src/i18n/i18n.test.ts:5`]

## Deferred from: code review of 3-4-dpo-operator-panel (2026-05-27)

- **D-3.4-1: CORS wildcard on operator-privileged DPO endpoints** — `_shared/cors.ts` sets `Access-Control-Allow-Origin: *`; pre-existing from Story 3.3 shared module; Bearer auth mitigates direct exploitation; tighten to panel origin in Epic 4 security-hardening story. [`supabase/functions/_shared/cors.ts`]

- **D-3.4-2: No server-side audit log entry in `dpo-request-deletion` for user-initiated deletion requests** — DPDPA audit completeness enhancement; `action_type: 'deletion_request'` entry with user's ID would provide server-side evidence of receipt; out of story scope; add in a future audit-completeness story. [`supabase/functions/dpo-request-deletion/index.ts`]

- **D-3.4-3: `dpo-logout` does not invalidate server-side Supabase JWT** — Accepted deferred F3/F10; JWT remains valid ≤8h after logout; mitigated by 8h TTL, `active=false` deactivation, small roster; file as Epic 4 SOC-2 hardening ticket. [`supabase/functions/dpo-logout/index.ts`]

- **D-3.4-4: `confirmErasure` inline `onclick` attribute built via `JSON.stringify` (not HTML-attribute-escaped)** — Data is server-controlled so risk is low; `data-*` attributes + event delegation is the correct pattern; address in a UI hardening pass. [`supabase/functions/dpo-panel/index.ts:148`]

- **D-3.4-5: No in-progress guard on `requestAccountDeletion` — concurrent invocations race on MMKV key** — UI layer should disable the delete button after first tap; no mutex specified in story; address if double-tap race is observed in testing. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **D-3.4-6: No client-side UUID format validation in panel export form** — Server rejects invalid UUIDs; UX-only concern; add simple regex guard in a polish pass. [`supabase/functions/dpo-panel/index.ts`]

- **D-3.4-7: `dpo-erase-user` partial erasure — RPC nulls PII but auth ban step has no rollback** — Pre-existing Story 3.3 Edge Function; partial erasure leaves `auth.users` un-banned after PII is nulled; compensating transaction needed for Epic 4. [`supabase/functions/dpo-erase-user/index.ts`]

## Deferred from: spec review of 5-3-erp-session-completion-debrief-and-home-state (2026-06-07)

- **5-3-W1: `resolveDisplayState()`/`formatTimeRemaining()` snapshot** — Both values are computed once at mount with `Date.now()`; the displayed countdown freezes and state-7→state-8 transition never fires while the screen is open. Epic 6 replaces with real-time countdown and PowerSync `expires_at`. [T6.2, T6.5 — `apps/mobile/app/(app)/index.tsx`]

- **5-3-W2: `SESSION_DEBRIEF_PENDING` key persists after state-7 complete + window expiry** — After the user submits their state-7 reflection, `resolveDisplayState` correctly returns `'default'`, so no visible bug; but the MMKV key is never deleted and persists indefinitely. Epic 6 lifecycle cleanup required. [T2.1, T5.3 — `packages/supabase/src/auth/AuthProvider.tsx`]

- **5-3-W3: Sign-out race in `updateDebriefReflectionSubmitted`** — Async gap between `enqueue()` and `updateDebriefReflectionSubmitted()` call; sign-out during this window causes the MMKV write to silently no-op (`authState.userId` becomes null), leaving `reflectionSubmitted: false` on next login and home showing state 8 despite the reflection having been submitted. Pre-existing MMKV atomicity limitation. [T2.1 — `packages/supabase/src/auth/AuthProvider.tsx`]

- **5-3-W4: Simultaneous `SESSION_IN_PROGRESS` + `SESSION_DEBRIEF_PENDING` on app kill** — If the app is killed between writing `SESSION_DEBRIEF_PENDING` (step 6) and deleting `SESSION_IN_PROGRESS` (step 7) in `handleCompleteSession`, both keys are present on next launch. The recovery modal (Story 5.2) and debrief state would both activate simultaneously. Epic 6 recovery flow should detect and resolve this contradiction. [T4.4 — `apps/mobile/app/session/active.tsx`]

- **5-3-W5: `getSessionIntention`/`hasSessionIntention` store-only guard** — Dev Notes correctly specify that these session-scoped functions need only the MMKV store guard (no userId guard). This is an implementation detail for T2.1 — covered in Dev Notes §AuthProvider additions summary. [Dev Notes]

- **5-3-W6: SudsArcChart individual dot accessibility** — Each dot renders with no per-value accessibility label; screen readers hear only the container-level `accessibilityLabel`. Full per-reading description deferred to Epic 9 accessibility audit (Story 9-3). [T3.1 — `packages/ui/src/components/SudsArcChart.tsx`]

- **5-3-W7: Crisis contact phone numbers not localised** — Hardcoded English numeral strings in i18n keys for Indian crisis helplines. MVP scope decision; revisit if the app adds non-English speaking users or the numbers change. [T5.2 — `apps/mobile/app/session/debrief.tsx`]

- **5-3-W8: `resolveDisplayState`/`formatTimeRemaining` belong in `packages/core`** — Both are pure derivation functions with no RN dependencies. Per the derived-state pattern they should live in `packages/core`. Epic 6 extracts them to `resolveHomeScreenState()` as explicitly documented in the spec with inline comments. **Addendum (verification 2026-06-08):** the 6h post-exposure window is duplicated as a literal `21600000` in `apps/mobile/app/session/debrief.tsx` (late-debrief detection) and as `POST_EXPOSURE_WINDOW_MS = 6 * 60 * 60 * 1000` in `apps/mobile/app/(app)/index.tsx`. The two will silently drift if one is changed. The packages/core extraction should expose a single `POST_EXPOSURE_WINDOW_MS` constant and have both files import it. [T6.2, T6.5 — `apps/mobile/app/(app)/index.tsx`, `apps/mobile/app/session/debrief.tsx`]

## Deferred from: code review of 3-3-dpo-edge-functions-and-audit-log (2026-05-27)

- **D-3.3-1: FK `ON DELETE SET NULL` migration comment incorrect for soft-delete path** — `supabase/migrations/0005_consent_records_retention.sql` comment states "orphaned after auth user deletion" but the erasure path never calls `deleteUser()` — only bans the auth user — so the `ON DELETE SET NULL` cascade never fires via this path. Behaviour is correct; comment misleads future readers. Correct when the migration comment can be updated without a re-run. [`supabase/migrations/0005_consent_records_retention.sql`]

- **D-3.3-2: `DpoService` operator-JWT precondition undocumented** — `DpoService.requestErasure()` calls `callEdgeFn` which sends the current session's JWT. If a regular (non-operator) user's session is active, the Edge Function returns 401 and the error is silently swallowed in `AuthProvider`. Document the precondition (requires operator-authenticated client) in JSDoc before Story 3.4 wires this. [`packages/supabase/src/functions/dpo-service.ts`]

- **D-3.3-3: `CREATE TRIGGER` in migration 0008 not idempotent** — `supabase/migrations/0008_dpo_audit_log_truncate_guard.sql` uses `CREATE TRIGGER` without `IF NOT EXISTS` or `OR REPLACE`. Would fail if replayed manually (Supabase CLI tracks state so normal operation is unaffected). Add `DROP TRIGGER IF EXISTS` guard if idempotent replay is ever needed. [`supabase/migrations/0008_dpo_audit_log_truncate_guard.sql`]

- **D-3.3-4: RLS test `beforeAll` uses fixed email — fails on second run without `supabase db reset`** — `dpo-audit-rls-test-a@example.com` is hardcoded; a second run without `supabase db reset` would conflict. Follows existing `profiles.test.ts` pattern; acceptable for local-only test DB. Add idempotent user-upsert logic if test infra is hardened. [`packages/supabase/__tests__/rls/dpo_audit_log.test.ts`]

---

## Architectural decision — no BEFORE DELETE trigger on `fear_ladder_items` (2026-06-16)

_Settled in party-mode roundtable (Sally, Winston, Amelia, John) resolving the rejected Story 6.2 spec. Applies to Story 6.2-C and any future story that adds a server-side delete guard on this table._

- **UI-only delete-during-active-session guard; no DB backstop** — The "Remove item" delete UX (Story 6.2-C) is gated at the UI layer only (`Remove` button disabled when the current user has an `exposure_sessions` row with `status='started'`). A `BEFORE DELETE` trigger on `fear_ladder_items` was explicitly rejected: trigger rejection causes PowerSync's `ps_crud` to retry the upload forever, and the next pull re-materializes the "deleted" row to the user's screen with no error explanation — strictly worse than the bypass it would prevent. If a future REST API layer, admin tooling, or direct Supabase client path is introduced that bypasses the UI guard, prefer an RLS policy or application-layer validator (synchronous error surfaces to the upload pipeline) over a BEFORE DELETE trigger. [`apps/mobile/app/ladder.tsx`, `supabase/migrations/`]

## Deferred from: code review of 6-2-b-home-screen-morning-state (2026-06-17)

- **Multiple simultaneous active threads across different fear items not distinguished.** `uq_active_thread` only enforces one `status='started'` row per `(user_id, fear_item_id)` pair — a user can have active sessions on two *different* fear items at once. `useActiveExposureSession`'s `SELECT ... WHERE status = 'started' ORDER BY started_at DESC LIMIT 1` silently picks the most recent and the other stays invisible to `HomeScreenContext`. No behavioral impact on Story 6.2-B (its `progressing` placeholder CTA navigates generically to `/ladder`), but Story 6.3 will need to resolve which active session to actually resume when it builds the polished state-4 card. [`apps/mobile/src/hooks/useActiveExposureSession.ts`, Story 6.3]
- **`HomeScreenContext.activeThread`'s avoidance-detection fields are permanent placeholders.** `openCount`, `openDurationHours`, and `userDeclaredIncomplete` are always zeroed/false in Story 6.2-B's context-building code, present only to satisfy `ADR-HOME-STATE-RESOLVE.md`'s type contract since `avoidance` (state 5) isn't implemented. The ADR's type design forces non-optional fields with no real data source at MVP — consider making them optional in the ADR when `avoidance` is eventually built, rather than perpetuating fake zeros. [`_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md`, Story 6.2-B]
- **`resolveLowestPendingItem`'s `id` tiebreaker uses `localeCompare`, which is locale-sensitive.** Sort order for the tiebreaker could in theory vary across device locale settings; current test coverage only uses literal `'a'`/`'b'` ids, not real UUID-shaped ids. Low real-world risk (UUIDs are unaccented lowercase hex with no case ambiguity), but worth reconsidering if `AC 3`/the underlying ADR is ever revisited — pre-existing, spec-mandated choice, not a defect introduced by Story 6.2-B's implementation. [`packages/core/src/selectors/fearLadder.ts:21`, Story 6.2-B]
- **`common.loading` i18n key referenced but never defined.** The new loading-indicator `accessibilityLabel={t('common.loading')}` in `index.tsx` references a key absent from both `en.json` and `hi.json` — inherited verbatim from the pre-existing `apps/mobile/app/ladder.tsx:182` usage, now duplicated rather than introduced by Story 6.2-B. [`apps/mobile/app/(app)/index.tsx`, `apps/mobile/app/ladder.tsx`, `apps/mobile/src/i18n/locales/en.json`]

## Deferred from: code review of 6-2-c-ladder-item-delete (2026-06-17)

_Spec review (no-spec mode) of the Story 6.2-C document itself, before implementation. All items below are real but not actionable yet — re-check during/after T-implementation._

- **Cross-user DELETE silently affects 0 rows with no client-side detection of the resulting local/server divergence** (AC 1). Pre-existing RLS pattern used elsewhere in the project, not unique to this story.
- **`useActiveExposureSession(userId)`'s `userId` source isn't stated explicitly in AC 6 text** (only implied via "same call signature as index.tsx"). Inferable from the referenced file; minor clarity gap only.
- **AC7's "exception-free by construction" claim only holds until a future schema change** (e.g. a new NOT NULL column on `dpo_audit_log`). Speculative future risk, not actionable now.
- **`acting_operator_id = OLD.user_id` conflates actor and subject for self-service deletes** (AC 7); no operator/bulk-delete path exists yet that would need disambiguation.
- **If the UI guard (AC 6) is ever bypassed, an orphaned `exposure_sessions` row can permanently block all future deletes** via the global active-session check, with no recovery path described. Already tracked as a known residual risk above (party-mode roundtable entry, 2026-06-16) and in this same heading.
- **Hindi locale duplicates English copy for a high-stakes, irreversible-action confirmation** (AC 8). Matches existing project-wide `hi.json` convention, not a deviation introduced by this story.
- **`handleConfirmDelete` closes the modal unconditionally even if `enqueue` throws** (catch only logs) (T5). Matches the existing edit/add error-handling convention in the same file.
- **Stale `activeSession === null` if a session starts on another device between modal-open and tap** (AC 6). Inherent multi-device sync-latency race, not unique to this guard.
- **0-row DELETE from an already-deleted item or racing devices isn't explicitly addressed** (AC 1, AC 7). Standard Postgres/RLS semantics already handle this correctly (no trigger fire, no error); just unstated in the spec.
- **i18n lint key-parity behavior for the reused `ladder.cancel` key under `ladder.delete.*` is unverified** (AC 8). Needs a quick check against the actual lint implementation during dev.
- **Idempotency of a retried `swap_ladder_positions` call (PowerSync batch retry) is correct by construction** (positions are set to absolute values) but never explicitly stated (AC 2, AC 3). Documentation-only gap.

[`_bmad-output/implementation-artifacts/6-2-c-ladder-item-delete.md`]

## Deferred from: code review of 6-2-c-ladder-item-delete (implementation, 2026-06-17)

_Adversarial review of the actual implementation diff (migrations, connector.ts, ladder.tsx, tests), run via Blind Hunter + Edge Case Hunter + Acceptance Auditor after dev-story completion._

- **The two `UPDATE`s inside `swap_ladder_positions` are asserted to commit atomically with `uq_user_position`'s deferred constraint check, but no test exercises a constraint-violation scenario to prove it.** Additional test-coverage hardening beyond AC 2's literal scope, not a known defect. [`supabase/migrations/0026_swap_ladder_positions_rpc.sql`]
- **`swap_ladder_positions` has no rowcount/existence check after its two `UPDATE` statements** — if either paired item is deleted by a concurrent transaction between the ownership `SELECT`s and the final `UPDATE`s, the `UPDATE` silently matches 0 rows (no error), and the function reports success despite a partial/no-op swap. Deferred (decision-needed, resolved 2026-06-17): narrow race window — a concurrent delete must land in the sub-millisecond window between the ownership SELECT and the UPDATE within one transaction; the existing ownership/not-found check already catches the far more common case of an item deleted before the batch starts. [`supabase/migrations/0026_swap_ladder_positions_rpc.sql:45-46`]
- **`fear_ladder_items_delete_audit`'s "must never fail" design only holds until a future schema change on `dpo_audit_log`** (e.g. a new `NOT NULL` column). Duplicate of an already-deferred spec-review finding (AC 7); speculative future risk. [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`]
- **`acting_operator_id = OLD.user_id` conflates actor and subject for self-service deletes**, muddying the column's normal "DPO operator" semantics for any future audit-log reader. Duplicate of an already-deferred spec-review finding (AC 7). [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`]
- **`dpo_audit_log_action_type_check`'s `DROP CONSTRAINT` + re-`ADD CONSTRAINT` takes a brief exclusive-ish lock while validating existing rows**, a risk on a high-traffic audit-log table. Matches the project's established migration 0021 precedent for the same DROP+ADD CHECK pattern, not unique to this story. [`supabase/migrations/0027_fear_ladder_items_delete_audit.sql`]
- **`isReorderPair`/`groupReorderPairs` don't validate that `entry.id` is a well-formed UUID** before it reaches `p_item_a_id`/`p_item_b_id` — a corrupted local `ps_crud` row would surface as an opaque Postgres cast error rather than a clear client-side failure. Requires local SQLite corruption to trigger; low likelihood, defense-in-depth only. [`packages/sync/src/connector.ts:39-50`]
- **`isRetryableError`'s substring match against `error.message` assumes Supabase/PostgREST never wraps or truncates the raw Postgres exception text.** Contradicted by the passing `swap_ladder_positions.test.ts` integration tests against the real local Supabase/PostgREST stack, which confirm the message passes through unwrapped. [`packages/sync/src/connector.ts:28-31`]
- **Non-retryable RPC errors are only `console.error`'d with no telemetry/crash-reporting hook**, so a production failure of this kind is invisible to operators. AC 2/AC 3 only require "surface/log the failure"; telemetry infrastructure doesn't exist elsewhere in this codebase and is out of scope for this story. [`packages/sync/src/connector.ts:69`]
- **No test combines an actual `DELETE` `CrudEntry` and a reorder-pair referencing the same item id within one batch** — only the resulting RPC error is tested in isolation. The spec-anticipated behavior (AC 3's in-flight-pair note) is already implemented and tested in equivalent simplified form; this is a test-refinement suggestion, not a behavior gap. [`packages/sync/__tests__/connector.test.ts`]
- **`uploadData` throws on the first retryable error encountered (in either the pairs loop or the remaining-entries loop), aborting the rest of the batch** including unrelated valid pairs/entries. Pre-existing PowerSync connector behavior (the original per-entry loop already aborted the whole batch on any single throw), not introduced or worsened by this story. [`packages/sync/src/connector.ts:51-78`]
- **`groupReorderPairs` buckets by `transactionId` using `== null`, which would not treat a hypothetical `transactionId === 0` as "no transaction".** Speculative; PowerSync's `transactionId` is an auto-incrementing id (observed to start above 0), and the story's own Dev Notes already accept this as a future-PowerSync-internals coupling risk. [`packages/sync/src/connector.ts:52-67`]
- **`swap_ladder_positions` accepts arbitrary integer positions, including negative or zero, with no range validation.** AC 2's literal spec SQL; impact is self-scoped to the calling user's own data ordering (RLS-protected, no cross-user effect), not a correctness or security issue. [`supabase/migrations/0026_swap_ladder_positions_rpc.sql`]

[`_bmad-output/implementation-artifacts/6-2-c-ladder-item-delete.md`]

## Deferred from: code review of 6-3-home-screen-progressing-state-state-4 (2026-06-17)

_Spec review of the story document itself (Blind Hunter + Edge Case Hunter), run before implementation began — no diff existed yet, the spec is the artifact reviewed._

- **`preSuds` has no 0–10 range validation anywhere in the session flow** (`intent.tsx` → URL → `active.tsx`'s `parseInt`). Pre-existing gap not introduced by this story, already tracked as 6-1-CR-D3 above. [`_bmad-output/implementation-artifacts/6-3-home-screen-progressing-state-state-4.md` Dev Notes — Data source decision]
- **No validation that `sessionId` exists in `exposure_sessions` before `active.tsx` enqueues writes against it** (orphaned/corrupted session ID). Pre-existing pattern across the entire session flow, not introduced or worsened by this story. [`apps/mobile/app/session/active.tsx`]
- **The cross-device fallback's `preSuds=0` default builds directly on top of the already-tracked 6-1-CR-D3 gap** (unguarded `preSuds` forwarding) rather than mitigating it. Epic 9 candidate per 6-1-CR-D3 above; no new fix required within this story's scope. [`_bmad-output/implementation-artifacts/6-3-home-screen-progressing-state-state-4.md` Dev Notes — "Why the cross-device fallback still matters"]

[`_bmad-output/implementation-artifacts/6-3-home-screen-progressing-state-state-4.md`]
