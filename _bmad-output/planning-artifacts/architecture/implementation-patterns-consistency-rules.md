# Implementation Patterns & Consistency Rules

## Critical Conflict Points Identified: 7
Naming, structure, data transform, error handling, dates, loading states, event naming

---

## Naming Patterns

**Database (snake_case throughout):**
- Tables: plural snake_case — suds_logs, erp_sessions, check_ins, erasure_jobs, notifications_sent, device_tokens, therapist_patient
- Columns: snake_case — user_id, inserted_at, local_date, suds_score
- Foreign keys: {singular_table}_id — user_id, session_id, hierarchy_id
- Indexes: idx_{table}_{columns} — idx_suds_logs_user_id_inserted_at

**TypeScript code:**
- Variables/functions: camelCase — userId, getSudsScore, calculateStreak
- Types/Interfaces: PascalCase — SUDScore, ERPSession, CheckInResult, SyncAdapter
- Enums: PascalCase name, camelCase values — SessionStatus.inProgress
- Constants: SCREAMING_SNAKE_CASE — MAX_SUDS_VALUE, CRISIS_THRESHOLD
- Non-component files: kebab-case — session-state-machine.ts, crisis-detection.ts
- React component files: PascalCase — SUDSlider.tsx, ExposureHierarchy.tsx
- Hook files: camelCase — useSessionState.ts, useSyncStatus.ts

**ESLint enforcement:** `@typescript-eslint/naming-convention` with file-level matchers for hooks/components. Convention alone is insufficient — monorepo builds fail subtly on wrong casing.

**packages/supabase transform rule (CRITICAL):**
Bidirectional — snake_case→camelCase on all PostgREST query results; camelCase→snake_case on all PostgREST write inputs. Both directions owned exclusively by packages/supabase. Generated DB types (database.types.ts) never imported outside packages/supabase.

**New entity transform checklist** (one new DB entity = update all 4):
1. `packages/supabase/src/database.types.ts` (generated)
2. `packages/supabase/src/mappers/{entity}.mapper.ts` (transform)
3. `packages/core/src/types/{entity}.ts` (domain type)
4. `packages/supabase/__tests__/mappers/{entity}.mapper.test.ts` (round-trip test)

Round-trip test requirement: read→transform→write→read must return identical camelCase shape.

Anti-pattern: importing database.types.ts from apps/mobile or packages/core — precommit hook blocks this:
`grep -r "from.*database.types" packages/core` fails build.

---

## Structure Patterns

**Test co-location:**
- packages/core: co-located .test.ts alongside source files
- packages/core/__tests__/integration/: cross-module integration tests only
- packages/supabase/__tests__/rls/: RLS integration tests (Vitest + local Supabase)
- packages/ui/__tests__/: RTL and interaction tests
- apps/mobile: co-located .test.tsx for component tests

**packages/core internal structure:**
```
packages/core/src/
  types/       — domain types (Hierarchy, ExposureItem, SUDScore)
  erp/         — ERP protocol group: hierarchy, session state machine, SUDS calculation, debrief
  crisis/      — crisis detection algorithm + tests (co-located)
  checkin/     — check-in routing state machine + tests (co-located)
  progress/    — streak and progress calculations + tests (co-located)
  validation/  — hierarchy validation rules + tests (co-located)
  crypto/      — AES-256 utilities + tests (co-located)
  consent/     — DPDPA consent record builder
  analytics/   — event schema definitions (no PHI)
```

Unit tests are co-located as `{file}.test.ts` alongside each source file. `__tests__/integration/` is for cross-module integration tests only.

**apps/mobile screen structure (Expo Router file-based):**
```
apps/mobile/app/
  (auth)/         — sign-in, sign-up, onboarding
  (app)/
    index.tsx     — daily check-in / home
    session/      — ERP session flow
    hierarchy/    — hierarchy builder
    progress/     — streaks and progress
    settings/     — consent, preferences, account
  _layout.tsx
```

**Prohibited imports (ESLint + precommit):**
- packages/core: no react-native, expo-*, or @supabase/* imports
- database.types.ts: not imported outside packages/supabase
- apps/web: no @supabase/supabase-js (ADR-009 CI gate)

---

## Format Patterns

**Dates (two conventions, never mixed):**
- Supabase storage: ISO 8601 UTC — TIMESTAMPTZ (inserted_at)
- Calendar dates: 'YYYY-MM-DD' string in local_date column — device-reported, never server-computed
- Server guard: CHECK (local_date <= CURRENT_DATE + INTERVAL '1 day') — one day tolerance for timezone variance. Note: constraint is timezone-naive server-side; TZ handling strategy must be documented before enabling multi-timezone users.
- TypeScript: strings internally; Date objects only at UI display layer

**Error handling — Result type:**
```typescript
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

type AppError = {
  code: string
  message: string
  context?: {
    failedField?: string
    retryCount?: number
    [key: string]: string | number | undefined  // scalar values only — no objects, no functions
  }
}
```
All packages/core domain functions return Result — never throw. apps/mobile catches at the boundary. AppError context is audited quarterly for PII leakage.

**API responses (via packages/supabase):**
- Success: typed camelCase value directly — no wrapper
- Error: throw typed SupabaseError (extends Error, includes code field)

**Analytics event schema:**
```typescript
{
  eventType: string,   // domain.verb — 'session.completed'
  sessionId: string,   // generated on session.started, disposed on session.completed or session.abandoned
  timestamp: string,   // ISO 8601 UTC
  // NO userId, NO therapy content
}
```

---

## Communication Patterns

**State machine events (packages/core):**
- Naming: domain.verb past tense — session.started, session.completed, crisis.detected, checkin.submitted
- Payload: sessionId (ephemeral, per ERP session) + timestamp. Never userId or PII.

**Crisis interrupt — SyncMode state machine:**
```typescript
enum SyncMode {
  NORMAL,
  CRISIS_PAUSED,       // no new enqueues accepted
  CRISIS_WRITE_WINDOW  // in-flight write completing; UI not yet shown
}
```
Transition: NORMAL → CRISIS_PAUSED (immediate on detection) → CRISIS_WRITE_WINDOW (in-flight write drains) → crisis UI rendered. SyncAdapter in apps/mobile is the single owner of SyncMode state.

**SyncAdapter boundary:** Only apps/mobile calls SyncAdapter — never packages/core.

**Consent middleware:** Consent state consumed from packages/supabase helpers only — never app-local state.

---

## Process Patterns

**Loading states:** Per-component local state. PowerSync usePowerSync hook for sync status — never duplicated in component state. No loading skeleton for cached PowerSync data.

**Error recovery:** Network errors — silent retry via PowerSync. Domain errors — actionable plain-language message; never raw error strings. Crisis — no error state; always succeeds on-device.

**Logging:** packages/core: no console.log — return Result. Any field sourced from packages/core domain types is health-adjacent — never log. Production: debug logging stripped at build time.

---

## All AI Agents MUST:
- Import packages/core types — never database.types.ts
- Return Result<T> from all packages/core domain functions
- Use local_date for calendar/streak logic, inserted_at for ordering
- Call SyncAdapter only from apps/mobile
- Check consent via packages/supabase helpers before any data write
- Name events as domain.verb past tense
- Follow SyncMode transitions for crisis interrupt

## All AI Agents MUST NOT:
- Import react-native or expo-* from packages/core
- Log any field sourced from packages/core domain types
- Use AsyncStorage for state covered by MMKV or PowerSync
- Create a new SQLite instance
- Add @supabase/supabase-js to apps/web
- Put objects or functions in AppError.context

---

## API Naming Patterns

**Edge Functions (custom-named — not auto-derived like PostgREST):**
- Path: verb-first kebab-case — `send-push-notification`, `export-user-data`, `erase-user-data`
- Request body fields: camelCase — `{ userId, sessionId }`
- Response body fields: camelCase — `{ exportUrl, createdAt }`
- All Edge Function calls made exclusively from `packages/supabase` — never from `apps/mobile` or `apps/web` directly

**SQL function names (internal Supabase):**
- snake_case, consistent with DB convention — `calculate_streak`, `get_user_exposure_hierarchy`
- Never exposed to TypeScript directly — always wrapped by `packages/supabase`

---

## State Management Patterns

**Local UI state (transient: form values, validation errors, loading flags, modal visibility):**
- `useState` — any value that transitions independently: modal visibility, single toggle, transient UI flag
- `useReducer` — multi-step product flows where two or more values must stay consistent: ERP session, onboarding, hierarchy builder
- Decision boundary: if the reducer's state object must serialize to MMKV for crash recovery, use `useReducer`; a bag of `useState` calls does not serialize cleanly
- Zustand: not introduced; revisit only when a concrete cross-component sharing problem exists that `useReducer` + React context cannot solve

**Reducer extraction rule:** Any `useReducer` that grows beyond trivial complexity must have its reducer function extracted to `packages/core` — keeps clinical state testable with Vitest, consistent with ADR-001.

**Derived state (PowerSync data requiring transformation):**
- PowerSync query lives in a custom hook in `apps/mobile`
- Derivation logic lives in `packages/core` as a pure function — testable with Vitest using a plain array, no device required
- Hook composes them: query → raw data → `packages/core` function → return result
- `useMemo` is an implementation detail of the hook, not the primary strategy
- Hook naming: `useCheckInStatus()`, `useCurrentStreak()` — symmetric with core functions `deriveCheckInStatus()`, `calculateStreak()`

---

## Validation Patterns

**Authority:** `packages/core` is authoritative. DB constraints (CHECK, NOT NULL) duplicate core rules as a safety net — they do not define what is valid. PostgREST rejections are anomalies, not the primary enforcement path. Required for offline-first correctness (core runs on-device, always available).

**Validation functions:** live in `packages/core/src/validation/`. Return `Result<T, ValidationError[]>`. Called by both the UI layer and the `packages/supabase` write path.

**UI validation timing:**
- Multi-step flows (ERP session, onboarding, hierarchy builder): silent until first submit attempt, then live on blur
  - `hasAttemptedSubmit: boolean` is a required field in `useReducer` state for all multi-step flows
  - Validation fires on blur only when `hasAttemptedSubmit === true`
- Exception: SUDS score inputs during an active session validate on blur immediately — single-field, in-the-moment capture; immediate feedback is clarifying, not aversive
- Single-screen flows (daily check-in, settings): on blur

**Layer disagreement handling (PostgREST constraint violation after offline sync):**
- `packages/supabase/src/errors.ts` maps known PostgreSQL error codes to typed `AppError` variants
- Every new DB constraint ships with a corresponding entry in `errors.ts` + fixture test in `packages/supabase/__tests__/errors.test.ts` — CI fails if missing
- Recoverable with user action (e.g. duplicate name not caught offline): inline message in the context of the field — never a toast or modal
- Not recoverable with user action (transient sync failure): optimistic UI stays; async non-blocking notification only — never "Error", never red
- Sync failures must be transactional — all-or-nothing per session record (DPDPA data integrity requirement)
- Failed outbox writes must be logged with timestamp and session ID — silent discard is a compliance event

---

## Auth Flow Patterns

**Auth state at runtime (5a):**
- Cold start: read `{ userId, accessToken, expiresAt }` from MMKV synchronously (ADR-004 startup sequence)
- Runtime: `onAuthStateChange` listener (owned by `packages/supabase`) is the correction layer — on each event, write updated state to MMKV atomically, then dispatch to React context
- Rule: after cold start, read auth state from context only — never read MMKV for auth again until the next cold start
- `packages/supabase` instantiates the Supabase client and owns the listener; auth context provider lives in `apps/mobile`

**MMKV key inventory (5a-i):**
- `auth.state` — serialized `{ userId, accessToken, expiresAt }`; written by `setAuthState()`, cleared by `clearAuthState()` (sign-out)
- `auth.hasAuthedBefore` — boolean flag; written by `setAuthState()` on every successful sign-in, **never cleared** by `clearAuthState()` — survives sign-out, persists until reinstall. Read once at cold start into `AuthContext.hasAuthedBefore`; downstream consumers call `useAuth().hasAuthedBefore` — never re-read MMKV directly (same rule as 5a above). Purpose: sign-in screen defaults to "Create account" on first-ever install, "Sign in" on any device that has previously authenticated (FR-AUTH-03).

**Auth recheck during runtime (5b):**
- `AppState` change to `active` → call `supabase.auth.getSession()` in the root layout's `useEffect`
- Rationale: OS can suspend the app long enough for a token to expire while backgrounded; the listener does not fire for time passing, only for Supabase-initiated events
- If session expired: listener fires with `SIGNED_OUT` event; root layout routes to `(auth)/`
- PowerSync resync shares this same foreground trigger

**Screen access to auth identity (5c):**
- All screen components call `useAuth()` — never `supabase.auth.getUser()` directly
- `useAuth()` exported from `packages/supabase/src/hooks/useAuth.ts`; returns a typed `AuthState` object (not the raw Supabase session)
- `(app)/_layout.tsx` is the sole enforcement point — checks `userId` and redirects to `(auth)/` if absent
- Screens trust the layout gate; they consume `userId` from `useAuth()` without re-validating

---

## Pattern Enforcement

**Violation documentation:**
Approved exceptions are recorded in the `## Approved Exceptions` table at the end of this document. Format per row: exception (what was allowed), location (file/package), rationale, sunset condition. An agent reading this document must check that table before concluding a prohibited pattern applies to their case.

**Pattern update process:**
Any change to an implementation pattern requires a single PR that updates both: (1) the relevant section in this document, and (2) the corresponding ESLint rule or precommit hook. Both must change together — a pattern described in the doc but not enforced by tooling, or enforced by tooling but not described in the doc, is a broken contract.

**Pattern health signal:**
If any single rule accumulates more than 3 approved exceptions, that is a signal the rule needs revision under the update process above — not more exceptions.

---

## Concrete Examples

Examples are ordered in implementation sequence: entity → state → derived state → auth access → validation → data layer → sync → error handling.

**Example 1 — New entity (CheckIn): all 4 required files**

```typescript
// 1. packages/core/src/types/checkIn.ts — domain type (camelCase, zero Supabase deps)
export type CheckIn = {
  id: string
  userId: string
  localDate: string           // 'YYYY-MM-DD', device-reported
  completedAt: string         // ISO 8601 UTC
  routingResult: CheckInRoutingResult
}

// 2. packages/supabase/src/mappers/checkIn.mapper.ts — bidirectional transform
import type { Database } from '../database.types'
import type { CheckIn } from '@exposure-buddy/core'

type Row = Database['public']['Tables']['check_ins']['Row']

export function toCheckIn(row: Row): CheckIn {
  return {
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    completedAt: row.completed_at,
    routingResult: row.routing_result as CheckInRoutingResult,
  }
}

export function fromCheckIn(checkIn: CheckIn): Omit<Row, 'inserted_at'> {
  return {
    id: checkIn.id,
    user_id: checkIn.userId,
    local_date: checkIn.localDate,
    completed_at: checkIn.completedAt,
    routing_result: checkIn.routingResult,
  }
}

// 3. packages/supabase/src/database.types.ts — generated, never hand-edited
// Run: supabase gen types typescript --local > packages/supabase/src/database.types.ts

// 4. packages/supabase/__tests__/mappers/checkIn.mapper.test.ts — round-trip test
it('round-trips CheckIn without data loss', () => {
  const original: CheckIn = { id: 'abc', userId: 'u1', localDate: '2026-05-08', completedAt: '...', routingResult: 'session' }
  expect(toCheckIn(fromCheckIn(original) as Row)).toEqual(original)
})
```

---

**Example 2 — useReducer for ERP session (multi-step flow)**

```typescript
// apps/mobile/app/(app)/session/_reducer.ts
type ERPSessionState = {
  currentStep: 'hierarchy' | 'exposure' | 'debrief'
  selectedItemId: string | null
  sudsLog: Array<{ timestamp: string; score: number }>
  hasAttemptedSubmit: boolean   // validation fires on blur only when true
  isPaused: boolean
}

type ERPSessionAction =
  | { type: 'ITEM_SELECTED'; itemId: string }
  | { type: 'SUDS_LOGGED'; score: number; timestamp: string }
  | { type: 'SESSION_PAUSED' }
  | { type: 'SESSION_RESUMED' }
  | { type: 'SUBMIT_ATTEMPTED' }

export function erpSessionReducer(
  state: ERPSessionState,
  action: ERPSessionAction,
): ERPSessionState {
  switch (action.type) {
    case 'SUDS_LOGGED':
      return { ...state, sudsLog: [...state.sudsLog, { timestamp: action.timestamp, score: action.score }] }
    case 'SESSION_PAUSED':
      return { ...state, isPaused: true }
    case 'SUBMIT_ATTEMPTED':
      return { ...state, hasAttemptedSubmit: true }
    default:
      return state
  }
}
// Reducer extracted to packages/core if it grows beyond trivial complexity
```

---

**Example 3 — Derived state hook**

```typescript
// apps/mobile/src/hooks/useCheckInStatus.ts
import { usePowerSync } from '@powersync/react-native'
import { useMemo } from 'react'
import { deriveCheckInStatus } from '@exposure-buddy/core'  // explicit import — never inline the logic here

const CHECK_IN_TODAY_QUERY = `SELECT * FROM check_ins WHERE local_date = ? LIMIT 1`

export function useCheckInStatus(today: string) {
  const db = usePowerSync()
  const results = db.useQuery(CHECK_IN_TODAY_QUERY, [today])
  return useMemo(() => deriveCheckInStatus(results.data ?? []), [results.data])
  // deriveCheckInStatus is tested in packages/core with a plain array — no hook, no device required
}
```

---

**Example 4 — useAuth() in a protected screen**

```typescript
// apps/mobile/app/(app)/session/index.tsx
import { useAuth } from '@exposure-buddy/supabase'
// ❌ never: import { supabase } from '@supabase/supabase-js'  — no supabase import in screen files

export default function SessionScreen() {
  const { userId } = useAuth()
  // userId is always defined here — (app)/_layout.tsx redirected to (auth)/ if absent
}
```

---

**Example 5 — Validation with hasAttemptedSubmit**

```typescript
// apps/mobile/app/(app)/hierarchy/HierarchyItemForm.tsx
import { validateHierarchyItem } from '@exposure-buddy/core'

function HierarchyItemField({ state, dispatch, value, onChange }) {
  // Silent until first submit attempt; live on blur thereafter
  const error = state.hasAttemptedSubmit
    ? validateHierarchyItem({ name: value })
    : null

  return (
    <>
      <TextInput value={value} onChangeText={onChange} />
      {!error.ok && <Text>{error.error[0].message}</Text>}
    </>
  )
}
```

---

**Example 6 — Edge Function call from packages/supabase**

```typescript
// packages/supabase/src/functions/notifications.ts
import { supabase } from '../client'
import { mapFunctionError } from '../errors'

export async function sendPushNotification(params: {
  userId: string          // camelCase request body — always
  notificationType: string
}): Promise<void> {
  const { error } = await supabase.functions.invoke('send-push-notification', {
    body: params,
  })
  if (error) throw mapFunctionError(error)
}

// apps/mobile usage:
// import { sendPushNotification } from '@exposure-buddy/supabase'
// never: supabase.functions.invoke(...) from apps/mobile directly
```

---

**Example 7 — PowerSync offline write (writes do not fail offline)**

```typescript
// apps/mobile/src/sync/sudsWriter.ts
async function logSudsScore(db: PowerSyncDatabase, entry: SudsEntry) {
  await db.execute(
    'INSERT INTO suds_logs (id, user_id, suds_score, local_date) VALUES (?, ?, ?, ?)',
    [entry.id, entry.userId, entry.score, entry.localDate]
  )
  // ✅ returns immediately whether online or offline
  // PowerSync outbox queues the write and flushes to Supabase on reconnect
  // ❌ do NOT await a network confirmation or treat a missing network as an error
}
```

---

**Example 8 — SyncMode crisis interrupt (ordered transitions)**

```typescript
// apps/mobile/src/sync/SyncAdapter.ts
// Crisis interrupt always preempts the outbox queue

function onCrisisDetected() {
  setSyncMode(SyncMode.CRISIS_PAUSED)          // 1. no new enqueues accepted immediately
  waitForInflightWrite().then(() => {
    setSyncMode(SyncMode.CRISIS_WRITE_WINDOW)  // 2. in-flight write draining
    renderCrisisUI()                           // 3. crisis UI shown
  })
}
// Transition order is invariant: NORMAL → CRISIS_PAUSED → CRISIS_WRITE_WINDOW → crisis UI
// SyncAdapter in apps/mobile is the sole owner of SyncMode state
```

---

**Example 9 — AppError display cycle (PostgREST error → typed AppError → screen)**

```typescript
// packages/supabase/src/errors.ts
export function mapPostgRESTError(raw: { code: string }): AppError {
  switch (raw.code) {
    case '23514': return { code: 'CONSTRAINT_VIOLATION', message: 'Invalid value', context: {} }
    case '23502': return { code: 'NULL_VIOLATION', message: 'Required field missing', context: {} }
    default:      return { code: 'UNKNOWN_DB_ERROR', message: 'Something went wrong', context: {} }
  }
}
// packages/supabase/__tests__/errors.test.ts must cover every known PG code above

// apps/mobile/src/hooks/useSubmitCheckIn.ts
export function useSubmitCheckIn() {
  const [error, setError] = useState<AppError | null>(null)
  async function submit(data: CheckInInput) {
    const result = await submitCheckIn(data)  // packages/supabase returns Result<T, AppError>
    if (!result.ok) setError(result.error)    // typed — never parse raw error strings
  }
  return { submit, error }
}

// Screen reads typed fields — never switches on raw message strings
{error?.code === 'CONSTRAINT_VIOLATION' && <ErrorText>{error.message}</ErrorText>}
```

---

## Anti-Patterns

**8a — Importing database.types.ts outside packages/supabase**

```typescript
// ❌ packages/core/src/session/session-state-machine.ts
import type { Database } from '../../packages/supabase/src/database.types'
// Precommit fails: grep -r "from.*database.types" packages/core → MATCH — build blocked

// ✅ correct — import the domain type from packages/core
import type { ERPSession } from '../types/erpSession'
```

**8b — Calling supabase.auth.getUser() in a screen component**

```typescript
// ❌ apps/mobile/app/(app)/session/index.tsx
const { data: { user } } = await supabase.auth.getUser()  // network call in component, bypasses context

// ✅ correct — read from context via hook, zero network call
import { useAuth } from '@exposure-buddy/supabase'
const { userId } = useAuth()
```

---
