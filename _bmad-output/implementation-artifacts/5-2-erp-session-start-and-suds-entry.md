# Story 5.2: ERP Session — Start & SUDS Entry

Status: review

## Story

As a user,
I want to start an exposure session from a ladder rung and record my distress level in real time,
so that I can track my anxiety arc during the exposure (FR-ERP-01, FR-ERP-02).

*Depends on: Story 5.1 merged to main.* ✅

## Acceptance Criteria

1. **`actual_suds` renamed to `peak_suds` in `fear_ladder_items`**
   Given the migration `0015_rename_actual_suds_to_peak_suds.sql` runs
   When the schema is inspected
   Then `actual_suds` column is renamed to `peak_suds` (nullable int, CHECK 0–10 preserved); `packages/sync/src/schema.ts` `fear_ladder_items` table definition replaces `actual_suds: column.integer` with `peak_suds: column.integer`; `sync-rules.yaml` (PowerSync server config) reflects the rename; `packages/core/src/selectors/fearLadder.ts` `FearLadderItem` interface adds `peakSuds: number | null`; CI fails if `actual_suds` is referenced anywhere in the codebase post-migration

2. **`exposure_sessions` table created**
   Given migration `0016_exposure_sessions.sql` runs
   When the schema is inspected
   Then the table contains: `id` (uuid PK), `user_id` (FK `auth.users` ON DELETE CASCADE), `fear_item_id` (FK `fear_ladder_items` — nullable; not cascade-deleted on item removal), `session_type` (text NOT NULL DEFAULT `'erp'` — CHECK `session_type IN ('erp')`), `status` (text NOT NULL DEFAULT `'started'` — CHECK `status IN ('started', 'completed', 'abandoned')`), `pre_session_intention` (text NULLABLE), `post_session_reflection` (text NULLABLE), `started_at` (timestamptz DEFAULT now()), `ended_at` (timestamptz NULLABLE), `expires_at` (bigint NULLABLE — UTC epoch ms), `created_at` (timestamptz DEFAULT now()); a composite index exists on `(user_id, id)` for RLS subquery performance; RLS is enabled; three policies created (select/insert/update own-row; no delete policy — sessions are never deleted by the app)

3. **`suds_readings` table created**
   Given migration `0017_suds_readings.sql` runs
   When the schema is inspected
   Then the table contains: `id` (uuid PK), `session_id` (FK `exposure_sessions` ON DELETE CASCADE), `suds_value` (int NOT NULL — CHECK 0–10), `recorded_at` (timestamptz DEFAULT now()); NO `user_id` column; RLS policy: `session_id IN (SELECT id FROM exposure_sessions WHERE user_id = auth.uid())`

4. **`set_session_expires_at` trigger created**
   Given migration `0018_set_session_expires_at_trigger.sql` runs
   When `exposure_sessions.status` changes to `'completed'`
   Then the trigger fires BEFORE UPDATE and sets `expires_at = EXTRACT(EPOCH FROM now())::bigint * 1000 + 21600000` (now + 6 h in epoch ms); `expires_at` is NEVER computed client-side — server-authoritative

5. **RLS tests pass for `exposure_sessions` and `suds_readings`**
   Given `packages/supabase/__tests__/rls/exposure_sessions.test.ts` and `suds_readings.test.ts` run against local Supabase
   When all assertions execute
   Then four assertions pass for each table: [+] own-row read/write; [−] cross-user blocked; [−] unauthenticated blocked; [stub] clinician path returns 0 rows

6. **`SessionStateMachine` implemented in `packages/core`**
   Given `packages/core/src/session/SessionStateMachine.ts` is inspected
   When the module is reviewed
   Then it exports: `SessionState` type union (`'idle' | 'pre_session' | 'active' | 'grounding' | 'completed' | 'abandoned'`), `SessionEvent` discriminated union, `transition(currentState, event): Result<SessionState>` pure function; legal transitions: `idle→pre_session` (`session.started`), `pre_session→active` (`exposure.begun`), `active→grounding` (`exposure.stopped`), `active→completed` (`session.completed` — guard: requires `sudsReadingsCount ≥ 1` in event payload), `grounding→active` (`grounding.resumed`), `grounding→abandoned` (`grounding.stopped`); illegal transitions return `{ ok: false, error: { code: 'INVALID_TRANSITION', message: '...' } }`; zero imports from `packages/supabase`, `packages/sync`, `react-native`, or `expo-*`; co-located `session-state-machine.test.ts` covers all legal transitions and all illegal transitions

7. **Session recovery modal**
   Given the app launches and `KV_KEYS.SESSION_IN_PROGRESS(userId)` returns a non-null JSON string in MMKV
   When `(app)/_layout.tsx` mounts and `isAuthenticated` is true
   Then a `Modal` (presentationStyle `'overFullScreen'`, animationType `'fade'`) renders above `<Tabs>` with `t('session.recovery.title')`, `t('session.recovery.body')`, Resume CTA (`router.push('/session/active?sessionId=X&fearItemId=Y&description=Z&preSuds=N')` — all params from parsed `SessionRecoveryData`) and End CTA (marks session `abandoned`, enqueues `exposure_sessions` UPDATE with `status: 'abandoned'` and `ended_at`, enqueues `fear_ladder_items` UPDATE restoring `status: 'pending'` using `fearItemId` from parsed `SessionRecoveryData`, clears `SESSION_IN_PROGRESS` MMKV key, dismisses modal); modal is NOT shown during loading (`isLoading === true`); if JSON parsing fails (corrupt key), clear the key silently and do not show the modal

8. **Session start from ladder rung**
   Given the user taps "Start session" on a `pending` ladder item in `apps/mobile/app/ladder.tsx`
   When the session flow begins
   Then a client-generated `sessionId` (UUID) is generated; navigation proceeds to `/session/intent` with params `{ fearItemId, sessionId, description, predictedSuds }`; the "Start session" button is only rendered for items with `status === 'pending'`; tapping the item description/body still opens the edit form (unchanged from Story 5.1)

9. **Pre-session intention screen (intent.tsx)**
   Given the user is on `/session/intent`
   When the screen renders
   Then pre-exposure SUDS input is shown using the SUDS scale (0–10) — `SudsScale` component renders 11 buttons (0–10 integers), labels shown only at even values (0=completely calm, 2=very mild, 4=mild, 6=moderate, 8=severe, 10=worst imaginable) — required UX-DR; the "Continue" button is disabled until a SUDS value is selected; screen state is managed via `useReducer` with `IntentState = { preSuds: number | null; intentionText: string; hasAttemptedSubmit: boolean; isSubmitting: boolean }`; an optional intention text field is shown with label `t('session.intent.sudsLabel')` above the scale; the text field label is `t('session.intent.intentionPrompt')` and its TextInput `placeholder` prop is `t('session.intent.intentionPlaceholder')`; `t('session.intent.intentionRecommended')` shown when `parseInt(predictedSuds) ≥ 7`; on "Continue": (a) if intention text written, stored in MMKV under `KV_KEYS.SESSION_INTENTION(sessionId)`, (b) enqueue `exposure_sessions` INSERT with `status: 'started'`, `fear_item_id`, `session_type: 'erp'`, `started_at`, (c) enqueue `suds_readings` INSERT for pre-exposure reading, (d) enqueue `fear_ladder_items` UPDATE `status: 'in_progress'` with `last_write_wins` timestamp guard, (e) write `KV_KEYS.SESSION_IN_PROGRESS(userId) = JSON.stringify({ sessionId, fearItemId, preSuds, description })` to MMKV (full `SessionRecoveryData` blob), (f) `SessionStateMachine` transitions `idle→pre_session` via `session.started` event, (g) navigate to `/session/pause` with params `{ sessionId, fearItemId, description, preSuds }`

10. **Deliberate pause screen (pause.tsx)**
    Given the user is on `/session/pause`
    When the screen renders
    Then `t('session.pause.title')` and `t('session.pause.body')` are shown; a single "I'm ready to begin" CTA is present (`t('session.pause.begin')`); there is NO back button (forward-only: this screen is non-skippable per UX spec); on "I'm ready": `SessionStateMachine` transitions `pre_session→active` via `exposure.begun` event, navigate to `/session/active` with params `{ sessionId, fearItemId, description, preSuds }`

11. **Active session screen (active.tsx)**
    Given the user is on `/session/active`
    When the session is active
    Then the fear item description is shown (from params); a "Log how I'm feeling" CTA opens a SUDS logging modal (same SUDS scale with full anchors — 11 buttons, 0–10, labels on even values); each SUDS log creates an enqueue `suds_readings` INSERT; local `sudsReadingsCount` (useState, initialised to `1` — the pre-session reading written in intent.tsx counts) is incremented on each log; a "Stop Exposure" button triggers `active→grounding` transition via `exposure.stopped` event and navigates to `/session/grounding?sessionId=X&fearItemId=Y&preSuds=N` (fearItemId required for grounding abandonment); `CalmMeButton` is accessible at all times on this screen via `router.push('/calm-me')` (UX-DR04); NFR-PERF-02: SUDS log `enqueue()` must return in < 500ms (stub adapter satisfies this trivially; document as performance invariant for Epic 6)

12. **Grounding screen (grounding.tsx) — complete at MVP, no stubs**
    Given the user is on `/session/grounding`
    When the grounding screen renders
    Then `t('session.grounding.affirmation')` is displayed as a courage affirmation; `t('session.grounding.breathingPrompt')` is displayed as the guided breathing prompt; two CTAs: `t('session.grounding.resume')` ("I can keep going") which dispatches `grounding.resumed` event and uses `router.replace('/session/active?...')` (replace, not push — keeps stack flat, back from resumed active goes to pause); `t('session.grounding.confirmStop')` ("I need to stop") which dispatches `grounding.stopped` event and executes the abandonment flow; there is NO back navigation from this screen (forward-only grounding — therapeutic decision per UX spec; `headerShown: false`, no BackButton); NO `// STUB`, `// TODO`, or `// Epic 7` comments in this file — it ships as a complete, clinically sufficient implementation; Epic 7 Story 7.5 adds the full technique picker separately

13. **Abandonment flow**
    Given the user taps "I need to stop" on the grounding screen
    When abandonment executes
    Then `exposure_sessions.status` is enqueued as `'abandoned'`; `ended_at` is included (client-computed ISO timestamp via `new Date().toISOString()`); `fear_ladder_items.status` is enqueued back to `'pending'` with a `last_write_wins` timestamp guard (`updatedAt: Date.now()`); `KV_KEYS.SESSION_IN_PROGRESS(userId)` is cleared from MMKV; `KV_KEYS.SESSION_INTENTION(sessionId)` is cleared from MMKV; navigate to `/session/abandoned`; `t('session.abandoned.message')` is shown — copy to be written by product, companioned tone; `CalmMeButton` accessible (UX-DR04)

---

## Tasks / Subtasks

### T1 — Database migrations (AC: 1, 2, 3, 4)

- [x] T1.1: Create `supabase/migrations/0015_rename_actual_suds_to_peak_suds.sql`:
  ```sql
  ALTER TABLE public.fear_ladder_items RENAME COLUMN actual_suds TO peak_suds;
  COMMENT ON COLUMN public.fear_ladder_items.peak_suds IS 'Peak distress reached during completed session. Set by session completion enqueue (Story 5.2+). Renamed from actual_suds.';
  ```
  Verify CHECK constraint is preserved: `ALTER TABLE` column rename preserves constraints in PostgreSQL. Add `grep -r "actual_suds" packages/ apps/ supabase/` to confirm zero references remain (failing CI step).

- [x] T1.2: Create `supabase/migrations/0016_exposure_sessions.sql` — full schema (see Dev Notes §Schema Definitions)

- [x] T1.3: Create `supabase/migrations/0017_suds_readings.sql` — full schema (see Dev Notes §Schema Definitions)

- [x] T1.4: Create `supabase/migrations/0018_set_session_expires_at_trigger.sql` — trigger (see Dev Notes §Schema Definitions)

### T2 — PowerSync schema update (AC: 1)

- [x] T2.1: Edit `packages/sync/src/schema.ts` — rename `actual_suds: column.integer` to `peak_suds: column.integer` in `fear_ladder_items`; add `exposure_sessions` and `suds_readings` tables:
  ```typescript
  const exposure_sessions = new Table({
    user_id: column.text,
    fear_item_id: column.text,
    session_type: column.text,
    status: column.text,
    pre_session_intention: column.text,
    post_session_reflection: column.text,
    started_at: column.text,
    ended_at: column.text,
    expires_at: column.integer,  // bigint → integer in PowerSync schema
    created_at: column.text,
  })

  const suds_readings = new Table({
    session_id: column.text,
    suds_value: column.integer,
    recorded_at: column.text,
  })
  ```
  Update `AppSchema` to include all three tables. Note: PowerSync schema omits computed/trigger-set fields (`expires_at` is included for read but never written client-side).

- [x] T2.2: Create/update `supabase/sync-rules.yaml` — if this file does not yet exist, create it as a placeholder that Epic 6 will complete. Add entries for `exposure_sessions` (sync where `user_id = token_parameters.user_id`) and `suds_readings` (sync via `exposure_sessions` join). Document `peak_suds` as the current column name for `fear_ladder_items`. The sync rules file format is PowerSync's YAML schema — see PowerSync docs. Since the adapter is still a stub, this file is preparatory for Epic 6.

### T3 — packages/core: domain types and state machine (AC: 1, 6)

- [x] T3.1: Edit `packages/core/src/selectors/fearLadder.ts` — add `peakSuds: number | null` to `FearLadderItem` interface:
  ```typescript
  export interface FearLadderItem extends FearLadderItemSummary {
    status: string
    peakSuds: number | null  // renamed from actual_suds; set on session completion
  }
  ```

- [x] T3.2: Create `packages/core/src/types/exposureSession.ts`:
  ```typescript
  // ARC-001: zero imports from react-native, expo-*, or @supabase/*
  export interface ExposureSession {
    id: string
    userId: string
    fearItemId: string | null
    sessionType: 'erp'
    status: 'started' | 'completed' | 'abandoned'
    preSessionIntention: string | null
    postSessionReflection: string | null
    startedAt: string        // ISO 8601 UTC
    endedAt: string | null   // ISO 8601 UTC; always in enqueue on end
    expiresAt: number | null // epoch ms; server-set only
    createdAt: string
  }
  ```

- [x] T3.3: Create `packages/core/src/types/sudsReading.ts`:
  ```typescript
  // ARC-001: zero imports from react-native, expo-*, or @supabase/*
  export interface SudsReading {
    id: string
    sessionId: string
    sudsValue: number  // 0–10 integer
    recordedAt: string // ISO 8601 UTC
  }
  ```

- [x] T3.4: Create `packages/core/src/erp/session-state-machine.ts` — see Dev Notes §SessionStateMachine Implementation (note: file lives in `erp/`, filename is kebab-case)

- [x] T3.5: Update `packages/core/src/constants/kvKeys.ts` — add session MMKV keys:
  ```typescript
  SESSION_IN_PROGRESS: (userId: string) => `session:in_progress:${userId}`,
  SESSION_INTENTION:   (sessionId: string) => `session:intention:${sessionId}`,
  ```
  User-scoped: `SESSION_IN_PROGRESS` includes userId so multi-account devices don't collide. **Value is a JSON-serialised `SessionRecoveryData` blob** (`{ sessionId, fearItemId, preSuds, description }`) — NOT a bare sessionId string. Read via `JSON.parse(mmkv.getString(...))` with try/catch; corrupt = clear and ignore. Session-scoped: `SESSION_INTENTION` includes sessionId; cleared on abandonment and completion enqueue.

- [x] T3.6: Update `packages/core/src/index.ts` — export `ExposureSession`, `SudsReading`, `SessionRecoveryData`, `SessionState`, `SessionEvent`, `transition` from erp module; export updated `FearLadderItem`; export `Result`, `AppError` from types

### T4 — RLS tests (AC: 5)

- [x] T4.1: Create `packages/supabase/__tests__/rls/exposure_sessions.test.ts` — 4 assertions (see Dev Notes §RLS Test Pattern)

- [x] T4.2: Create `packages/supabase/__tests__/rls/suds_readings.test.ts` — 4 assertions (see Dev Notes §RLS Test Pattern)

### T5 — Session screens: `apps/mobile/app/session/` (AC: 7–13)

- [x] T5.1: Create `apps/mobile/app/session/_layout.tsx` — Stack layout with `screenOptions={{ headerShown: false }}`; add `<Stack.Screen name="active" options={{ headerShown: false, gestureEnabled: false }} />`, `<Stack.Screen name="grounding" options={{ headerShown: false, gestureEnabled: false }} />`, and `<Stack.Screen name="pause" options={{ headerShown: false, gestureEnabled: false }} />` to block back gesture on non-skippable screens (active has no back navigation during session per AC11; grounding and pause are forward-only per UX spec)

- [x] T5.2: Register `session` segment in `apps/mobile/app/_layout.tsx` — add `<Stack.Screen name="session" options={{ headerShown: false }} />` alongside `ladder` and `calm-me` entries (same comment/pattern)

- [x] T5.3: Create `apps/mobile/app/session/intent.tsx` — see Dev Notes §Screen Implementations

- [x] T5.4: Create `apps/mobile/app/session/pause.tsx` — see Dev Notes §Screen Implementations

- [x] T5.5: Create `apps/mobile/app/session/active.tsx` — see Dev Notes §Screen Implementations

- [x] T5.6: Create `apps/mobile/app/session/grounding.tsx` — see Dev Notes §Screen Implementations

- [x] T5.7: Create `apps/mobile/app/session/abandoned.tsx` — see Dev Notes §Screen Implementations

### T6 — Session recovery modal in `(app)/_layout.tsx` (AC: 7)

- [x] T6.1: Update `apps/mobile/app/(app)/_layout.tsx` — add MMKV session recovery check on mount (reads `KV_KEYS.SESSION_IN_PROGRESS(userId)` synchronously via MMKV); render recovery `Modal` above `<Tabs>` when found; modal stays visible until dismissed (see Dev Notes §Recovery Modal Implementation)

### T7 — Ladder screen update (AC: 8)

- [x] T7.1: Update `apps/mobile/app/ladder.tsx` — add "Start session" inline CTA to item rows; only rendered for `item.status === 'pending'` items; generates UUID and navigates to `/session/intent`; pressing the main item body still opens the edit form (unchanged); see Dev Notes §Ladder "Start Session" Affordance

- [x] T7.2: In `ladder.tsx` "Start session" `onPress` handler — before generating UUID, read `mmkv.getString(KV_KEYS.SESSION_IN_PROGRESS(userId))` synchronously; if non-null (a session is already in progress), do NOT navigate to `/session/intent` — instead trigger the recovery modal (via shared state or navigation). This prevents orphaned `in_progress` ladder items when a user backs out of intent and taps Start again.

### T8 — i18n keys (AC: 9–13)

- [x] T8.1: Add to `apps/mobile/src/i18n/locales/en.json` under new top-level `"session"` key — see Dev Notes §i18n Keys

- [x] T8.2: Add same keys to `apps/mobile/src/i18n/locales/hi.json` (English text as placeholders — same pattern as all prior stories)

### T9 — Unit tests (AC: 6, 9–13)

- [x] T9.1: Create `packages/core/src/erp/session-state-machine.test.ts` — see Dev Notes §Test Specifications (co-located with session-state-machine.ts in erp/)

- [x] T9.2: Create session screen tests — see Dev Notes §Test Specifications

### T10 — CI gates

- [x] T10.1: `pnpm turbo typecheck` passes with zero errors
- [x] T10.2: `pnpm turbo lint` passes with zero errors
- [x] T10.3: `pnpm turbo test` passes — all new tests green; no regressions in existing 107 Jest + 17 Vitest tests
- [x] T10.4: `grep -r "actual_suds" packages/ apps/ supabase/migrations/ | grep -v "0015_rename"` returns zero results

---

### Review Findings

> Pre-implementation spec audit — 2026-06-04. 8 decisions needed, 15 patches, 4 deferred. Reviewed by bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor).

#### Decisions Resolved (2026-06-04 party mode)

- [x] [Review][Decision→Patch] **D1 — Recovery modal MMKV context insufficient** — Both the Resume CTA (needs fearItemId, description, preSuds to push to /session/active) and the End CTA (needs fearItemId to restore fear_ladder_items.status to 'pending') require data not stored in MMKV. Only sessionId is stored. Must decide: (a) store fearItemId+preSuds in MMKV alongside sessionId at intent Continue time, (b) skip fear_ladder_items restore on End from recovery (accept the item stays 'in_progress'), or (c) query PowerSync for session data on recovery. [AC7 / session/(app)/_layout.tsx]

- [x] [Review][Decision→Patch] **D2 — SudsScale: 11 buttons (0–10), labels at even values only** ✅ Resolved: 11 buttons — Spec says "anchors at even numbers only" but doesn't specify if odd values (1,3,5,7,9) are selectable. schema CHECK permits 0–10 integers. Two designs: render 6 radio buttons (even values only, halved granularity) or render 11 buttons with labels at even numbers only (full granularity, 5 unlabelled buttons). Clinical decision required. [AC9, AC11 / SudsScale.tsx]

- [x] [Review][Decision→Patch] **D3 — sudsReadingsCount: useState(1)** ✅ Resolved: useState, initialise to 1 — Active session is a crash-recovery scenario (SESSION_IN_PROGRESS exists for this purpose). sudsReadingsCount drives the COMPLETE_SESSION guard in Story 5.3. Using useState means the count is lost on app crash/backgrounding; guard cannot be enforced correctly on recovery. Architecture mandates useReducer for multi-step ERP flows where state must serialize to MMKV. Must decide: (a) use useReducer + persist count in MMKV at each increment, or (b) accept the gap (pre-session reading always satisfies ≥1 guard on recovery). [AC6, AC11 / active.tsx]

- [x] [Review][Decision→Patch] **D4 — Grounding→active RESUME: router.replace** ✅ Resolved: router.replace — Spec updated: AC12 and grounding.tsx use router.replace (not push) for Resume to keep stack flat. Back from re-entered active goes to pause (correct forward-only flow). [AC12 / grounding.tsx]

- [x] [Review][Decision→Patch] **D5 — No guard against starting a second session while SESSION_IN_PROGRESS is set** ✅ Resolved: block Start session (option a) — T7.2 added: ladder.tsx "Start session" handler reads SESSION_IN_PROGRESS synchronously before generating UUID; if non-null, shows recovery modal instead of navigating to /session/intent. [AC8 / ladder.tsx / T7.2]

- [x] [Review][Decision→Patch] **D6 — SessionEvent naming: renamed to domain.verb past tense** ✅ Resolved: rename now (option a) — All spec references updated: `session.started`, `exposure.begun`, `exposure.stopped`, `session.completed`, `grounding.resumed`, `grounding.stopped`. AC6, all screen code blocks, and all test specs updated. [AC6 / SessionStateMachine, all tests]

- [x] [Review][Decision→Patch] **D7 — SESSION_IN_PROGRESS MMKV key scope: user-scoped, read after auth hydration** ✅ Resolved: user-scoped key (option a) — Key remains `session:in_progress:${userId}`; recovery modal in `(app)/_layout.tsx` reads after `isAuthenticated` is confirmed (not at cold-start). ADR-004 cold-start reads static keys only; user-scoped session key read is gated on auth. Single-account-per-device target makes collision risk negligible. [AC7 / ADR-004 / kvKeys.ts]

- [x] [Review][Decision→Patch] **D8 — intent.tsx: useReducer with hasAttemptedSubmit** ✅ Resolved: useReducer (option a) — Architecture mandate applied; AC9 and intent.tsx spec updated with `IntentState = { preSuds: number | null; intentionText: string; hasAttemptedSubmit: boolean; isSubmitting: boolean }`. [AC9 / intent.tsx]

#### Patches (spec corrections — no human decision required)

- [x] [Review][Patch] **P1 — AC4 trigger timing: "BEFORE UPDATE"** ✅ Applied — AC4 updated. [AC4 / migration 0018]

- [ ] [Review][Patch] **P2 — pre_session_intention in exposure_sessions INSERT enqueue** — AC9 step (b) omits `pre_session_intention` from the INSERT payload. Recommended resolution: include `pre_session_intention: state.intentionText || null` in the INSERT at intent Continue time — text is available right then. Alternative: leave null in INSERT and have Story 5.3 UPDATE it from MMKV on session completion. Developer must choose and implement; the MMKV SESSION_INTENTION key exists for the Story 5.3 path. [AC9 / intent.tsx enqueue payload]

- [x] [Review][Patch] **P3 — SESSION_INTENTION cleared on abandonment** ✅ Applied — AC13 updated; abandonment flow now clears both SESSION_IN_PROGRESS and SESSION_INTENTION. [AC13 / grounding.tsx]

- [x] [Review][Patch] **P4 — Active screen gestureEnabled: false added to T5.1** ✅ Applied — T5.1 updated to include `<Stack.Screen name="active" options={{ headerShown: false, gestureEnabled: false }} />`. [AC11 / session/_layout.tsx]

- [x] [Review][Patch] **P5 — fearItemId added to active→grounding navigation push** ✅ Applied — AC11 and active.tsx code updated; grounding URL now includes `fearItemId=Y`. [AC11, AC13 / active.tsx → grounding.tsx]

- [x] [Review][Patch] **P6 — T10.4 grep command corrected** ✅ Applied — T10.4 now uses `| grep -v "0015_rename"` exclude. [T10.4 / T1.1]

- [x] [Review][Patch] **P7 — AC2: "three policies"** ✅ Applied — AC2 updated to "three policies." [AC2]

- [x] [Review][Patch] **P8 — sudsLabel and intentionPlaceholder both wired in AC9** ✅ Applied — AC9 updated: sudsLabel is the label above SudsScale; intentionPlaceholder is the TextInput placeholder prop. [T8.1 / intent.tsx]

- [x] [Review][Patch] **P9 — Test baseline corrected** ✅ Applied — "~40 Vitest (7+ suites)" in Dev Notes §Test Baseline. [Dev Notes §Test Baseline]

- [x] [Review][Patch] **P10 — Mapper files added to file list and tasks** ✅ Applied — All 4 mapper files added to File List; task T11 group added. [Architecture: New entity transform checklist]

- [x] [Review][Patch] **P11 — SessionStateMachine.ts → session-state-machine.ts (kebab-case)** ✅ Applied — All spec references updated to kebab-case. [Architecture: Naming Patterns / file list / T3.4 / T9.1]

- [x] [Review][Patch] **P12 — SessionStateMachine directory: src/erp/**  ✅ Applied — All spec references moved from `packages/core/src/session/` to `packages/core/src/erp/`. [Architecture: packages/core internal structure / file list / T3.4, T3.5, T3.6, T9.1]

- [x] [Review][Patch] **P13 — Domain type filenames → kebab-case** ✅ Applied — `exposure-session.ts`, `suds-reading.ts` in file list. [Architecture: Naming Patterns / file list / T3.2, T3.3]

- [ ] [Review][Patch] **P14 — DPDPA consent check before health data writes** — Architecture MUST rule: "Check consent via packages/supabase helpers before any data write." Both exposure_sessions and suds_readings are Health data (ADR-008). Note: no `checkConsent()` helper exists yet in `packages/supabase` — only `ConsentRecordService` (writes, not checks). Consent is established at onboarding (OTP flow), so `isAuthenticated` is the current proxy. Dev action: (a) check if a consent-check helper has been added to `packages/supabase` before implementing, or (b) gate the Continue handler on `isAuthenticated` explicitly with a comment citing this rule, consistent with prior stories (ladder.tsx has no separate consent guard). [Architecture §MUST rules / ADR-008 / AC9]

- [x] [Review][Patch] **P15 — sudsLabel wired in intent.tsx** ✅ Applied — AC9 updated: `t('session.intent.sudsLabel')` shown above SudsScale. [AC9 / intent.tsx]

#### Deferred

- [x] [Review][Defer] **W1 — userId null race in recovery modal End CTA** [AC7] — deferred, edge-case auth expiry race; requires deeper auth lifecycle refactor out of scope for this story
- [x] [Review][Defer] **W2 — active→grounding crash gap: ended_at never set on intermediate crash** [AC11, AC13] — deferred, acknowledged; fixing requires persisting state at each navigation step; Epic 6 retry/recovery obligation
- [x] [Review][Defer] **W3 — Analytics events (session.started, session.abandoned) not specified** [Architecture §Analytics] — deferred, intentionally absent from story scope; add to Epic 6 or a dedicated analytics story
- [x] [Review][Defer] **W4 — sudsReadingsCount initial value ambiguity vs pre-session reading** — deferred, depends on D3 decision and Story 5.3 completion guard design; revisit when implementing active.tsx

---

## Dev Notes

### Critical Architecture Rules for This Story

- **packages/core boundary (ARC-001/ADR-001):** `SessionStateMachine`, `ExposureSession`, `SudsReading`, and the updated `FearLadderItem` all live in `packages/core`. Zero imports from `react-native`, `expo-*`, or `@supabase/*`. CI enforces this; the build will fail if violated.
- **No direct Supabase queries from app screens:** All writes go through `getAdapter().enqueue()` from `apps/mobile/src/sync/adapter.ts` (no-op stub, Epic 6 wires real connector).
- **`database.types.ts` boundary:** Never import from `packages/supabase/src/database.types.ts` outside `packages/supabase`. Do not reference it in `packages/core` or `apps/mobile`.
- **SyncAdapter only from apps/mobile:** `getAdapter()` is called only from screen/hook code in `apps/mobile`, never from `packages/core`.
- **`expires_at` is server-computed only:** The trigger sets it; never compute it client-side. The `ExposureSession` type has `expiresAt` but the enqueue payload for session create/update never includes it.
- **`ended_at` is client-computed ISO string:** Included in enqueue payload on session end (abandonment or completion). `new Date().toISOString()` is the correct value.

---

### Schema Definitions

**Migration 0016: `exposure_sessions`**
```sql
CREATE TABLE IF NOT EXISTS public.exposure_sessions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fear_item_id          UUID        REFERENCES public.fear_ladder_items(id) ON DELETE SET NULL,
  session_type          TEXT        NOT NULL DEFAULT 'erp' CHECK (session_type IN ('erp')),
  status                TEXT        NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  pre_session_intention TEXT,
  post_session_reflection TEXT,
  started_at            TIMESTAMPTZ DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  expires_at            BIGINT,     -- epoch ms; set by trigger on completion; never client-set
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Composite index for RLS subquery performance (suds_readings policy joins here)
CREATE INDEX idx_exposure_sessions_user_id_id ON public.exposure_sessions (user_id, id);

ALTER TABLE public.exposure_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exposure_sessions_select_own"
  ON public.exposure_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exposure_sessions_insert_own"
  ON public.exposure_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exposure_sessions_update_own"
  ON public.exposure_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No DELETE policy — sessions are never deleted by the app

COMMENT ON TABLE public.exposure_sessions IS
  'ERP exposure session records. expires_at set by set_session_expires_at trigger on completion (6h window). Clinician read policy deferred to Story 5.4.';
```

**Migration 0017: `suds_readings`**
```sql
CREATE TABLE IF NOT EXISTS public.suds_readings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID    NOT NULL REFERENCES public.exposure_sessions(id) ON DELETE CASCADE,
  suds_value  INT     NOT NULL CHECK (suds_value >= 0 AND suds_value <= 10),
  recorded_at TIMESTAMPTZ DEFAULT now()
  -- NO user_id column: access controlled via session_id → exposure_sessions join
);

ALTER TABLE public.suds_readings ENABLE ROW LEVEL SECURITY;

-- RLS via join: user can read/write readings for sessions they own
CREATE POLICY "suds_readings_own_session"
  ON public.suds_readings FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.exposure_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.exposure_sessions WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.suds_readings IS
  'Distress readings logged during an ERP session. user_id deliberately absent — access via exposure_sessions FK (see RLS policy). Story 5.3 records debrief (final) reading.';
```

**Migration 0018: `set_session_expires_at` trigger**
```sql
CREATE OR REPLACE FUNCTION public.set_session_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.expires_at := EXTRACT(EPOCH FROM now())::bigint * 1000 + 21600000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_expires_at
  BEFORE UPDATE ON public.exposure_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_session_expires_at();
```

---

### SessionStateMachine Implementation

```typescript
// packages/core/src/session/SessionStateMachine.ts
// ARC-001: zero imports from react-native, expo-*, or @supabase/*

import type { Result } from '../types/result'  // create if not exists — see below

export type SessionState =
  | 'idle'
  | 'pre_session'
  | 'active'
  | 'grounding'
  | 'completed'
  | 'abandoned'

// Event types use domain.verb past tense (architecture naming rule).
// These are FSM command inputs; the convention matches domain events per the architecture doc.
export type SessionEvent =
  | { type: 'session.started' }
  | { type: 'exposure.begun' }
  | { type: 'exposure.stopped' }
  | { type: 'session.completed'; sudsReadingsCount: number }  // guard: count ≥ 1
  | { type: 'grounding.resumed' }
  | { type: 'grounding.stopped' }

const TRANSITIONS: Record<SessionState, Partial<Record<SessionEvent['type'], SessionState | ((event: SessionEvent) => SessionState | null)>>> = {
  idle:        { 'session.started': 'pre_session' },
  pre_session: { 'exposure.begun': 'active' },
  active: {
    'exposure.stopped': 'grounding',
    'session.completed': (e) => {
      const ev = e as Extract<SessionEvent, { type: 'session.completed' }>
      return ev.sudsReadingsCount >= 1 ? 'completed' : null
    },
  },
  grounding:  { 'grounding.resumed': 'active', 'grounding.stopped': 'abandoned' },
  completed:  {},
  abandoned:  {},
}

export function transition(
  currentState: SessionState,
  event: SessionEvent,
): Result<SessionState> {
  const handler = TRANSITIONS[currentState]?.[event.type]
  if (!handler) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `No transition from '${currentState}' on '${event.type}'`,
      },
    }
  }
  const nextState = typeof handler === 'function' ? handler(event) : handler
  if (!nextState) {
    return {
      ok: false,
      error: {
        code: 'TRANSITION_GUARD_FAILED',
        message: `Transition from '${currentState}' on '${event.type}' failed guard`,
      },
    }
  }
  return { ok: true, value: nextState }
}
```

**`Result` type:** Check if `packages/core/src/types/result.ts` exists. If not, create it:
```typescript
// packages/core/src/types/result.ts
export type AppError = {
  code: string
  message: string
  context?: { [key: string]: string | number | undefined }
}
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```
This matches the `Result` pattern defined in `implementation-patterns-consistency-rules.md §Error handling`. Export from `packages/core/src/index.ts`.

---

### SUDS Scale Component (reuse vs. new)

**Existing:** `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` shows anchors at 0, 5, 10 only — INSUFFICIENT for session use.

**UX Requirement (FR-SUDS-ANCHOR-01):** Session SUDS must show the **full static anchor set** inline at even values.

**Decision:** Create a new `apps/mobile/src/components/session/SudsScale.tsx`. Do NOT modify `SudsCalibrationWidget`.

**`SudsScale` renders 11 buttons (values 0–10 inclusive).** Labels (i18n keys) are shown only at even values; odd values (1,3,5,7,9) display only their number with no anchor text. This matches clinical SUDS granularity (0–10 integer scale) while keeping the even anchors as the primary reference points.

`SudsScale` props: `{ value: number | null; onChange: (v: number) => void }`. i18n keys for anchor labels: `session.suds.anchor0`, `.anchor2`, `.anchor4`, `.anchor6`, `.anchor8`, `.anchor10`.

Tests for `SudsScale`:
- Renders exactly 11 selectable buttons
- `onChange` called with the exact tapped value (including odd values like 3, 7)
- Buttons at odd positions have no anchor label rendered
- Selected value gets active/filled style

---

### Screen Implementations

#### Navigation Parameter Convention

All session screens receive params via `useLocalSearchParams()`. Params are strings; parse numbers with `parseInt`. Never trust param types — validate on use.

Common params:
- `sessionId: string` — UUID generated in `ladder.tsx` before navigating
- `fearItemId: string` — the ladder item's UUID
- `description: string` — fear item description (URL-encoded by router)
- `predictedSuds: string` — predicted SUDS integer as string
- `preSuds: string` — pre-exposure SUDS integer as string (added after intent screen)

**UUID generation:** Copy `generateUUID()` from `apps/mobile/app/ladder.tsx` — same pure-JS pattern. Do NOT use `crypto.randomUUID()` (Hermes limitation).

#### `session/intent.tsx`

```typescript
// State: useReducer with IntentState
// type IntentState = {
//   preSuds: number | null      // gates Continue button
//   intentionText: string       // optional, max 500 chars
//   hasAttemptedSubmit: boolean // validation fires on blur only when true
//   isSubmitting: boolean       // prevents double-tap on Continue
// }
//
// Key behaviors:
// 1. Read fearItemId, description, predictedSuds, sessionId from useLocalSearchParams()
// 2. Show t('session.intent.sudsLabel') above SudsScale; show fear item description as context
// 3. SudsScale (11 buttons) for pre-exposure SUDS (required — gates Continue button)
// 4. Optional intention TextInput (multiline, max 500 chars) — t('session.intent.intentionPrompt')
// 5. Show t('session.intent.intentionRecommended') when parseInt(predictedSuds) >= 7
// 6. "Continue" button disabled until preSuds selected (preSuds === null)
// 7. On Continue (dispatch SUBMITTING, set isSubmitting: true):
//    a. if intentionText.trim(): mmkv.set(KV_KEYS.SESSION_INTENTION(sessionId), intentionText.trim())
//    b. enqueue exposure_sessions INSERT
//    c. enqueue suds_readings INSERT (pre-exposure reading)
//    d. enqueue fear_ladder_items UPDATE status → 'in_progress'
//    e. mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(userId), JSON.stringify({ sessionId, fearItemId, preSuds, description }))
//    f. dispatch session.started event — SessionStateMachine transitions idle→pre_session
//    g. router.push('/session/pause?sessionId=...&fearItemId=...&description=...&preSuds=...')
// 8. No back button suppression on this screen (user can back out before starting)
// 9. Header: t('session.intent.title'), BackButton
```

**MMKV access:** Use `useAuth()` to get the mmkv instance. AuthProvider exposes it via `useAuth()` hook. Check the `useAuth()` return type — if MMKV is not directly exposed, access it via the `AuthProvider`'s `mmkv` prop which is passed in as `MMKV | null | undefined`. Look at how `session.ts` or `AuthProvider.tsx` accesses MMKV and follow that pattern.

**Enqueue payloads:**
```typescript
// exposure_sessions INSERT
await getAdapter().enqueue('exposure_sessions', 'INSERT', {
  id: sessionId,
  user_id: userId,
  fear_item_id: fearItemId,
  session_type: 'erp',
  status: 'started',
  started_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
})

// suds_readings INSERT (pre-exposure)
await getAdapter().enqueue('suds_readings', 'INSERT', {
  id: generateUUID(),
  session_id: sessionId,
  suds_value: preSuds,
  recorded_at: new Date().toISOString(),
})

// fear_ladder_items UPDATE — status → in_progress
await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
  id: fearItemId,
  status: 'in_progress',
  updated_at: new Date().toISOString(),
  updatedAt: Date.now(),  // last_write_wins timestamp guard (same pattern as Story 5.1)
})
```

#### `session/pause.tsx`

```typescript
// Key behaviors:
// 1. Read sessionId, fearItemId, description, preSuds from params
// 2. Show t('session.pause.title') and t('session.pause.body')
// 3. Single CTA: t('session.pause.begin')
// 4. headerShown: false — no back button (gestureEnabled: false set in _layout.tsx)
// 5. On begin: dispatch exposure.begun event (pre_session→active), navigate to /session/active with all params preserved
// 6. No MMKV write for this transition — SESSION_IN_PROGRESS already set in intent
```

#### `session/active.tsx`

```typescript
// Key behaviors:
// 1. Read sessionId, fearItemId, description, preSuds from params
// 2. Display fear item description as session context
// 3. SUDS log button opens Modal with SudsScale (11 buttons); on confirm: enqueue suds_readings INSERT
// 4. Track local SUDS readings count via useState, initialised to 1 (the pre-session reading
//    written in intent.tsx already counts). Increment on each in-session log.
//    Needed for COMPLETE_SESSION guard in Story 5.3.
// 5. "Stop Exposure" button → dispatch exposure.stopped event (active→grounding)
//    → router.push('/session/grounding?sessionId=...&fearItemId=...&preSuds=...')
//    (fearItemId MUST be included — grounding abandonment requires it)
// 6. CalmMeButton: TouchableOpacity with t('session.active.calmMe') → router.push('/calm-me')
//    positioned at bottom of screen, always visible without scrolling (UX-DR04)
// 7. headerShown: false, gestureEnabled: false (immersive; no back navigation during active session)
// 8. Note: completion flow (active→completed via session.completed event) is Story 5.3.
//    This screen ONLY handles the stop path.
```

**NFR-PERF-02:** Document in code: SUDS log `enqueue()` must complete in < 500ms. The no-op stub satisfies this; Epic 6 must verify with real adapter.

#### `session/grounding.tsx`

```typescript
// IMPORTANT: This screen ships as COMPLETE at MVP. No TODO, STUB, or Epic 7 comments.
// Epic 7 Story 7.5 adds the full technique picker as a SEPARATE screen/enhancement;
// this screen is NOT replaced — it is SUPPLEMENTED.
//
// Key behaviors:
// 1. Read sessionId, preSuds from params
// 2. Display: t('session.grounding.affirmation') — courage affirmation
// 3. Display: t('session.grounding.breathingPrompt') — guided breathing prompt
// 4. Two CTAs:
//    a. t('session.grounding.resume') → transition grounding→active → router.push('/session/active?...')
//    b. t('session.grounding.confirmStop') → execute abandonment flow → router.push('/session/abandoned')
// 5. NO back button, NO gesture-enabled back swipe (set in _layout.tsx Stack.Screen)
// 6. headerShown: false
//
// Abandonment flow (on confirmStop — grounding.stopped event):
//   a. const endedAt = new Date().toISOString()
//   b. enqueue exposure_sessions UPDATE { id: sessionId, status: 'abandoned', ended_at: endedAt }
//   c. enqueue fear_ladder_items UPDATE { id: fearItemId, status: 'pending', updated_at: endedAt, updatedAt: Date.now() }
//   d. mmkv.delete(KV_KEYS.SESSION_IN_PROGRESS(userId))
//   e. mmkv.delete(KV_KEYS.SESSION_INTENTION(sessionId))
//   f. router.push('/session/abandoned')
//
// Resume flow (on resume — grounding.resumed event):
//   → router.replace('/session/active?sessionId=...&fearItemId=...&description=...&preSuds=...')
//   (replace, NOT push — keeps stack flat; back from resumed active goes to pause, not grounding)
```

**Pass `fearItemId` and `userId` through to grounding:** Update navigation chain so `grounding.tsx` receives `fearItemId` as a param (needed for the fear_ladder_items status restore on abandonment). Also needs `userId` — use `useAuth().authState.userId`.

#### `session/abandoned.tsx`

```typescript
// Key behaviors:
// 1. No params needed (session state already cleaned up in grounding.tsx)
// 2. Display t('session.abandoned.message') — companioned, non-judgmental tone
// 3. CalmMeButton: TouchableOpacity → router.push('/calm-me') (UX-DR04)
// 4. "Return to ladder" or home CTA: router.push('/ladder') or router.replace('/(app)/index')
// 5. headerShown: false or with BackButton (user can navigate back normally from here)
```

---

### Recovery Modal Implementation

In `apps/mobile/app/(app)/_layout.tsx`, add session recovery check:

```typescript
// In AppLayout function, after auth check:
const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null)
const { authState } = useAuth()

// MMKV access: need to expose mmkv from useAuth() or access via AuthProvider
// Pattern: check existing AuthProvider/useAuth API for MMKV exposure
// If not exposed: derive from KV_KEYS.SESSION_IN_PROGRESS check via authState hook
// Fallback: add a useSessionRecovery() hook in apps/mobile/src/hooks/

useEffect(() => {
  if (isAuthenticated && authState.userId && !isLoading) {
    const stored = mmkv.getString(KV_KEYS.SESSION_IN_PROGRESS(authState.userId))
    if (stored) setRecoverySessionId(stored)
  }
}, [isAuthenticated, isLoading, authState.userId])

// MMKV access pattern from AuthProvider: check if useAuth() exposes `mmkv` or
// if there's a pattern from existing screens. If no direct MMKV access in screens,
// add a `getSessionInProgress(userId)` helper to packages/supabase/src/auth/session.ts
// that reads from the MMKV instance managed by the auth layer.
```

**Key challenge:** MMKV is managed by `AuthProvider` (which receives it as a prop). Screens currently do NOT have direct MMKV access — they only call higher-level auth hooks. For this recovery check, add a `useSessionRecovery()` hook in `apps/mobile/src/hooks/useSessionRecovery.ts` that reads from MMKV via the auth layer. Look at how `AuthProvider.tsx` exposes MMKV state and follow that pattern (e.g. add `getInProgressSession(userId)` to the auth context value, or read it in `AuthProvider` on init and expose via `useAuth()`).

**Simplest approach:** Add `sessionInProgressId: string | null` to `AuthContext`/`useAuth()` return value. AuthProvider reads `KV_KEYS.SESSION_IN_PROGRESS(userId)` on auth state change (same lifecycle as other MMKV reads) and exposes it. Screens consume via `useAuth().sessionInProgressId`.

The recovery Modal in `(app)/_layout.tsx`:
```tsx
<Modal
  visible={recoverySessionId !== null}
  transparent
  animationType="fade"
  presentationStyle="overFullScreen"
>
  <View style={recoveryStyles.overlay}>
    <View style={recoveryStyles.card}>
      <Text style={recoveryStyles.title}>{t('session.recovery.title')}</Text>
      <Text style={recoveryStyles.body}>{t('session.recovery.body')}</Text>
      <TouchableOpacity onPress={handleResume}>{t('session.recovery.resume')}</TouchableOpacity>
      <TouchableOpacity onPress={handleEnd}>{t('session.recovery.end')}</TouchableOpacity>
    </View>
  </View>
</Modal>
```

---

### Ladder "Start Session" Affordance

In `apps/mobile/app/ladder.tsx`, update `renderItem` to add "Start session" inline button:

```tsx
// Inside ScaleDecorator, alongside existing TouchableOpacity for item:
{item.status === 'pending' && (
  <TouchableOpacity
    onPress={() => {
      const sessionId = generateUUID()
      router.push(
        `/session/intent?fearItemId=${item.id}&sessionId=${sessionId}&description=${encodeURIComponent(item.description)}&predictedSuds=${item.predictedSuds}`
      )
    }}
    accessibilityRole="button"
    accessibilityLabel={`${t('ladder.startSession')}, ${item.description}`}
    style={styles.startSessionButton}
  >
    <Text style={styles.startSessionText}>{t('ladder.startSession')}</Text>
  </TouchableOpacity>
)}
```

Add `"startSession": "Start session"` to `en.json` under the existing `"ladder"` key. Add to `hi.json` likewise.

**Tapping body opens edit (unchanged):** The existing `onPress={() => openEditForm(item)}` on the main `TouchableOpacity` row is preserved. The "Start session" button is a NEW affordance alongside it — it does NOT replace the tap-to-edit behavior.

---

### RLS Test Pattern

Follow exactly the pattern in `packages/supabase/__tests__/rls/fear_ladder_items.test.ts` (already read). Both new test files must:
- Skip (`describe.skipIf(skipIfNoSupabase)`) when `SUPABASE_SERVICE_ROLE_KEY` or `ANON_KEY` not set
- Use `createClient<Database>(LOCAL_URL, SERVICE_ROLE_KEY)` as service client
- Use `createClient<Database>(LOCAL_URL, ANON_KEY)` + `signInWithPassword` as user client
- Use unique test user emails (e.g. `erp-rls-test-a@example.com`, `suds-rls-test-a@example.com`)
- Clean up users in `afterAll` via `serviceClient.auth.admin.deleteUser(userId)`

For `exposure_sessions.test.ts` — seed one `exposure_sessions` row for user A. Test [+] own-row read/write, [−] cross-user blocked, [−] unauthenticated blocked, [stub] clinician (user B with no therapist relationship) sees 0 rows.

For `suds_readings.test.ts` — seed one `exposure_sessions` for user A, then one `suds_readings` linked to it. Test [+] own-row read (user A reads own reading), [−] cross-user blocked (user B cannot read user A's readings), [−] unauthenticated blocked, [stub] clinician sees 0 rows.

Note: `suds_readings` RLS uses a subquery join — verify the policy is correctly enforced in the [−] cross-user test by attempting to insert/select a `suds_readings` row where the session belongs to another user.

---

### i18n Keys

Add to `apps/mobile/src/i18n/locales/en.json` under new top-level `"session"` key:

```json
"session": {
  "recovery": {
    "title": "You have an unfinished session",
    "body": "You were in the middle of an exposure. Would you like to resume where you left off?",
    "resume": "Resume session",
    "end": "End session"
  },
  "intent": {
    "title": "Before you begin",
    "sudsLabel": "How anxious do you feel right now?",
    "intentionPrompt": "Would you like to write yourself a note?",
    "intentionPlaceholder": "What do you expect to feel? What do you want to remember after?",
    "intentionRecommended": "Recommended when anxiety is 7 or above — it helps to have words to come back to.",
    "continue": "Continue"
  },
  "pause": {
    "title": "Take a moment",
    "body": "You're about to face something that takes courage. Take a slow breath before you begin.",
    "begin": "I'm ready to begin"
  },
  "active": {
    "title": "In session",
    "logSuds": "Log how I'm feeling",
    "sudsModalTitle": "How anxious are you right now?",
    "logButton": "Log",
    "stopExposure": "Stop exposure",
    "calmMe": "Need support?"
  },
  "grounding": {
    "affirmation": "You showed real courage by starting. Whatever you're feeling right now is okay.",
    "breathingPrompt": "Take three slow breaths. In through your nose, out through your mouth. Let your body settle.",
    "resume": "I can keep going",
    "confirmStop": "I need to stop"
  },
  "abandoned": {
    "message": "Stopping when you need to is an act of self-awareness. You can try again whenever you feel ready."
  },
  "suds": {
    "anchor0": "0 — Completely calm",
    "anchor2": "2 — Very mild",
    "anchor4": "4 — Mild",
    "anchor6": "6 — Moderate",
    "anchor8": "8 — Severe",
    "anchor10": "10 — Worst imaginable"
  }
}
```

Add `"startSession": "Start session"` to the existing `"ladder"` key object (alongside `"addItem"`, etc.).

All keys added to `hi.json` with English text as placeholders (identical pattern to all prior stories).

---

### Test Specifications

#### `session-state-machine.test.ts` (Vitest, packages/core — co-located in erp/)

```typescript
import { describe, it, expect } from 'vitest'
import { transition, type SessionState } from './session-state-machine'

// Legal transitions (all should return ok: true)
// idle → pre_session  ({ type: 'session.started' })
// pre_session → active  ({ type: 'exposure.begun' })
// active → grounding  ({ type: 'exposure.stopped' })
// active → completed  ({ type: 'session.completed', sudsReadingsCount: 1 })
// active → completed  ({ type: 'session.completed', sudsReadingsCount: 5 })
// grounding → active  ({ type: 'grounding.resumed' })
// grounding → abandoned  ({ type: 'grounding.stopped' })

// Guard failures (ok: false with TRANSITION_GUARD_FAILED)
// active → completed  ({ type: 'session.completed', sudsReadingsCount: 0 }) — guard fails

// Illegal transitions (all should return ok: false with INVALID_TRANSITION)
// idle → active  ({ type: 'exposure.begun' })
// idle → grounding  ({ type: 'exposure.stopped' })
// pre_session → grounding  ({ type: 'exposure.stopped' })
// active → idle  ({ type: 'session.started' })
// completed → any event
// abandoned → any event
// grounding → pre_session (any event except grounding.resumed/grounding.stopped)
```

#### Session screen tests (Jest, apps/mobile)

Create `apps/mobile/app/session/intent.test.tsx`, `active.test.tsx`, `grounding.test.tsx`.

Mock requirements:
```typescript
jest.mock('@exposure-buddy/supabase', () => ({ useAuth: jest.fn() }))
jest.mock('../../src/sync/adapter', () => ({ getAdapter: jest.fn() }))
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}))
```

**`intent.test.tsx` required cases:**
1. `renders pre-exposure SUDS scale with 11 buttons` — screen renders SudsScale; assert 11 selectable options
2. `Continue button disabled until SUDS selected` — button disabled before selection
3. `Continue button enabled after SUDS selected` — button enabled (including odd value e.g. 3)
4. `shows intention recommended hint when predictedSuds >= 7` — mock param `predictedSuds: '7'`; assert hint text visible
5. `does not show intention hint when predictedSuds < 7` — mock param `predictedSuds: '4'`; assert hint absent
6. `enqueues exposure_sessions INSERT on continue` — select SUDS, tap continue; assert `mockEnqueue` called with `('exposure_sessions', 'INSERT', expect.objectContaining({ status: 'started' }))`
7. `enqueues suds_readings INSERT on continue` — assert `mockEnqueue` called with `('suds_readings', 'INSERT', expect.objectContaining({ suds_value: selectedSuds }))`
8. `writes SessionRecoveryData JSON blob to MMKV on continue` — assert `mockMmkv.set` called with the SESSION_IN_PROGRESS key and a JSON string containing `sessionId`, `fearItemId`, `preSuds`, `description`
9. `navigates to /session/pause on continue` — assert `mockPush` called with expect.stringContaining('/session/pause')

**`active.test.tsx` required cases:**
1. `renders fear item description from params` — mock param `description: 'Test situation'`; assert text visible
2. `renders Stop Exposure button` — assert button present
3. `opens SUDS modal on log button press` — press log button; assert modal visible with 11 buttons
4. `enqueues suds_readings on log confirm` — select SUDS in modal (including odd value), confirm; assert enqueue called with exact value
5. `navigates to /session/grounding on stop with fearItemId param` — press Stop Exposure; assert navigation URL contains fearItemId
6. `renders CalmMe button` — assert calm-me CTA present
7. `CalmMe button navigates to /calm-me` — press; assert push('/calm-me')

**`grounding.test.tsx` required cases:**
1. `renders affirmation text` — assert `t('session.grounding.affirmation')` visible
2. `renders breathing prompt` — assert `t('session.grounding.breathingPrompt')` visible
3. `no back button rendered` — headerShown is false on this screen; assert no BackButton
4. `Resume uses router.replace (not push) to /session/active` — press resume; assert `mockReplace` called (not `mockPush`) with string containing '/session/active'
5. `Confirm Stop enqueues abandonment` — press confirmStop; assert enqueue called with `('exposure_sessions', 'UPDATE', expect.objectContaining({ status: 'abandoned' }))`
6. `Confirm Stop enqueues fear_ladder_items status reset` — assert enqueue called with `('fear_ladder_items', 'UPDATE', expect.objectContaining({ status: 'pending' }))`
7. `Confirm Stop clears SESSION_IN_PROGRESS and SESSION_INTENTION` — assert MMKV delete called for both keys
8. `Confirm Stop navigates to /session/abandoned` — assert router push to /session/abandoned

---

### File List (create or modify)

| File | Action | Notes |
|---|---|---|
| `supabase/migrations/0015_rename_actual_suds_to_peak_suds.sql` | CREATE | Rename column only |
| `supabase/migrations/0016_exposure_sessions.sql` | CREATE | Table + RLS + index |
| `supabase/migrations/0017_suds_readings.sql` | CREATE | Table + RLS |
| `supabase/migrations/0018_set_session_expires_at_trigger.sql` | CREATE | Trigger function + trigger |
| `supabase/sync-rules.yaml` | CREATE | PowerSync server config stub for Epic 6 |
| `packages/sync/src/schema.ts` | UPDATE | Rename `actual_suds`→`peak_suds`; add `exposure_sessions`, `suds_readings` tables |
| `packages/core/src/types/result.ts` | CREATE (if not exists) | `Result<T, E>` type |
| `packages/core/src/types/exposure-session.ts` | CREATE | `ExposureSession` domain type |
| `packages/core/src/types/suds-reading.ts` | CREATE | `SudsReading` domain type |
| `packages/core/src/types/session-recovery-data.ts` | CREATE | `SessionRecoveryData = { sessionId, fearItemId, preSuds, description }` |
| `packages/core/src/selectors/fearLadder.ts` | UPDATE | Add `peakSuds: number \| null` to `FearLadderItem` |
| `packages/core/src/erp/session-state-machine.ts` | CREATE | Pure state machine + domain.verb event types |
| `packages/core/src/erp/session-state-machine.test.ts` | CREATE | ~15 Vitest tests (co-located) |
| `packages/core/src/constants/kvKeys.ts` | UPDATE | Add `SESSION_IN_PROGRESS` (JSON blob value), `SESSION_INTENTION` |
| `packages/core/src/index.ts` | UPDATE | Export all new types, state machine, Result |
| `packages/supabase/__tests__/rls/exposure_sessions.test.ts` | CREATE | 4 RLS assertions |
| `packages/supabase/__tests__/rls/suds_readings.test.ts` | CREATE | 4 RLS assertions |
| `packages/supabase/src/mappers/exposure-session.mapper.ts` | CREATE | Bidirectional snake_case↔camelCase transform |
| `packages/supabase/src/mappers/suds-reading.mapper.ts` | CREATE | Bidirectional snake_case↔camelCase transform |
| `packages/supabase/__tests__/mappers/exposure-session.mapper.test.ts` | CREATE | Round-trip test |
| `packages/supabase/__tests__/mappers/suds-reading.mapper.test.ts` | CREATE | Round-trip test |
| `apps/mobile/src/components/session/SudsScale.tsx` | CREATE | Full-anchor SUDS scale (0,2,4,6,8,10) |
| `apps/mobile/app/session/_layout.tsx` | CREATE | Stack layout with gesture/header overrides |
| `apps/mobile/app/session/intent.tsx` | CREATE | Pre-session intention + SUDS screen |
| `apps/mobile/app/session/pause.tsx` | CREATE | Non-skippable pause screen |
| `apps/mobile/app/session/active.tsx` | CREATE | Active session with SUDS logging |
| `apps/mobile/app/session/grounding.tsx` | CREATE | Grounding screen (complete at MVP) |
| `apps/mobile/app/session/abandoned.tsx` | CREATE | Abandonment message screen |
| `apps/mobile/app/session/intent.test.tsx` | CREATE | 8 Jest tests |
| `apps/mobile/app/session/active.test.tsx` | CREATE | 7 Jest tests |
| `apps/mobile/app/session/grounding.test.tsx` | CREATE | 8 Jest tests |
| `apps/mobile/app/_layout.tsx` | UPDATE | Add `<Stack.Screen name="session">` entry |
| `apps/mobile/app/(app)/_layout.tsx` | UPDATE | Add session recovery modal |
| `apps/mobile/app/ladder.tsx` | UPDATE | Add "Start session" button per pending item |
| `apps/mobile/src/i18n/locales/en.json` | UPDATE | Add `session.*` and `ladder.startSession` keys |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATE | Same keys (EN placeholders) |

---

### Deferred Work Notes (do NOT implement in this story)

- **Rollback on optimistic enqueue failure** — already deferred from Story 5.1 (5-1-D1); same applies to session enqueues. Stub adapter never throws; rollback logic is an Epic 6 obligation.
- **Session completion flow** — Story 5.3. The `active.tsx` screen does NOT implement the completion path; only the stop/grounding path.
- **`active→completed` transition** — `COMPLETE_SESSION` event is defined in the state machine (AC 6) but not triggered from any screen in this story. Story 5.3 adds the completion CTA.
- **PowerSync live data for session state** — `useFearLadderItems` still returns `[]` stub. Session screens show fear item data from navigation params only. Epic 6 wires the real connector.
- **Clinician read policy** — Story 5.4 (deferred post-MVP). The `[stub]` RLS test assertion matches the `fear_ladder_items` pattern.
- **sync-rules.yaml** — PowerSync server config is not deployed with stub adapter. Create the file but treat it as a placeholder; Epic 6 configures and deploys it.

### Test Baseline

Story 5.1 shipped: 107 Jest (16 suites) + 17 Vitest (3 suites).

Story 5.2 adds:
- `session-state-machine.test.ts`: ~15 Vitest tests (1 suite)
- `exposure_sessions.test.ts`, `suds_readings.test.ts`: 4 Vitest tests each (2 suites — skip in CI without local Supabase)
- `exposure-session.mapper.test.ts`, `suds-reading.mapper.test.ts`: ~4 Vitest tests each (2 suites)
- `intent.test.tsx` (9 cases), `active.test.tsx` (7 cases), `grounding.test.tsx` (8 cases): ~24 Jest tests (3 suites)

New expected baseline: ~131 Jest (19 suites) + ~40 Vitest (7+ suites, RLS tests skip without local Supabase).

---

### Key Patterns from Prior Stories (Do Not Reinvent)

| Pattern | Source | Application |
|---|---|---|
| `generateUUID()` | `apps/mobile/app/ladder.tsx` | Copy exact function; do NOT use `crypto.randomUUID()` |
| `getAdapter().enqueue(table, operation, payload)` | `apps/mobile/app/ladder.tsx` | Session/SUDS enqueues follow identical pattern |
| `enqueue('table', 'UPDATE', { id, ..., updatedAt: Date.now() })` | Story 4.3/5.1 | `last_write_wins` timestamp guard on all UPDATE enqueues |
| `// eslint-disable-next-line i18next/no-literal-string` | `apps/mobile/app/ladder.tsx` | Non-translatable string literals (enum values, route paths) |
| `jest.clearAllMocks()` in `beforeEach` | All screen tests | Always included in session test files |
| `describe.skipIf(skipIfNoSupabase)` | `fear_ladder_items.test.ts` | Copy pattern verbatim for new RLS tests |
| `router.push('/calm-me')` | `apps/mobile/app/(app)/index.tsx` | CalmMe navigation; do NOT use `router.replace` (back must work) |
| `AccessibilityInfo.setAccessibilityFocus()` 100ms delay | `ladder.tsx`, `(app)/index.tsx` | Use on abandoned and active screens for initial focus |
| `styled.headerShown: false, gestureEnabled: false` | None yet | Apply in `session/_layout.tsx` for active, grounding, and pause screens |

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Typecheck pass 1: `peakSuds` missing in `packages/core/src/__tests__/selectors/fearLadder.test.ts` — fixed by adding `peakSuds: null` to `makeItem` factory.
- Typecheck pass 1: `(app)/_layout.tsx` import path `'../src/sync/adapter'` incorrect (file is in `app/(app)/`) — fixed to `'../../src/sync/adapter'`.
- Typecheck pass 1: `newItem` in `ladder.tsx` missing `peakSuds: null` in optimistic `FearLadderItem` object — added.
- Lint pass 1: `animationType="fade"` and `animationType="slide"` lacked `eslint-disable` comments — added.
- Lint pass 1: `SudsScale.tsx` missing `import React` — added.
- T10.4: `apps/mobile/app/(onboarding)/ladder.tsx` still referenced `actual_suds: null` in INSERT enqueue — renamed to `peak_suds: null`.

### Completion Notes List

- **T1:** 4 SQL migrations created: 0015 (rename column), 0016 (exposure_sessions table + RLS + index), 0017 (suds_readings table + RLS via join), 0018 (BEFORE UPDATE trigger setting expires_at = now + 6h in epoch ms).
- **T2:** PowerSync schema updated — `actual_suds` → `peak_suds` in `fear_ladder_items`; `exposure_sessions` and `suds_readings` tables added. `supabase/sync-rules.yaml` created as Epic 6 stub.
- **T3:** `packages/core` updated — `FearLadderItem.peakSuds`, `Result`/`AppError` types, `ExposureSession`, `SudsReading`, `SessionRecoveryData` domain types, `session-state-machine.ts` with 6 legal transitions + guard on `session.completed`, `KV_KEYS.SESSION_IN_PROGRESS`/`SESSION_INTENTION` added, all exported from `index.ts`.
- **T4:** RLS tests for `exposure_sessions` (4 assertions) and `suds_readings` (4 assertions) — skip when no local Supabase.
- **T5:** All 5 session screens created (`intent`, `pause`, `active`, `grounding`, `abandoned`) + `_layout.tsx` with `gestureEnabled: false` on forward-only screens. `session` segment registered in root `_layout.tsx`. `SudsScale` component created (11 buttons, even-value anchors via i18n).
- **T6:** Recovery modal added to `(app)/_layout.tsx` — reads `sessionRecoveryData` from `useAuth()` (new context value), shows `Modal` when non-null and not loading; Resume pushes to `/session/active`; End enqueues abandonment and clears MMKV.
- **T7:** `ladder.tsx` updated — "Start session" button on `pending` items; `sessionRecoveryData` guard prevents starting a second session; `actual_suds` → `peak_suds` in INSERT payload. Onboarding `ladder.tsx` also updated (`actual_suds` → `peak_suds`).
- **T8:** `session.*` and `ladder.startSession` keys added to both `en.json` and `hi.json` (EN text as hi.json placeholders).
- **T9:** 16 Vitest tests in `session-state-machine.test.ts` (all legal/illegal transitions + guard failure). 9 Jest tests in `intent.test.tsx`, 7 in `active.test.tsx`, 8 in `grounding.test.tsx`.
- **T10:** All CI gates pass — typecheck ✓, lint ✓, 132 Jest (19 suites) + ~50 Vitest (7 suites, RLS skipped without local Supabase) ✓.
- **T11 (P10 patch):** Mapper files created — `exposure-session.mapper.ts`, `suds-reading.mapper.ts` + round-trip tests for each.
- **AuthProvider:** Session MMKV helpers added (`sessionRecoveryData` state, `setSessionInProgress`, `clearSessionInProgress`, `setSessionIntention`, `clearSessionIntention`) — follows existing `setSudsCalibration` pattern; corrupt SESSION_IN_PROGRESS JSON cleared silently on auth state change.
- **P2 (dev action):** `pre_session_intention` included in `exposure_sessions` INSERT at intent Continue time (`state.intentionText || null`).
- **P14 (dev action):** Continue handler gated on `isAuthenticated` with comment citing DPDPA ADR-008 Health data rule.

### File List

| File | Action |
|---|---|
| `supabase/migrations/0015_rename_actual_suds_to_peak_suds.sql` | CREATED |
| `supabase/migrations/0016_exposure_sessions.sql` | CREATED |
| `supabase/migrations/0017_suds_readings.sql` | CREATED |
| `supabase/migrations/0018_set_session_expires_at_trigger.sql` | CREATED |
| `supabase/sync-rules.yaml` | CREATED |
| `packages/sync/src/schema.ts` | UPDATED |
| `packages/core/src/types/result.ts` | CREATED |
| `packages/core/src/types/exposure-session.ts` | CREATED |
| `packages/core/src/types/suds-reading.ts` | CREATED |
| `packages/core/src/types/session-recovery-data.ts` | CREATED |
| `packages/core/src/selectors/fearLadder.ts` | UPDATED |
| `packages/core/src/erp/session-state-machine.ts` | CREATED |
| `packages/core/src/erp/session-state-machine.test.ts` | CREATED |
| `packages/core/src/constants/kvKeys.ts` | UPDATED |
| `packages/core/src/index.ts` | UPDATED |
| `packages/core/src/__tests__/selectors/fearLadder.test.ts` | UPDATED |
| `packages/supabase/src/auth/AuthProvider.tsx` | UPDATED |
| `packages/supabase/src/auth/useAuth.ts` | UPDATED |
| `packages/supabase/src/mappers/exposure-session.mapper.ts` | CREATED |
| `packages/supabase/src/mappers/suds-reading.mapper.ts` | CREATED |
| `packages/supabase/__tests__/rls/exposure_sessions.test.ts` | CREATED |
| `packages/supabase/__tests__/rls/suds_readings.test.ts` | CREATED |
| `packages/supabase/__tests__/mappers/exposure-session.mapper.test.ts` | CREATED |
| `packages/supabase/__tests__/mappers/suds-reading.mapper.test.ts` | CREATED |
| `apps/mobile/src/components/session/SudsScale.tsx` | CREATED |
| `apps/mobile/app/session/_layout.tsx` | CREATED |
| `apps/mobile/app/session/intent.tsx` | CREATED |
| `apps/mobile/app/session/pause.tsx` | CREATED |
| `apps/mobile/app/session/active.tsx` | CREATED |
| `apps/mobile/app/session/grounding.tsx` | CREATED |
| `apps/mobile/app/session/abandoned.tsx` | CREATED |
| `apps/mobile/app/session/intent.test.tsx` | CREATED |
| `apps/mobile/app/session/active.test.tsx` | CREATED |
| `apps/mobile/app/session/grounding.test.tsx` | CREATED |
| `apps/mobile/app/_layout.tsx` | UPDATED |
| `apps/mobile/app/(app)/_layout.tsx` | UPDATED |
| `apps/mobile/app/ladder.tsx` | UPDATED |
| `apps/mobile/app/(onboarding)/ladder.tsx` | UPDATED |
| `apps/mobile/src/i18n/locales/en.json` | UPDATED |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATED |
