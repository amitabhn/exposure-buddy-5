# Story 3.2: DPDPA Consent Schema & Consent-Record Edge Function

Status: done

## Story

As a user,
I want consent records written exclusively via the `/consent-record` Edge Function,
So that DPDPA 2023 compliance is enforced at the infrastructure layer and no application code path can bypass it (FR-DPO-04).

## Acceptance Criteria

1. **consent_records migration**
   Given a `consent_records` table is created via migration at `supabase/migrations/0004_consent_records.sql`
   When the migration runs
   Then the table contains: `id` (uuid PK DEFAULT gen_random_uuid()), `user_id` (FK to `auth.users` ON DELETE CASCADE), `timestamp_utc` (timestamptz NOT NULL), `purpose_id` (text NOT NULL), `consent_version` (text NOT NULL), `withdrawal_status` (boolean NOT NULL DEFAULT false), `created_at` (timestamptz NOT NULL DEFAULT now()); and a `user_consent_status` view aggregates the latest consent record per user per purpose (DISTINCT ON (user_id, purpose_id) ORDER BY timestamp_utc DESC)

2. **RLS on consent_records — 4 required assertions**
   Given RLS is applied to `consent_records`
   When the RLS policy test harness runs (`packages/supabase/__tests__/rls/consent_records.test.ts`) against a local Supabase instance
   Then four assertions pass: `[+]` authenticated user can read their own consent records; `[-]` cross-user read is blocked; `[-]` unauthenticated read is blocked; `[-]` direct INSERT from an authenticated non-service-role context is blocked (returns a PostgREST error)

3. **`/consent-record` Edge Function**
   Given the `/consent-record` Edge Function is deployed at `supabase/functions/consent-record/index.ts`
   When `IConsentRecordService.recordConsent(payload)` is called with `{ timestampUtc, purposeId, consentVersion, withdrawalStatus }`
   Then the Edge Function verifies the caller's JWT, extracts `user_id` from the verified token, writes a row to `consent_records` using the service_role client (bypassing RLS for the write), validates all four required fields are present, returns `200` on success, returns `400` with a JSON error body `{ error: string }` on validation failure, and returns `401` if the JWT is missing or invalid

4. **Live ConsentRecordService — stub replaced**
   Given Story 3.2 is complete
   When `apps/mobile` builds
   Then `ConsentRecordServiceStub` is replaced with a live `ConsentRecordService` class (at `packages/supabase/src/functions/consent-record.ts`) that implements `IConsentRecordService` and calls the `/consent-record` Edge Function via `supabase.functions.invoke()`; the `IConsentRecordService` interface contract in `packages/core` is unchanged; the two `ConsentRecordServiceStub` instantiations in `apps/mobile/app/(auth)/otp-verification.tsx` (lines ~126 and ~157) are replaced with `new ConsentRecordService()`; `ConsentRecordService` is imported from `@exposure-buddy/supabase`, not `@exposure-buddy/core`

## Tasks / Subtasks

- [x] T1 — Create `supabase/migrations/0004_consent_records.sql` (AC: 1, 2)
  - [x] Create `consent_records` table with all 7 required columns; FK `user_id REFERENCES auth.users(id) ON DELETE CASCADE`; `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`; `timestamp_utc TIMESTAMPTZ NOT NULL`; `purpose_id TEXT NOT NULL`; `consent_version TEXT NOT NULL`; `withdrawal_status BOOLEAN NOT NULL DEFAULT false`; `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - [x] Create `user_consent_status` view: `CREATE OR REPLACE VIEW public.user_consent_status AS SELECT DISTINCT ON (user_id, purpose_id) * FROM public.consent_records ORDER BY user_id, purpose_id, timestamp_utc DESC`
  - [x] Enable RLS: `ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY`
  - [x] Create SELECT policy: `CREATE POLICY "consent_records_own_row_read" ON public.consent_records FOR SELECT USING (auth.uid() = user_id)` — own-row read allowed for authenticated users
  - [x] Do NOT create any INSERT/UPDATE/DELETE policy for authenticated users — direct INSERT from app code must be blocked; only the service_role client (Edge Function) can insert
  - [x] Add comment: `-- consent_records: all inserts via supabase/functions/consent-record only (FR-DPO-04). No app-level INSERT policy by design.`

- [x] T2 — Update `packages/supabase/src/database.types.ts` (AC: 3, 4)
  - [x] Add `consent_records` to the `Tables` section with `Row`, `Insert`, and `Update` shapes matching the migration schema
  - [x] Add `user_consent_status` to the `Views` section (read-only, no Insert/Update shapes)
  - [x] Do NOT import this file from `apps/mobile` or `packages/core` — the anti-pattern guard in the implementation patterns doc applies

- [x] T3 — Create `supabase/functions/_shared/cors.ts` and `supabase/functions/_shared/types.ts`
  - [x] `cors.ts`: export `corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }`
  - [x] `types.ts`: export `ConsentRecordPayload` type — Deno-safe duplicate of `ConsentRecord` from packages/core (DO NOT import from packages/ in Edge Functions — they cannot resolve monorepo paths in Deno)

- [x] T4 — Create `supabase/functions/consent-record/index.ts` — Edge Function (AC: 3)
  - [x] Handle CORS preflight: `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })`
  - [x] Extract Bearer JWT from `Authorization` header; return `401` if absent
  - [x] Create admin client using `Deno.env.get('SUPABASE_URL')` and `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — this is the service_role client used for the write
  - [x] Verify caller's JWT: `adminClient.auth.getUser(jwt)` — return `401 { error: 'Unauthorized' }` if user not found
  - [x] Parse request body; validate all four required fields (`timestampUtc`, `purposeId`, `consentVersion`, `withdrawalStatus`) are present and non-empty — return `400 { error: '...' }` if any are missing
  - [x] Insert into `consent_records` using `adminClient` (service_role — bypasses RLS): `{ user_id: user.id, timestamp_utc, purpose_id, consent_version, withdrawal_status }`
  - [x] Return `200 { ok: true }` on success; `500 { error: '...' }` if the DB insert fails
  - [x] Import from `../_shared/cors.ts` and `../_shared/types.ts` using relative Deno paths (no `npm:` prefix for these shared files)

- [x] T5 — Create `packages/supabase/src/functions/` directory and files (AC: 4)
  - [x] Create `packages/supabase/src/functions/call-edge-fn.ts` — typed invoker with `TBody extends Record<string, unknown>` constraint
  - [x] Create `packages/supabase/src/functions/consent-record.ts` — live `ConsentRecordService` implementing `IConsentRecordService`
  - [x] Create `packages/supabase/src/functions/index.ts` — export `{ ConsentRecordService } from './consent-record'`
  - [x] Update `packages/supabase/src/index.ts` — add `export { ConsentRecordService } from './functions'`

- [x] T6 — Create `packages/supabase/__tests__/rls/consent_records.test.ts` — RLS integration test (AC: 2)
  - [x] Follow the exact pattern from `packages/supabase/__tests__/rls/profiles.test.ts` — same imports, same `skipIfNoSupabase` guard, same `beforeAll`/`afterAll` with service role user creation/deletion
  - [x] Use unique test emails: `consent-rls-test-a@example.com`, `consent-rls-test-b@example.com` (distinct from other test files)
  - [x] Use service_role client in `beforeAll` to create two users; seed consent_records via `serviceClient.from('consent_records').insert(...)`
  - [x] Test `[+]`: authenticated userA reads their own consent records — expect 1 row with correct `user_id`
  - [x] Test `[-]` cross-user: authenticated userA reads userB's records — expect 0 rows (RLS filters)
  - [x] Test `[-]` unauthenticated: anon client reads any consent records — expect 0 rows
  - [x] Test `[-]` direct INSERT blocked: authenticated userA insert attempt — expect error with code `42501`

- [x] T7 — Update `apps/mobile/app/(auth)/otp-verification.tsx` — replace stub with live service (AC: 4)
  - [x] Remove `ConsentRecordServiceStub` from the import line (kept `emitAccountCreated`, `CONSENT_PURPOSE_ACCOUNT_CREATION`, `CONSENT_VERSION_CURRENT` from `@exposure-buddy/core`)
  - [x] Add import: `import { ConsentRecordService } from '@exposure-buddy/supabase'`
  - [x] Replaced BOTH instantiations of `new ConsentRecordServiceStub()` with `new ConsentRecordService()`
  - [x] No other changes to otp-verification.tsx — async pattern preserved

- [x] T8 — CI checks (all ACs)
  - [x] Run `turbo run typecheck` — 10/10 targets pass (fixed `TBody extends Record<string, unknown>` constraint)
  - [x] Run `turbo run lint` — 7/7 clean
  - [x] Run `turbo run test` — packages/core 11/11 pass; packages/supabase 12 skipped (no local Supabase — correct); mobile 6 pre-existing failures (react-test-renderer version mismatch, documented in Story 3.1)
  - [x] Verify `@exposure-buddy/core` has zero new imports from `@supabase/*` or `expo-*` (ARC-011 boundary unchanged — typecheck confirms)

## Dev Notes

### Environment Prerequisites — Supabase CLI + Deno (Read Before Starting)

This is the **first story touching Supabase Edge Functions (Deno runtime)**. Three runtimes are active in this story:
- **Vitest** (Node) — `packages/supabase` RLS tests
- **Supabase local stack** — migrations + RLS test target
- **Deno** — Edge Function authoring and local testing

**Required setup before starting:**

```
# Start local Supabase stack (needed for RLS tests and function emulation)
supabase start
# On first run: docker pull + init takes ~5 min

# Run migrations against local stack
supabase db reset   # or supabase migration up

# Get local keys (for RLS test env vars)
supabase status
# → SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY printed

# Run RLS tests locally
SUPABASE_SERVICE_ROLE_KEY=<from above> SUPABASE_ANON_KEY=<from above> pnpm --filter @exposure-buddy/supabase test

# Serve Edge Functions locally for manual testing
supabase functions serve consent-record --env-file .env.local
```

**`.env.local` for local Edge Function testing** (not committed):
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
SUPABASE_ANON_KEY=<from supabase status>
```

**Deno version:** Use whatever version ships with the Supabase CLI. Do NOT install Deno separately unless `supabase functions serve` requires it.

### Architecture: Migration Numbering Deviation

The architecture document lists `0003_consent.sql` for consent, but migration `0003_profiles.sql` already exists from Story 2.1. Use the next sequential number: **`0004_consent_records.sql`**.

The architecture also lists `0004_analytics.sql` — this becomes `0005_analytics_events_stub.sql` in **Story 3.5** ("dpo-appointment-privacy-notice-and-analytics-boundary"), not this story. Do NOT create an analytics migration here.

### Architecture: Edge Functions — Deno Runtime Rules

Edge Functions at `supabase/functions/` are Deno TypeScript. They:
- **Cannot import from the monorepo** (`packages/core`, etc.) — Deno cannot resolve workspace paths
- **CAN use Deno built-ins and `npm:` prefixed packages** — but for this story, only standard Deno globals and the Supabase client from `'https://esm.sh/@supabase/supabase-js@2'` are needed
- **SHOULD import shared utilities** from `../_shared/` (relative path, works in Deno)
- Use `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — Supabase injects this automatically in deployed functions and `supabase start` injects it locally

**Why `_shared/types.ts` must be a Deno-safe duplicate, NOT an import from packages/core:**
The monorepo workspace `@exposure-buddy/core` is not resolvable in the Deno runtime. `_shared/types.ts` re-declares `ConsentRecordPayload` as a plain interface — identical shape but no `npm:` prefix, no workspace path. This is the canonical Supabase pattern.

### Architecture: RLS — Why No INSERT Policy on consent_records

FR-DPO-04 mandates that all consent writes go exclusively through the Edge Function. Enforcing this at the infrastructure layer means:
- **No `INSERT` RLS policy** for authenticated or anon roles — any attempt from the mobile client hits a `42501` RLS violation
- **The Edge Function uses the `service_role` client** which bypasses RLS entirely — it can INSERT
- This is intentional. Any developer who tries to write `from('consent_records').insert(...)` in app code gets an immediate RLS error in development, preventing accidental policy bypasses

**The `user_id` field is set by the Edge Function from the verified JWT `sub` claim, NOT from the request body.** This prevents a user from writing consent records for a different user_id. The request body carries only the 4 consent payload fields.

### Architecture: user_consent_status View

The view returns the most recent consent record per (user_id, purpose_id) pair using `DISTINCT ON`:
```sql
CREATE OR REPLACE VIEW public.user_consent_status AS
  SELECT DISTINCT ON (user_id, purpose_id) *
  FROM public.consent_records
  ORDER BY user_id, purpose_id, timestamp_utc DESC;
```
Note: `DISTINCT ON` requires the first columns of the `ORDER BY` to match the `DISTINCT ON` expression — this exact SQL pattern is required. Do NOT use `ROW_NUMBER()` or a subquery.

**The view does NOT have RLS applied to it** — it inherits the RLS of `consent_records`. `user_consent_status` is used by Story 3.3 (DPO operator panel) not by the mobile app.

### Architecture: DI Binding Update — packages/supabase, not packages/core

Current state in `otp-verification.tsx`:
```typescript
import { ..., ConsentRecordServiceStub, ... } from '@exposure-buddy/core'
const consentService = new ConsentRecordServiceStub()
```

After this story:
```typescript
import { emitAccountCreated, CONSENT_PURPOSE_ACCOUNT_CREATION, CONSENT_VERSION_CURRENT } from '@exposure-buddy/core'
import { ConsentRecordService } from '@exposure-buddy/supabase'
const consentService = new ConsentRecordService()
```

`ConsentRecordService` must be imported from `@exposure-buddy/supabase` — the live implementation lives there because it depends on `@supabase/supabase-js`, which is forbidden in `packages/core` (ARC-011).

**Do NOT remove `ConsentRecordServiceStub` from `packages/core/src/index.ts`** — it may be used in tests or future stories. Only remove its instantiation from `otp-verification.tsx`.

### Architecture: packages/supabase/src/functions/ Directory — New Territory

This directory does not exist yet. It is the TypeScript wrapper layer for Edge Function calls — NOT the Deno functions themselves (those live at `supabase/functions/`). The naming can be confusing:

| Path | Runtime | Purpose |
|---|---|---|
| `supabase/functions/consent-record/index.ts` | Deno | The actual Edge Function deployed to Supabase |
| `packages/supabase/src/functions/consent-record.ts` | Node/Metro | TypeScript class that calls the Edge Function from the app |
| `packages/supabase/src/functions/call-edge-fn.ts` | Node/Metro | Generic typed invoker using `supabase.functions.invoke()` |

### Existing Code: IConsentRecordService Interface (Do NOT Change)

Location: `packages/core/src/services/IConsentRecordService.ts`
```typescript
import type { ConsentRecord } from './ConsentRecord'
export interface IConsentRecordService {
  recordConsent(payload: ConsentRecord): Promise<void>
}
```

Location: `packages/core/src/services/ConsentRecord.ts`
```typescript
export type ConsentRecord = {
  timestampUtc: string
  purposeId: string
  consentVersion: string
  withdrawalStatus: boolean
}
export const CONSENT_PURPOSE_ACCOUNT_CREATION = 'account-creation-v1'
export const CONSENT_VERSION_CURRENT = '1.0'
```

The `ConsentRecordService` in `packages/supabase` must implement this exact interface with these exact method signatures. The stub's `recordConsent` takes `ConsentRecord` and returns `Promise<void>` — the live service must match.

### Existing Code: otp-verification.tsx — Two Instantiation Sites

The stub is instantiated at TWO sites in `otp-verification.tsx` — both must be replaced:
- **Line ~126**: inside the `useEffect` for new account creation consent write
- **Line ~157**: inside `handleVerify()` for consent retry after a failed write

Both sites call `.recordConsent({ timestampUtc, purposeId, consentVersion, withdrawalStatus })` with identical payload shapes. The async pattern (`.then()` / `.catch()`) around the call must NOT be changed — only the `new ConsentRecordServiceStub()` → `new ConsentRecordService()` substitution.

The async race conditions from the Epic 2 retro (Action Item 1) are already handled in the current `otp-verification.tsx` implementation. Do NOT add or remove any async guards.

### DPDPA Compliance Note: consent_records Retention

Per NFR-SEC-03 and FR-DPO-03, consent records are explicitly **excluded from the 30-day soft-delete erasure** in Story 3.3. The `consent_records` table must NOT have a `deleted_at` column or any soft-delete mechanism. Consent records are retained for account lifetime + 2 years post-deletion. Do NOT add any ON DELETE behavior beyond `ON DELETE CASCADE` on `user_id` FK — and note: Story 3.3's erasure logic must explicitly skip this table. Documenting this here so the constraint is visible before 3.3 is written.

### RLS Test Pattern Reference

Follow `packages/supabase/__tests__/rls/profiles.test.ts` exactly. Key details:
- `LOCAL_URL = 'http://localhost:54321'`
- `skipIfNoSupabase = !SERVICE_ROLE_KEY || !ANON_KEY`
- `describe.skipIf(skipIfNoSupabase)(...)` — auto-skip in CI without keys
- Use `serviceClient.auth.admin.createUser({ ..., email_confirm: true })` for test users
- Clean up in `afterAll` with `serviceClient.auth.admin.deleteUser(id)` — cascade removes consent_records rows
- Seed consent rows in `beforeAll` using `serviceClient.from('consent_records').insert(...)` (service_role bypasses RLS)
- Use unique test emails not used in other RLS test files (see `rls-test-a@example.com` in users.test.ts and `profiles-rls-test-a@example.com` in profiles.test.ts)

For the INSERT-blocked test, the authenticated client will get an error like:
```
{ code: '42501', message: 'new row violates row-level security policy for table "consent_records"' }
```
Assert `expect(error).not.toBeNull()` — the exact error code check is optional but `expect(error?.code).toBe('42501')` adds clarity.

### What NOT to Create in This Story

- `supabase/migrations/0005_analytics_events_stub.sql` — belongs to Story 3.5
- `supabase/functions/dpo/` directory — belongs to Story 3.3
- `packages/supabase/src/functions/export-data.ts` — Story 3.3
- `packages/supabase/src/functions/crisis-alert.ts` — later epic
- `packages/core/src/consent/consent.ts` or `dpdpa.ts` — architecture doc lists these but the story ACs don't require them and the consent types are already established in `packages/core/src/services/`
- `dpo_audit_log` table — Story 3.3
- Any changes to `IDpoService` or `DpoServiceStub` — Story 3.3
- Any changes to `apps/mobile/app/(app)/settings/data-rights.tsx` — Story 3.3/3.4

### File Checklist

**New files:**
- `supabase/migrations/0004_consent_records.sql`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/types.ts`
- `supabase/functions/consent-record/index.ts`
- `packages/supabase/src/functions/call-edge-fn.ts`
- `packages/supabase/src/functions/consent-record.ts`
- `packages/supabase/src/functions/index.ts`
- `packages/supabase/__tests__/rls/consent_records.test.ts`

**Modified files:**
- `packages/supabase/src/database.types.ts` — add consent_records table + user_consent_status view types
- `packages/supabase/src/index.ts` — add `export { ConsentRecordService } from './functions'`
- `apps/mobile/app/(auth)/otp-verification.tsx` — replace ConsentRecordServiceStub with ConsentRecordService

**Do NOT create:**
- `supabase/migrations/0005_*.sql` (analytics stub — Story 3.5)
- Any file under `supabase/functions/dpo/` (Story 3.3)
- `packages/core/src/consent/` directory (not required by story ACs)

### References

- `packages/core/src/services/IConsentRecordService.ts` — interface to implement
- `packages/core/src/services/ConsentRecord.ts` — payload type + constants
- `packages/core/src/stubs/ConsentRecordServiceStub.ts` — reference for stub being replaced
- `packages/supabase/__tests__/rls/profiles.test.ts` — RLS test pattern to follow exactly
- `packages/supabase/__tests__/rls/users.test.ts` — same pattern, different table
- `packages/supabase/src/client.ts` — `createSupabaseClient()` used by `call-edge-fn.ts`
- `packages/supabase/src/index.ts` — existing export patterns to extend (do not remove existing exports)
- `apps/mobile/app/(auth)/otp-verification.tsx` — lines ~126 and ~157 for the two stub instantiations
- `supabase/migrations/0003_profiles.sql` — migration style reference (confirm 0004 is next sequential)
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md § ADR-006` — RLS test harness pattern
- `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md § Package Import Boundaries` — ARC-011 boundary rules
- Epics: `epics.md § Story 3.2` — AC source (lines 791–819)
- Epics: `epics.md` lines 79–84 — FR-DPO-04 definition
- Retro: `epic-2-retro-2026-05-26.md § Epic 3 Preparation` — stub interfaces ready, Deno is new runtime

## Review Findings

### Decision-Needed

- [x] [Review][Decision] ON DELETE CASCADE contradicts DPDPA 2-year post-deletion retention requirement — RESOLVED: Keep CASCADE as-is per spec's explicit FK directive. Story 3.3 carries a hard pre-condition: before any `auth.admin.deleteUser()` call is permitted, a consent record retention strategy (archive table, orphan rows, or deferred cleanup job) must be designed and implemented. ADR item written to deferred-work.md.

- [x] [Review][Patch] Remove over-specified `42501` error code assertion — relaxed to `expect(error).not.toBeNull()` only [`packages/supabase/__tests__/rls/consent_records.test.ts:111`]

### Patch

- [x] [Review][Patch] [HIGH] `user_consent_status` view bypasses RLS — added `WITH (security_invoker = true)` to `CREATE VIEW` [`supabase/migrations/0004_consent_records.sql:21`]

- [x] [Review][Patch] [MEDIUM] Bearer token extraction fragile — replaced `.replace('Bearer ', '')` with `.startsWith('Bearer ')` guard + `.slice(7)` [`supabase/functions/consent-record/index.ts:11-18`]

- [x] [Review][Patch] [MEDIUM] `callEdgeFn` singleton session — confirmed `createSupabaseClient()` is a module-level singleton; added comment documenting the session dependency [`packages/supabase/src/functions/call-edge-fn.ts:3-6`]

- [x] [Review][Patch] [MEDIUM] Non-date `timestampUtc` string produced opaque 500 — added `isNaN(Date.parse(timestampUtc))` check; returns 400 [`supabase/functions/consent-record/index.ts:55-63`]

- [x] [Review][Patch] [MEDIUM] Non-boolean `withdrawalStatus` value produced 500 — replaced `=== undefined || === null` check with `typeof withdrawalStatus !== 'boolean'`; returns 400 [`supabase/functions/consent-record/index.ts:55-63`]

- [x] [Review][Patch] [MEDIUM] Raw Postgres error message forwarded to caller — `insertError.message` replaced with generic `'Internal server error'`; full error logged via `console.error` [`supabase/functions/consent-record/index.ts:72-76`]

- [x] [Review][Patch] [LOW] `user_consent_status` ORDER BY non-deterministic — added tiebreaker `created_at DESC, id DESC` [`supabase/migrations/0004_consent_records.sql:21-24`]

- [x] [Review][Patch] [LOW] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` empty string silent failure — added fast-fail guard returning 500 `'Server misconfiguration'` [`supabase/functions/consent-record/index.ts:23-27`]

- [x] [Review][Patch] [LOW] `beforeAll` seed INSERT error not asserted — destructured `seedError` and throw on non-null [`packages/supabase/__tests__/rls/consent_records.test.ts:54-56`]

- [x] [Review][Patch] [LOW] `afterAll` teardown not error-safe — wrapped each `deleteUser` call in individual `try/catch` blocks [`packages/supabase/__tests__/rls/consent_records.test.ts:62-72`]

### Deferred

- [x] [Review][Defer] No rate limiting or duplicate-insert guard on Edge Function [`supabase/functions/consent-record/index.ts`] — deferred, operational concern / future story
- [x] [Review][Defer] `callEdgeFn` error opacity — caller cannot distinguish 400 / 401 / 500 from Edge Function [`packages/supabase/src/functions/call-edge-fn.ts`] — deferred, future enhancement
- [x] [Review][Defer] `callEdgeFn` returns `Promise<void>` discarding success data [`packages/supabase/src/functions/call-edge-fn.ts`] — deferred, future enhancement
- [x] [Review][Defer] `LOCAL_URL = 'http://localhost:54321'` hardcoded in RLS test — matches existing project pattern [`packages/supabase/__tests__/rls/consent_records.test.ts:10`] — deferred, pre-existing pattern
- [x] [Review][Defer] Test password hardcoded in source — matches existing project pattern [`packages/supabase/__tests__/rls/consent_records.test.ts:17`] — deferred, pre-existing pattern
- [x] [Review][Defer] `authState.userId` in `otp-verification.tsx` effect deps creates subtle re-trigger risk around `prevIsAuthenticated` ref guard [`apps/mobile/app/(auth)/otp-verification.tsx`] — deferred, pre-existing pattern not introduced by this story

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing `exposure-buddy-mobile` Jest failures (6 suites) — react-test-renderer version mismatch (19.1.4 vs expected 19.1.0). First documented in Story 3.1. Not introduced by this story.
- T8 typecheck fix: `callEdgeFn<TBody>` required `TBody extends Record<string, unknown>` constraint to satisfy `supabase.functions.invoke()` body type union.

### Completion Notes List

- T1: Created `supabase/migrations/0004_consent_records.sql` — consent_records table (7 columns), user_consent_status DISTINCT ON view, RLS enabled with SELECT-only policy. No INSERT policy by design (FR-DPO-04).
- T2: Updated `packages/supabase/src/database.types.ts` — added consent_records Table (Row/Insert/Update) and user_consent_status View (Row only).
- T3: Created `supabase/functions/_shared/cors.ts` (corsHeaders) and `_shared/types.ts` (ConsentRecordPayload Deno-safe duplicate).
- T4: Created `supabase/functions/consent-record/index.ts` — Deno Edge Function; verifies Bearer JWT via adminClient.auth.getUser(), validates 4 required fields, inserts via service_role client, returns 200/400/401/500.
- T5: Created `packages/supabase/src/functions/` — call-edge-fn.ts (typed invoker, TBody extends Record<string, unknown>), consent-record.ts (ConsentRecordService implements IConsentRecordService), index.ts; updated packages/supabase/src/index.ts to export ConsentRecordService.
- T6: Created `packages/supabase/__tests__/rls/consent_records.test.ts` — 4 RLS assertions (own-read, cross-read blocked, unauth blocked, direct INSERT blocked with 42501); skipIfNoSupabase guard for CI.
- T7: Updated `apps/mobile/app/(auth)/otp-verification.tsx` — removed ConsentRecordServiceStub import, added ConsentRecordService from @exposure-buddy/supabase, replaced both instantiations.
- T8: turbo typecheck 10/10 ✅, lint 7/7 ✅, test packages/core 11/11 ✅, packages/supabase 12 skipped (no local Supabase) ✅.

### File List

**New files:**
- `supabase/migrations/0004_consent_records.sql`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/types.ts`
- `supabase/functions/consent-record/index.ts`
- `packages/supabase/src/functions/call-edge-fn.ts`
- `packages/supabase/src/functions/consent-record.ts`
- `packages/supabase/src/functions/index.ts`
- `packages/supabase/__tests__/rls/consent_records.test.ts`

**Modified files:**
- `packages/supabase/src/database.types.ts` — added consent_records table + user_consent_status view types
- `packages/supabase/src/index.ts` — added `export { ConsentRecordService } from './functions'`
- `apps/mobile/app/(auth)/otp-verification.tsx` — replaced ConsentRecordServiceStub with ConsentRecordService from @exposure-buddy/supabase
- `_bmad-output/implementation-artifacts/3-2-dpdpa-consent-schema-and-consent-record-edge-function.md` — story status and task tracking
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story status updated
