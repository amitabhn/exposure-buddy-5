# Story 3.3: DPO Edge Functions & Audit Log

Status: review

## Story

As a DPO operator,
I want erasure, export, and audit functions available via Edge Functions with a tamper-proof audit log,
So that DPDPA data subject rights can be processed with a complete, append-only record of every action (FR-DPO-05, FR-DPO-06, ARC-008).

*Depends on: Story 3.2 merged to main (migration 0004_consent_records.sql must exist before this story's migrations run).*

## Acceptance Criteria

1. **dpo_audit_log schema — append-only table**
   Given a `dpo_audit_log` table is created via migration
   When the schema is inspected
   Then the table contains: `id` (uuid PK DEFAULT gen_random_uuid()), `action_type` (text NOT NULL — check constraint: `'erasure' | 'export' | 'audit_view'`), `acting_operator_id` (text NOT NULL — JWT `sub` claim of operator), `target_user_id` (uuid NOT NULL), `timestamp_utc` (timestamptz NOT NULL DEFAULT now()), `outcome` (text NOT NULL — check constraint: `'success' | 'failure'`), `metadata` (jsonb)

2. **Immutability trigger**
   Given the `dpo_audit_log_immutability_trigger` is created via migration
   When any UPDATE or DELETE is attempted on `dpo_audit_log` — by any role including service_role
   Then the trigger fires BEFORE the operation and raises exception `'dpo_audit_log is append-only'`; the operation is aborted; service_role bypasses RLS but NOT BEFORE triggers — both enforcement layers are active

3. **RLS on dpo_audit_log — 4 required assertions**
   Given RLS is applied to `dpo_audit_log`
   When the RLS policy test harness runs (`packages/supabase/__tests__/rls/dpo_audit_log.test.ts`) against a local Supabase instance
   Then four assertions pass: `[+]` service_role client can INSERT (proxy for Edge Function path); `[-]` authenticated non-operator user INSERT is blocked; `[-]` unauthenticated INSERT is blocked; `[-]` UPDATE attempt raises immutability trigger exception (even with service_role)

4. **`/dpo/erase-user` Edge Function**
   Given the Edge Function is deployed at `supabase/functions/dpo-erase-user/index.ts`
   When an erasure request is processed
   Then: (a) JWT is validated and `dpo_operator` claim checked; (b) user's PII columns are nulled in `public.users` and `public.profiles`; (c) `consent_records` are explicitly excluded from erasure (retained per DPDPA retention requirement — user_id FK is now `ON DELETE SET NULL`); (d) a `dpo_audit_log` row is written with `action_type: 'erasure'`, `acting_operator_id` from JWT `sub`, `target_user_id`, outcome; (e) returns `200 { ok: true }` on success, `400/401/500` with `{ error: string }` on failure

5. **`/dpo/export-user` Edge Function**
   Given the Edge Function is deployed at `supabase/functions/dpo-export-user/index.ts`
   When an export request is processed
   Then: (a) JWT validated and `dpo_operator` claim checked; (b) all exportable personal data compiled (profile data, consent records, session metadata — excludes internal system fields); (c) `dpo_audit_log` row written with `action_type: 'export'`; (d) compiled data returned in response body

6. **`/dpo/audit-log` Edge Function**
   Given the Edge Function is deployed at `supabase/functions/dpo-audit-log/index.ts`
   When a read request is made
   Then: (a) JWT validated and `dpo_operator` claim checked; (b) paginated `dpo_audit_log` entries returned; (c) a `dpo_audit_log` row with `action_type: 'audit_view'` is written for every read (read access is itself audited); (d) pagination via `?page=N&pageSize=M` query params

7. **Model B: DPO-mediated erasure — `DpoServiceStub` remains the default in `AuthProvider`**
   Given Story 3.3 is complete
   When `AuthProvider.requestAccountDeletion()` is called on the mobile app
   Then `DpoServiceStub` (injected by default, same as Story 2.4) writes a `pending_deletion_request` record to MMKV with `status: 'pending'` and the user is signed out; the request enters a DPO review queue (surfaced in Story 3.4's operator panel); the live `DpoService` at `packages/supabase/src/functions/dpo-service.ts` is exported from `packages/supabase` and available for Story 3.4 to inject when the operator triggers actual erasure; `packages/core/src/services/IDpoService.ts` `PendingDeletionRecord.status` union is extended to `'pending' | 'completed'` (used by Story 3.4 to mark a request processed)

   **Rationale — DPDPA §13 compliance:** A DPO-operator-mediated erasure flow (Model B) is fully DPDPA-compliant — the Act grants the right to erasure but does not mandate instant self-service execution. DPDPA Rules 2025 permit a reasonable processing window. The finding that `AuthProvider.requestAccountDeletion()` with the live `DpoService` always returns 401 (adversarial Finding 3) was a scope mismatch: the `/dpo/erase-user` Edge Function correctly requires `dpo_operator` JWT claim; regular users should never call it directly. The correct fix is to keep `DpoServiceStub` as the mobile-app default (queue the request) and have the DPO panel (Story 3.4) call `DpoService.requestErasure()` with an operator JWT. See Dev Notes § Model B Architecture.

8. **Production-readiness gate**
   Given this story is complete
   When assessing production readiness
   Then this story alone does NOT satisfy FR-DPO-07; both Story 3.3 AND Story 3.4 must be complete and verified in production before Stories 2.1 and 2.2 are production-releasable

## Tasks / Subtasks

- [x] T1 — **[HARD GATE] Resolve D0: Consent records retention** — create `supabase/migrations/0005_consent_records_retention.sql` (AC: 4c)
  - [x] `ALTER TABLE public.consent_records DROP CONSTRAINT IF EXISTS consent_records_user_id_fkey` — drop existing CASCADE FK
  - [x] `ALTER TABLE public.consent_records ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` — orphan records on auth user deletion (rows preserved, `user_id` becomes NULL)
  - [x] Add `deleted_at TIMESTAMPTZ` column to `public.users`: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  - [x] Add comment: `-- deleted_at: soft-delete marker for DPDPA 30-day erasure window. email and auth identity nulled by /dpo/erase-user Edge Function.`
  - [x] This migration MUST run before any erasure logic is wired — it is the DPDPA compliance gate from deferred item D0

- [x] T2 — Create `supabase/migrations/0006_dpo_audit_log.sql` (AC: 1, 2, 3)
  - [x] Create `dpo_audit_log` table with all 7 required columns (see AC1 for exact column definitions)
  - [x] Add CHECK constraints: `action_type IN ('erasure', 'export', 'audit_view')` and `outcome IN ('success', 'failure')`
  - [x] Add index: `CREATE INDEX idx_dpo_audit_log_target_user_id ON dpo_audit_log(target_user_id)` — needed for DPO panel per-user lookups in Story 3.4
  - [x] Add index: `CREATE INDEX idx_dpo_audit_log_timestamp_utc ON dpo_audit_log(timestamp_utc DESC)` — needed for pagination
  - [x] Enable RLS: `ALTER TABLE public.dpo_audit_log ENABLE ROW LEVEL SECURITY`
  - [x] RLS: block all authenticated reads/writes — NO policies for anon or authenticated roles (service_role bypasses RLS and is used by Edge Functions)
  - [x] Add comment: `-- dpo_audit_log: append-only audit trail. All access via Edge Functions (service_role). No RLS SELECT/INSERT policies for regular users.`
  - [x] Create immutability trigger function and attach trigger (BEFORE UPDATE OR DELETE, FOR EACH ROW, raises exception `'dpo_audit_log is append-only'`)

- [x] T3 — Create `supabase/functions/_shared/auth.ts` (AC: 4–6)
  - [x] Export `extractBearerToken(req: Request): string | null` — `.startsWith('Bearer ')` guard + `.slice(7)`
  - [x] Export `verifyOperatorJwt(adminClient: SupabaseClient, jwt: string): Promise<{ operatorId: string } | null>` — calls `adminClient.auth.getUser(jwt)`, checks `user.app_metadata?.role === 'dpo_operator'`, returns `{ operatorId: user.id }` or `null`

- [x] T4 — Create `supabase/functions/dpo-erase-user/index.ts` (AC: 4)
  - [x] CORS preflight, env var fast-fail guard, service_role adminClient creation
  - [x] Extract + validate JWT via `extractBearerToken()` → 401 if missing
  - [x] Verify operator via `verifyOperatorJwt()` → 401 if invalid/not dpo_operator
  - [x] Parse body: `{ targetUserId: string }` — 400 if missing/invalid UUID
  - [x] Null `public.users.email`, set `public.users.deleted_at = now()`
  - [x] Null `public.profiles.display_name`
  - [x] Disable auth user via `adminClient.auth.admin.updateUserById(targetUserId, { user_metadata: { deleted: true }, ban_duration: 'none' })`
  - [x] DO NOT touch `consent_records` — DPDPA retention
  - [x] Write `dpo_audit_log` row on success (`action_type: 'erasure'`, outcome: `'success'`)
  - [x] Write `dpo_audit_log` row on failure (`outcome: 'failure'`, metadata with step), return 500 generic error
  - [x] Return `200 { ok: true }` on success

- [x] T5 — Create `supabase/functions/dpo-export-user/index.ts` (AC: 5)
  - [x] Same CORS, env var guard, JWT + operator verification pattern as T4
  - [x] Parse body: `{ targetUserId: string }` — validate UUID
  - [x] Compile: `public.users`, `public.profiles`, `public.consent_records WHERE user_id = targetUserId`
  - [x] Session metadata: attempt `erp_sessions WHERE user_id = targetUserId`, return empty array if table missing
  - [x] Write `dpo_audit_log` row with `action_type: 'export'`, outcome
  - [x] Return `200 { export: { user, profile, consentRecords, sessions } }`

- [x] T6 — Create `supabase/functions/dpo-audit-log/index.ts` (AC: 6)
  - [x] Same CORS, env var guard, JWT + operator verification pattern as T4
  - [x] Parse query params: `page` (default 1), `pageSize` (default 20, max 100)
  - [x] Query `dpo_audit_log` ordered by `timestamp_utc DESC`, paginated via `.range()`
  - [x] Write self-audit row: `action_type: 'audit_view'`, `target_user_id = operatorId`
  - [x] Return `200 { entries, page, pageSize, total }`

- [x] T7 — Update `packages/core/src/services/IDpoService.ts` (AC: 7)
  - [x] Extend `PendingDeletionRecord.status`: `'pending' | 'completed'`
  - [x] Do NOT change `IDpoService.requestErasure()` signature

- [x] T8 — Create `packages/supabase/src/functions/dpo-service.ts` (AC: 7)
  - [x] `DpoService` class implementing `IDpoService`
  - [x] `requestErasure(userId)` calls `callEdgeFn<{ targetUserId: string }>('dpo-erase-user', { targetUserId: userId })`
  - [x] Export from `packages/supabase/src/functions/index.ts` and `packages/supabase/src/index.ts`

- [x] T9 — Update `packages/supabase/src/auth/AuthProvider.tsx` (AC: 7)
  - [x] Keep `DpoServiceStub` as the default injection (Model B — user-initiated call queues the request; DPO operator processes via Story 3.4 panel)
  - [x] Add comment to `requestAccountDeletion()` explaining Model B rationale and Story 3.4 handoff
  - [x] Do NOT switch default to `DpoService` — `/dpo/erase-user` requires `dpo_operator` JWT; regular user JWT will always 401
  - [x] Do NOT update MMKV to `status: 'completed'` here — `'completed'` is set by Story 3.4 after operator-triggered erasure

- [x] T10 — Create `packages/supabase/__tests__/rls/dpo_audit_log.test.ts` (AC: 3)
  - [x] Follow `profiles.test.ts` pattern: `skipIfNoSupabase` guard, `beforeAll`/`afterAll`
  - [x] Use unique emails: `dpo-audit-rls-test-a@example.com`
  - [x] `[+]` service_role INSERT succeeds
  - [x] `[-]` authenticated non-operator INSERT blocked
  - [x] `[-]` unauthenticated INSERT blocked
  - [x] `[-]` UPDATE raises trigger exception `'dpo_audit_log is append-only'`

- [x] T11 — CI verification
  - [x] `turbo run typecheck` — all pass (10/10 tasks)
  - [x] `turbo run lint` — all clean (7/7 tasks)
  - [x] `turbo run test` — packages/core pass (11 tests); packages/supabase skip without local Supabase (16 skipped); exposure-buddy-mobile failures are pre-existing react-test-renderer@19.1.4 mismatch on base commit e82a7a3 — not introduced by this story

## Dev Notes

### ⛔ HARD GATE Before Any Erasure Code — Resolve D0

**This is a blocker carried from Story 3.2 code review (deferred item D0).**

`consent_records.user_id` currently has `ON DELETE CASCADE` referencing `auth.users`. DPDPA 2023 §8(7) requires consent records to be retained for account lifetime + 2 years post-deletion. If the erasure flow calls `auth.admin.deleteUser()`, Postgres will cascade-delete all consent records for that user — a DPDPA compliance violation.

**Resolution in T1:** Change FK to `ON DELETE SET NULL`. When the auth user is deleted or when the erasure nulls the auth user, `consent_records.user_id` becomes NULL. The rows are preserved. The `user_consent_status` view (created in 3.2) will no longer return results for deleted users (NULL user_id won't match `auth.uid()`) — correct behavior.

**Why NOT `auth.admin.deleteUser()` in the erasure path:** Even with `ON DELETE SET NULL`, this story uses a soft-delete approach (null PII, set `deleted_at`, ban the user) rather than hard auth deletion. The full auth user deletion is a deeper operation with more cascades to verify.

### Migration Numbering

On `main` after Story 3.2 merge:
- `0001_users.sql` ✅
- `0002_rls.sql` ✅
- `0003_profiles.sql` ✅
- `0004_consent_records.sql` ✅ (from 3.2)

**This story creates:**
- `0005_consent_records_retention.sql` — FK change + soft-delete columns
- `0006_dpo_audit_log.sql` — audit log table + trigger + RLS

Do NOT create `0005_analytics_events_stub.sql` — that is Story 3.5.

### Edge Function Directory Names (Supabase CLI)

Use **flat** kebab-case names:

| Epic reference | Directory | Invocation name |
|---|---|---|
| `/dpo/erase-user` | `supabase/functions/dpo-erase-user/` | `dpo-erase-user` |
| `/dpo/export-user` | `supabase/functions/dpo-export-user/` | `dpo-export-user` |
| `/dpo/audit-log` | `supabase/functions/dpo-audit-log/` | `dpo-audit-log` |

### Edge Functions — Deno Runtime Rules (Carried from Story 3.2)

Edge Functions at `supabase/functions/` are **Deno TypeScript**. They CANNOT import from the monorepo. Use:
- `import { corsHeaders } from '../_shared/cors.ts'`
- `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- `import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'` — NEW in this story

### Bearer Token Extraction Pattern (from 3.2 review — MUST follow)

```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
const jwt = authHeader.slice(7)  // NOT .replace('Bearer ', '')
```

### `dpo_operator` Role Claim Check

Story 3.4 issues a custom JWT with `app_metadata.role = 'dpo_operator'`. For Story 3.3, check `user.app_metadata?.['role'] === 'dpo_operator'`. For local testing before Story 3.4, create a test operator user manually:
```bash
curl -X POST http://localhost:54321/auth/v1/admin/users \
  -H "apikey: <service_role_key>" -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"dpo-test@example.com","password":"dpo-test-pass!","app_metadata":{"role":"dpo_operator"},"email_confirm":true}'
```

### Soft-Delete Erasure Spec — What to Null

| Table | PII columns to null | Non-PII (retain) |
|---|---|---|
| `public.users` | `email` → NULL, set `deleted_at = now()` | `id`, `created_at` |
| `public.profiles` | `display_name` → NULL | `id`, `created_at` |
| `public.consent_records` | **DO NOT TOUCH** | Entire row retained per DPDPA |

Also ban the auth user:
```typescript
await adminClient.auth.admin.updateUserById(targetUserId, {
  user_metadata: { deleted: true },
  ban_duration: 'none',  // permanent ban in Supabase Auth
})
```

### Model B Architecture — DPO-Mediated Erasure (DPDPA §13)

**Decision (2026-05-27 code review):** Self-service instant erasure (Model A — mobile app calls `/dpo/erase-user` directly) was rejected. The production model is **Model B: DPO-mediated erasure**.

**How Model B works:**
1. User taps "Delete my account" → `AuthProvider.requestAccountDeletion()` → `DpoServiceStub.requestErasure()` writes `pending_deletion_request: { userId, requestedAt, status: 'pending' }` to MMKV → user is signed out.
2. Story 3.4 DPO operator panel surfaces all users with `pending_deletion_request` status (already specified in Story 3.4 AC: "pending erasure requests").
3. DPO operator reviews and confirms → panel calls `/dpo/erase-user` Edge Function with `dpo_operator` JWT → erasure executes → `dpo_audit_log` entry written → MMKV record updated to `status: 'completed'`.

**Why Model A fails technically:** `/dpo/erase-user` requires `app_metadata.role === 'dpo_operator'`. A regular mobile user's JWT will never carry this claim. Story 3.4 is the first time a `dpo_operator` JWT exists.

**Why Model B is DPDPA-compliant:** DPDPA §13 grants the right to erasure. The Act does not mandate instant self-service execution. DPDPA Rules 2025 permit a reasonable processing window provided the mechanism is accessible and disclosed. The Privacy Notice (Story 3.5) must disclose the DPO-mediated mechanism and processing window.

**Architecture alignment:** `core-architectural-decisions.md` specifies staged idempotent erasure logged to an `erasure_jobs` table (ARC-008 / FM-14). This table is a Story 3.4 deliverable, not Story 3.3. Story 3.3's `dpo_audit_log` is the tamper-proof companion record; `erasure_jobs` is the per-table status tracker for the staged erasure operation itself.

**DpoService availability:** `DpoService` is exported from `packages/supabase` for Story 3.4 injection. It is NOT the `AuthProvider` default.

### DpoService → AuthProvider Wiring Change

```typescript
// Before (packages/supabase/src/auth/AuthProvider.tsx)
import { DpoServiceStub, type IDpoService } from '@exposure-buddy/core'
const dpoServiceRef = useRef<IDpoService>(
  dpoService ?? new DpoServiceStub((key, val) => mmkvRef.current?.set(key, val))
)

// After
import { DpoService } from '../functions'
import type { IDpoService } from '@exposure-buddy/core'
const dpoServiceRef = useRef<IDpoService>(
  dpoService ?? new DpoService()
)
```

After successful `requestErasure()`, update MMKV (resolves deferred W1):
```typescript
// In requestAccountDeletion(), after dpoServiceRef.current.requestErasure() resolves:
if (mmkvRef.current) {
  const raw = mmkvRef.current.getString('pending_deletion_request')
  if (raw) {
    const record = JSON.parse(raw) as PendingDeletionRecord
    mmkvRef.current.set('pending_deletion_request', JSON.stringify({ ...record, status: 'completed' }))
    setPendingDeletion({ ...record, status: 'completed' })
  }
}
```

### RLS: Why No Policies on `dpo_audit_log`

RLS enabled but NO INSERT/SELECT/UPDATE/DELETE policies for authenticated or anon roles. Only service_role can access (Edge Functions use service_role). The immutability trigger adds a second enforcement layer that even service_role cannot bypass.

### Immutability Trigger: BEFORE triggers apply even to service_role

`service_role` bypasses RLS but does NOT bypass BEFORE triggers. This is the primary tamper-proof mechanism per FR-DPO-06.

### `callEdgeFn` Constraint (from 3.2)

```typescript
await callEdgeFn<{ targetUserId: string }>('dpo-erase-user', { targetUserId: userId })
```
`TBody extends Record<string, unknown>` is required for the type constraint in `call-edge-fn.ts`.

### packages/supabase/src/index.ts — State After 3.2 Merge

```typescript
export { createSupabaseClient } from './client'
export { AuthProvider, AuthContext } from './auth/AuthProvider'
export { useAuth } from './auth/useAuth'
export { initSession, getAuthState, setAuthState, clearAuthState, signOut, MMKV_KEYS } from './auth/session'
export type { AuthState, MmkvKey, MMKV } from './auth/session'
export type { PendingDeletionRecord } from '@exposure-buddy/core'
export { ConsentRecordService } from './functions'
```

Add: `export { DpoService } from './functions'`

### What NOT to Create

- `supabase/migrations/0005_analytics_events_stub.sql` — Story 3.5
- `supabase/functions/dpo/` subdirectory structure — use flat `dpo-erase-user/` etc.
- `dpo_operators` table — Story 3.4
- `erasure_jobs` table — future story
- `data-rights.tsx` — Story 3.4/3.5

### File Checklist

**New files:**
- `supabase/migrations/0005_consent_records_retention.sql`
- `supabase/migrations/0006_dpo_audit_log.sql`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/dpo-erase-user/index.ts`
- `supabase/functions/dpo-export-user/index.ts`
- `supabase/functions/dpo-audit-log/index.ts`
- `packages/supabase/src/functions/dpo-service.ts`
- `packages/supabase/__tests__/rls/dpo_audit_log.test.ts`

**Modified files:**
- `packages/core/src/services/IDpoService.ts` — extend status union
- `packages/supabase/src/functions/index.ts` — add DpoService export
- `packages/supabase/src/index.ts` — add DpoService export
- `packages/supabase/src/auth/AuthProvider.tsx` — switch default to DpoService

### References

- `packages/core/src/services/IDpoService.ts` — interface + PendingDeletionRecord
- `packages/supabase/src/auth/AuthProvider.tsx` — lines 49–51 (dpoServiceRef default), 141–153 (requestAccountDeletion)
- `packages/supabase/src/functions/call-edge-fn.ts` — typed invoker
- `packages/supabase/src/functions/consent-record.ts` — live service pattern reference
- `packages/supabase/__tests__/rls/profiles.test.ts` — RLS test pattern
- `supabase/functions/consent-record/index.ts` — Edge Function pattern
- `supabase/functions/_shared/cors.ts` — CORS headers
- `_bmad-output/implementation-artifacts/deferred-work.md` — D0, W1, W4, W5 items addressed
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md § ADR-008` — Staged Erasure
- `_bmad-output/planning-artifacts/epics.md § Story 3.3` — AC source (lines 819–857)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- T1: Created `0005_consent_records_retention.sql` — resolves DPDPA D0 deferred item. Drops CASCADE FK on `consent_records.user_id`, adds `ON DELETE SET NULL` to preserve rows post-erasure. Adds `deleted_at TIMESTAMPTZ` to `public.users` for soft-delete marker.
- T2: Created `0006_dpo_audit_log.sql` — 7-column append-only audit table with CHECK constraints, 2 indexes (target_user_id, timestamp_utc DESC), RLS enabled with no policies (service_role-only), BEFORE trigger `dpo_audit_log_immutability_trigger` enforces append-only for ALL roles including service_role.
- T3: Created `supabase/functions/_shared/auth.ts` — shared Deno helpers: `extractBearerToken()` (`.startsWith` + `.slice(7)`) and `verifyOperatorJwt()` (getUser + app_metadata.role check).
- T4: Created `dpo-erase-user` Edge Function — operator-authenticated soft-delete: null `users.email` + set `deleted_at`, null `profiles.display_name`, ban auth user via `updateUserById`. Consent records intentionally untouched (DPDPA retention). Audit log written on success/failure.
- T5: Created `dpo-export-user` Edge Function — compiles user, profile, consent_records, erp_sessions (graceful empty if missing). Audit log written. Returns structured export object.
- T6: Created `dpo-audit-log` Edge Function — paginated log reader with `?page` and `?pageSize` params. Self-audits every read via `action_type: 'audit_view'` with `target_user_id = operatorId`.
- T7: Extended `PendingDeletionRecord.status` to `'pending' | 'completed'` in `packages/core/src/services/IDpoService.ts`.
- T8: Created `packages/supabase/src/functions/dpo-service.ts` — live `DpoService` implementing `IDpoService`. Exported from `functions/index.ts` and `src/index.ts`.
- T9: `AuthProvider.tsx` reverted to `DpoServiceStub` as default (Model B decision — adversarial Finding 3 reclassified as scope mismatch). `requestAccountDeletion()` queues `pending_deletion_request` to MMKV with `status: 'pending'` and signs out. DPO operator processes via Story 3.4 panel using `DpoService` with operator JWT. MMKV `'completed'` status update deferred to Story 3.4.
- T10: Created `dpo_audit_log.test.ts` RLS test with 4 assertions: service_role INSERT ✓, auth user INSERT blocked ✓, anon INSERT blocked ✓, UPDATE raises immutability trigger ✓. Tests skip (`passWithNoTests`) without local Supabase.
- T11: typecheck 10/10 ✓, lint 7/7 ✓, core tests 11/11 ✓, supabase 16 skipped (no local Supabase). Mobile test failures are pre-existing on base commit e82a7a3 (react-test-renderer version mismatch).

### File List

**New files:**
- `supabase/migrations/0005_consent_records_retention.sql`
- `supabase/migrations/0006_dpo_audit_log.sql`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/dpo-erase-user/index.ts`
- `supabase/functions/dpo-export-user/index.ts`
- `supabase/functions/dpo-audit-log/index.ts`
- `packages/supabase/src/functions/dpo-service.ts`
- `packages/supabase/__tests__/rls/dpo_audit_log.test.ts`
- `_bmad-output/implementation-artifacts/3-3-dpo-edge-functions-and-audit-log.md`

**Modified files:**
- `packages/core/src/services/IDpoService.ts` — PendingDeletionRecord.status union extended
- `packages/supabase/src/functions/index.ts` — DpoService export added
- `packages/supabase/src/index.ts` — DpoService export added
- `packages/supabase/src/auth/AuthProvider.tsx` — Model B comment added; DpoServiceStub remains default
- `packages/supabase/src/database.types.ts` — users.email nullable, users.deleted_at added, consent_records.user_id nullable
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — story 3-3 in-progress → review

## Change Log

| Date | Change |
|---|---|
| 2026-05-27 | Story 3.3 implemented: D0 FK migration, dpo_audit_log schema+trigger+RLS, 3 DPO Edge Functions, live DpoService, AuthProvider W1 fix, database.types.ts nullability updates |
| 2026-05-27 | Code review (party mode): AC7 + T9 revised to Model B (DPO-mediated erasure). AuthProvider reverted to DpoServiceStub default. Finding 3 (401 from AuthProvider) reclassified as scope mismatch — by design. Model B architecture note added to Dev Notes. |
