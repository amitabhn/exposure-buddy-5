# Story 3.4: DPO Operator Panel

Status: ready-for-dev

## Story

As a DPO operator,
I want a secure web panel to process data subject rights requests and review the audit log,
So that DPDPA obligations are fulfilled with per-operator accountability and a JWT-attributed audit trail for every action (FR-DPO-07, FR-DPO-08).

*Depends on: Story 3.3 merged to main.*

## Acceptance Criteria

1. **`dpo_operators` table**
   Given a `dpo_operators` table is created via migration
   When the schema is inspected
   Then the table contains: `id` (uuid PK), `email` (text UNIQUE NOT NULL), `name` (text NOT NULL), `active` (boolean NOT NULL DEFAULT true), `created_at` (timestamptz DEFAULT now()); rows are managed via seeding script — no self-registration path exists

2. **`deletion_requested_at` column on `public.users`**
   Given migration `0010_deletion_requested_at.sql` is applied
   When the schema is inspected
   Then `public.users` has a `deletion_requested_at TIMESTAMPTZ` column (nullable); `database.types.ts` reflects this as `deletion_requested_at: string | null` in Row/Update; and `AuthProvider` uses `UserErasureRequestService` as its default `dpoService` (replaces `DpoServiceStub`)

3. **`/dpo/request-deletion` Edge Function (user-authenticated)**
   Given the Edge Function is deployed at `supabase/functions/dpo-request-deletion/index.ts`
   When an authenticated mobile user submits a deletion request (POST)
   Then: (a) the user's regular Supabase JWT is validated (NOT `dpo_operator`); (b) `public.users.deletion_requested_at` is set to `now()` for that user via service_role RPC; (c) returns `200 { ok: true }`; (d) method guard: POST only

4. **`/dpo/login` Edge Function**
   Given the Edge Function is deployed at `supabase/functions/dpo-login/index.ts`
   When a DPO operator submits valid credentials (POST `{ email, password }`)
   Then: (a) Supabase Auth `signInWithPassword` is called; (b) the returned user's `app_metadata.role === 'dpo_operator'` is verified; (c) the email matches an `active = true` row in `dpo_operators`; (d) a `Set-Cookie: dpo_token=<access_token>; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` header is set; (e) `{ ok: true, token: <access_token> }` is returned in the body so the panel JS can store the token in memory; (f) on any failure (wrong credentials, not dpo_operator, inactive), returns `401 { error: 'Invalid credentials' }` — no disclosure of which field failed; (g) POST only

5. **`/dpo/logout` Edge Function**
   Given the Edge Function is deployed at `supabase/functions/dpo-logout/index.ts`
   When the operator hits logout (POST)
   Then: (a) the `dpo_token` httpOnly cookie is cleared via `Set-Cookie: dpo_token=; HttpOnly; Max-Age=0`; (b) returns `200 { ok: true }`; (c) POST only

6. **`/dpo/panel` Edge Function (serves operator panel HTML)**
   Given the Edge Function is deployed at `supabase/functions/dpo-panel/index.ts`
   When a GET request is made
   Then: (a) `Content-Type: text/html` response is returned; (b) the panel renders a login screen initially; (c) after login, the dashboard shows three sections: (1) pending erasure requests — users where `deletion_requested_at IS NOT NULL AND deleted_at IS NULL`, displayed with email and requested date; (2) pending export requests — a manual search-by-email form to initiate export; (3) paginated audit log viewer (read-only, calls `/dpo/audit-log`); (d) each erasure/export action has a confirmation step before executing; (e) the panel calls `/dpo/erase-user` and `/dpo/export-user` with the in-memory token as `Authorization: Bearer <token>`; (f) GET only for the HTML; panel JS uses POST/GET as appropriate for API calls

7. **Operator audit attribution**
   Given an authenticated DPO operator performs any rights action via the panel
   When the action completes
   Then the JWT `sub` claim (= `dpo_operators.id`) is written to `acting_operator_id` in the `dpo_audit_log` entry — this is already handled by the existing Story 3.3 Edge Functions; Story 3.4 only needs to ensure the operator JWT is correctly issued and passed

8. **Seeding script**
   Given `supabase/seed.sql` exists
   When the local Supabase instance is reset
   Then at least one example `dpo_operator` is seeded: creates a Supabase Auth user with `app_metadata.role = 'dpo_operator'` via admin API, then inserts a matching row into `dpo_operators` using the same UUID as `id`

9. **FR-DPO-07 production gate**
   Given both Story 3.3 and Story 3.4 are complete and verified in production
   When assessing production readiness
   Then FR-DPO-07 is satisfied; Stories 2.1 and 2.2 are production-releasable

## Tasks / Subtasks

- [ ] T1 — Create `supabase/migrations/0009_dpo_operators.sql` (AC: 1)
  - [ ] `CREATE TABLE IF NOT EXISTS public.dpo_operators (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`
  - [ ] Add comment: `-- dpo_operators: DPO operator identities. id matches auth.users.id for JWT sub alignment. Managed via seeding only — no self-registration.`
  - [ ] No RLS needed: only service_role accesses this table (via Edge Function login check)

- [ ] T2 — Create `supabase/migrations/0010_deletion_requested_at.sql` (AC: 2)
  - [ ] `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ`
  - [ ] Add comment: `-- deletion_requested_at: set by /dpo/request-deletion Edge Function when user submits account deletion request. Queried by DPO panel to surface pending erasure requests.`

- [ ] T3 — Create `supabase/functions/dpo-request-deletion/index.ts` (AC: 3)
  - [ ] POST-only method guard
  - [ ] CORS preflight
  - [ ] Env var fast-fail (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - [ ] Extract + verify user JWT via `adminClient.auth.getUser(jwt)` — regular user JWT (NOT `dpo_operator` role required)
  - [ ] Use service_role client to `UPDATE public.users SET deletion_requested_at = now() WHERE id = user.id`
  - [ ] Return `200 { ok: true }` — do NOT check for existing deletion_requested_at (idempotent: re-submission updates timestamp)
  - [ ] Return `401` if JWT invalid

- [ ] T4 — Create `supabase/functions/dpo-login/index.ts` (AC: 4)
  - [ ] POST-only method guard
  - [ ] CORS preflight
  - [ ] Env var fast-fail
  - [ ] Parse body: `{ email: string, password: string }` — 400 if missing
  - [ ] Create anon client (`createClient(url, anonKey)`) and call `signInWithPassword({ email, password })`
  - [ ] On auth error: return `401 { error: 'Invalid credentials' }` — DO NOT disclose which field failed
  - [ ] Verify `user.app_metadata?.role === 'dpo_operator'` — 401 if not
  - [ ] Verify email exists in `dpo_operators` table with `active = true` using service_role client — 401 if not
  - [ ] Set `Set-Cookie: dpo_token=<access_token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  - [ ] Return `200 { ok: true, token: <access_token> }` — token in body for in-memory storage by panel JS

- [ ] T5 — Create `supabase/functions/dpo-logout/index.ts` (AC: 5)
  - [ ] POST-only method guard
  - [ ] CORS preflight
  - [ ] Set `Set-Cookie: dpo_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` to clear cookie
  - [ ] Return `200 { ok: true }`

- [ ] T6 — Create `supabase/functions/dpo-panel/index.ts` (AC: 6)
  - [ ] GET-only method guard (CORS OPTIONS exempt)
  - [ ] Return `Content-Type: text/html` with the panel HTML (inline in the Edge Function)
  - [ ] Panel HTML structure (all JS inline in `<script>` tag, no external dependencies):
    - Login form (hidden after auth): email + password fields + "Login" button
    - Dashboard (hidden before auth): three sections below
    - Section 1: Pending Erasure Requests — JS fetches `POST /dpo/panel-data` or calls Supabase REST directly with operator token to query users where `deletion_requested_at IS NOT NULL AND deleted_at IS NULL`; shows email, requested date, "Confirm Erasure" button (with confirmation dialog)
    - Section 2: Export — search by email/userId; "Trigger Export" button shows exported data in a scrollable pre block
    - Section 3: Audit Log — paginated table; "Previous" / "Next" buttons
    - Logout button
  - [ ] Panel JS flow: login → store token in closure variable → pass as `Authorization: Bearer <token>` on all `/dpo/*` calls → logout clears variable + calls `/dpo/logout`
  - [ ] Panel JS uses `fetch()` to call existing Edge Functions: `/dpo/erase-user`, `/dpo/export-user`, `/dpo/audit-log`, `/dpo/login`, `/dpo/logout`
  - [ ] To query pending erasure requests, the panel calls a new read endpoint — use Supabase REST directly via the token: `GET https://<project>.supabase.co/rest/v1/users?deletion_requested_at=not.is.null&deleted_at=is.null&select=id,email,deletion_requested_at` — OR add a helper Edge Function `/dpo/pending-requests` (GET, operator-authenticated) that queries and returns the list. Choose the helper function approach (avoids CORS issues with direct PostgREST + RLS complexity)
  - [ ] **IMPORTANT**: `SUPABASE_URL` is available in Deno.env — use it to construct API call URLs in the panel JS

- [ ] T6a — Create `supabase/functions/dpo-pending-requests/index.ts` (support for panel Section 1)
  - [ ] GET-only method guard
  - [ ] Operator JWT verification via `verifyOperatorJwt()` from `_shared/auth.ts`
  - [ ] Query `SELECT id, email, deletion_requested_at FROM public.users WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL ORDER BY deletion_requested_at ASC`
  - [ ] Write `dpo_audit_log` entry: `action_type: 'audit_view'`, `target_user_id = operatorId` (consistent with audit-log pattern)
  - [ ] Return `200 { requests: [...] }`

- [ ] T7 — Create `packages/supabase/src/functions/user-erasure-request-service.ts` (AC: 2)
  - [ ] `UserErasureRequestService` class implementing `IDpoService` from `@exposure-buddy/core`
  - [ ] `async requestErasure(userId: string): Promise<void>` calls `callEdgeFn('dpo-request-deletion', { userId })`
  - [ ] Export from `packages/supabase/src/functions/index.ts`
  - [ ] Export from `packages/supabase/src/index.ts`

- [ ] T8 — Update `packages/supabase/src/auth/AuthProvider.tsx` (AC: 2)
  - [ ] Replace `DpoServiceStub` default with `UserErasureRequestService`:
    - Remove import: `import { DpoServiceStub, type IDpoService, type PendingDeletionRecord } from '@exposure-buddy/core'`
    - Add imports: `import { UserErasureRequestService } from '../functions'` and `import type { IDpoService, PendingDeletionRecord } from '@exposure-buddy/core'`
    - Change `dpoServiceRef` default: `dpoService ?? new UserErasureRequestService()`
  - [ ] The try-catch around `requestErasure()` (from Story 3.3 T18) is preserved unchanged
  - [ ] After successful erasure, update MMKV `pending_deletion_request` status to `'completed'` (resolves deferred W1 from Story 2.4):
    ```typescript
    // After try-catch block, before sessionSignOut:
    if (mmkvRef.current) {
      const raw = mmkvRef.current.getString('pending_deletion_request')
      if (raw) {
        try {
          const record = JSON.parse(raw) as PendingDeletionRecord
          mmkvRef.current.set('pending_deletion_request', JSON.stringify({ ...record, status: 'completed' }))
          setPendingDeletion({ ...record, status: 'completed' })
        } catch { /* ignore parse error */ }
      }
    }
    ```

- [ ] T9 — Update `packages/supabase/src/database.types.ts`
  - [ ] Add `deletion_requested_at: string | null` to `users.Row`
  - [ ] Add `deletion_requested_at?: string | null` to `users.Insert`
  - [ ] Add `deletion_requested_at?: string | null` to `users.Update`

- [ ] T10 — Create `supabase/seed.sql` (AC: 8)
  - [ ] Document: seeding requires a manual step to create the Supabase Auth user first (use `supabase` CLI or Admin API — cannot be done in SQL alone)
  - [ ] Provide seed pattern:
    ```sql
    -- Run AFTER creating auth user via Admin API:
    -- curl -X POST http://localhost:54321/auth/v1/admin/users \
    --   -H "apikey: <service_role_key>" \
    --   -H "Authorization: Bearer <service_role_key>" \
    --   -H "Content-Type: application/json" \
    --   -d '{"email":"dpo@example.com","password":"dpo-operator-pass!","app_metadata":{"role":"dpo_operator"},"email_confirm":true}'
    -- Then copy the returned user UUID into the INSERT below:
    INSERT INTO public.dpo_operators (id, email, name, active)
    VALUES ('<auth-user-uuid>', 'dpo@example.com', 'DPO Admin', true)
    ON CONFLICT (email) DO NOTHING;
    ```
  - [ ] Note: The seed UUID must match the auth.users.id created by the Admin API call

- [ ] T11 — CI verification
  - [ ] `turbo run typecheck` — all pass
  - [ ] `turbo run lint` — all clean
  - [ ] `turbo run test` — core and supabase pass/skip

## Dev Notes

### Migration Numbering

After Story 3.3, migrations on `main`:
- `0001_users.sql` ✅
- `0002_rls.sql` ✅
- `0003_profiles.sql` ✅
- `0004_consent_records.sql` ✅ (3.2)
- `0005_consent_records_retention.sql` ✅ (3.3)
- `0006_dpo_audit_log.sql` ✅ (3.3)
- `0007_perform_user_erasure_fn.sql` ✅ (3.3)
- `0008_dpo_audit_log_truncate_guard.sql` ✅ (3.3)

**This story creates:**
- `0009_dpo_operators.sql`
- `0010_deletion_requested_at.sql`

Do NOT skip numbers. Do NOT create `0009_analytics_events_stub.sql` — that is Story 3.5.

### Edge Function Runtime Rules (carried from 3.2/3.3)

Edge Functions in `supabase/functions/` are **Deno TypeScript**. They CANNOT import from the monorepo.

Use:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'
```

Do NOT import from `packages/supabase`, `packages/core`, or any monorepo path.

### Edge Function Directory Names

Flat kebab-case names (no subdirectory nesting):

| Function | Directory | Purpose |
|---|---|---|
| `/dpo/request-deletion` | `dpo-request-deletion/` | User submits deletion request |
| `/dpo/login` | `dpo-login/` | Operator login |
| `/dpo/logout` | `dpo-logout/` | Operator logout |
| `/dpo/panel` | `dpo-panel/` | Serves operator panel HTML |
| `/dpo/pending-requests` | `dpo-pending-requests/` | Returns pending erasure queue |

### `verifyOperatorJwt()` — Already Implemented

`supabase/functions/_shared/auth.ts` (from Story 3.3) exports both `extractBearerToken()` and `verifyOperatorJwt()`. Use them in all operator-authenticated functions. Do NOT reimplement.

```typescript
// Already available — just import:
import { extractBearerToken, verifyOperatorJwt } from '../_shared/auth.ts'
```

`verifyOperatorJwt()` checks `user.app_metadata.role === 'dpo_operator'` and returns `{ operatorId: user.id }`. The `operatorId` is the Supabase auth user UUID, which equals `dpo_operators.id` (alignment guaranteed by seeding pattern).

### `dpo-request-deletion` — User JWT Verification Pattern

This function uses the **regular user JWT verification pattern** (same as `consent-record`), NOT `verifyOperatorJwt()`:

```typescript
// Pattern from supabase/functions/consent-record/index.ts:
const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt)
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
// Then use user.id to update public.users
```

The ANON_KEY is NOT needed for this — just SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

### `dpo-login` — Supabase Auth `signInWithPassword`

Use `supabase-js` anon client (not service_role) for `signInWithPassword`:

```typescript
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const anonClient = createClient(supabaseUrl, ANON_KEY)
const { data, error } = await anonClient.auth.signInWithPassword({ email, password })
if (error || !data.session) {
  return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, ... })
}
// Then verify app_metadata + dpo_operators row using service_role client
```

**SUPABASE_ANON_KEY** is a third env var needed by `dpo-login` (in addition to SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).

### httpOnly Cookie Security

Cookie attributes for the dpo_token:
```
Set-Cookie: dpo_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800
```

- `HttpOnly` — JS cannot read it (XSS mitigation per AC)
- `Secure` — HTTPS only
- `SameSite=Strict` — CSRF mitigation
- `Max-Age=28800` — 8 hours (≤8h per AC)

**For logout** (clear cookie):
```
Set-Cookie: dpo_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

### Panel JS Architecture (dpo-panel)

The panel is a single self-contained HTML file served by the Edge Function. All JS is inline (no external CDN dependencies). Key architecture:

```javascript
// Token stored in closure — NOT localStorage, NOT cookie access (XSS mitigation)
let operatorToken = null

async function login(email, password) {
  const res = await fetch('/functions/v1/dpo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) { showError('Invalid credentials'); return }
  const { token } = await res.json()
  operatorToken = token  // in-memory only
  showDashboard()
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${operatorToken}`
  }
}

async function loadPendingErasures() {
  const res = await fetch('/functions/v1/dpo-pending-requests', {
    headers: apiHeaders()
  })
  // ... render table
}
```

Edge Function URLs follow the pattern `/functions/v1/<function-name>`. When deployed to Supabase, use the full URL `${SUPABASE_URL}/functions/v1/<name>`. In the panel HTML, use relative paths or inject the URL via template substitution in the Edge Function before serving.

**To inject SUPABASE_URL into panel HTML:**
```typescript
// In dpo-panel/index.ts:
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const html = PANEL_HTML_TEMPLATE.replace('__SUPABASE_URL__', supabaseUrl)
return new Response(html, { headers: { 'Content-Type': 'text/html' } })
```

### `UserErasureRequestService` — New Mobile-Side Service

`UserErasureRequestService` is the production replacement for `DpoServiceStub` in `AuthProvider`. It calls `/dpo/request-deletion` (user-authenticated) to persist the deletion request server-side.

```typescript
// packages/supabase/src/functions/user-erasure-request-service.ts
import type { IDpoService } from '@exposure-buddy/core'
import { callEdgeFn } from './call-edge-fn'

export class UserErasureRequestService implements IDpoService {
  async requestErasure(userId: string): Promise<void> {
    await callEdgeFn('dpo-request-deletion', { userId })
  }
}
```

**`DpoService`** (Story 3.3) remains unchanged and is used by the operator panel JS when it calls `/dpo/erase-user`. Do NOT modify `DpoService`.

### `AuthProvider` Default Change

Story 3.4 changes the `dpoService` default from `DpoServiceStub` to `UserErasureRequestService`:

```typescript
// Before (Story 3.3):
import { DpoServiceStub, type IDpoService, type PendingDeletionRecord } from '@exposure-buddy/core'
const dpoServiceRef = useRef<IDpoService>(
  dpoService ?? new DpoServiceStub((key, val) => mmkvRef.current?.set(key, val))
)

// After (Story 3.4):
import { UserErasureRequestService } from '../functions'
import type { IDpoService, PendingDeletionRecord } from '@exposure-buddy/core'
const dpoServiceRef = useRef<IDpoService>(
  dpoService ?? new UserErasureRequestService()
)
```

**What stays the same:**
- The `dpoService?: IDpoService` prop injection seam — tests can still inject `DpoServiceStub`
- The try-catch around `requestErasure()` (Story 3.3 T18)
- The sign-out logic

**What changes:**
- Default implementation: `DpoServiceStub` → `UserErasureRequestService`
- After successful `requestErasure()`, update MMKV `pending_deletion_request.status` to `'completed'` (resolves deferred W1)

### MMKV `pending_deletion_request` Status Update (resolves W1)

Add this block in `requestAccountDeletion()` immediately after the try-catch (before `sessionSignOut`):

```typescript
// Resolve W1: update MMKV record to 'completed' now that server-side request is submitted
if (mmkvRef.current) {
  try {
    // eslint-disable-next-line i18next/no-literal-string
    const raw = mmkvRef.current.getString('pending_deletion_request')
    if (raw) {
      const record = JSON.parse(raw) as PendingDeletionRecord
      mmkvRef.current.set(
        'pending_deletion_request',
        JSON.stringify({ ...record, status: 'completed' })
      )
      setPendingDeletion({ ...record, status: 'completed' })
    }
  } catch {
    // Ignore parse error — status update is best-effort
  }
}
```

Note: `DpoServiceStub` is still available in `@exposure-buddy/core` for test injection and is NOT deleted.

### `dpo_operators` Table — No RLS Required

The `dpo_operators` table is accessed only via service_role (in the `/dpo/login` Edge Function). No RLS policies are needed. The table does NOT need to be enabled for RLS.

However, do NOT disable RLS via `ALTER TABLE public.dpo_operators DISABLE ROW LEVEL SECURITY` — instead just omit `ENABLE ROW LEVEL SECURITY` from the migration. Without RLS enabled, the table is accessible only to service_role and postgres roles (correct behavior for a server-only table).

### `dpo-pending-requests` — RLS Consideration

The query `SELECT id, email, deletion_requested_at FROM public.users WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL` uses service_role (bypasses RLS). This is correct — the DPO panel has legitimate authority to view pending requests.

**NOTE**: `public.users.email` is nullable after Story 3.3 (erased users have `email = NULL`). The `deleted_at IS NULL` filter correctly excludes already-erased users. However, users whose email was erased but `deleted_at` is somehow NULL would still appear. The `dpo-erase-user` function sets both simultaneously via `perform_user_erasure()` RPC — so this edge case should not occur in practice.

### `callEdgeFn` Constraint (inherited from Story 3.2)

```typescript
await callEdgeFn<{ userId: string }>('dpo-request-deletion', { userId: userId })
```

`TBody extends Record<string, unknown>` — always use an object body, never a primitive.

### packages/supabase/src/index.ts — State After Story 3.3

```typescript
export { createSupabaseClient } from './client'
export type { Database, TypedSupabaseClient } from './client'
export { AuthProvider, AuthContext } from './auth/AuthProvider'
export { useAuth } from './auth/useAuth'
export { initSession, getAuthState, setAuthState, clearAuthState, signOut, MMKV_KEYS } from './auth/session'
export type { AuthState, MmkvKey, MMKV } from './auth/session'
export type { PendingDeletionRecord } from '@exposure-buddy/core'
export { ConsentRecordService } from './functions'
export { DpoService } from './functions'
```

**Story 3.4 adds:**
- `export { UserErasureRequestService } from './functions'`

### What NOT to Create

- `supabase/migrations/0009_analytics_events_stub.sql` — Story 3.5
- `dpo_operators` RLS policies — table is service_role only, no RLS needed
- `erasure_jobs` table — NOT in this story (ARC-008 mentions it for future staged erasure)
- Any changes to `supabase/functions/_shared/auth.ts` — it is complete and correct from Story 3.3
- A separate `DpoOperatorService` in packages/supabase — not needed; operator actions are done directly via fetch in the panel JS
- Any React/Next.js frontend in `apps/web` — the panel is a self-contained HTML file served by an Edge Function

### File Checklist

**New migration files:**
- `supabase/migrations/0009_dpo_operators.sql`
- `supabase/migrations/0010_deletion_requested_at.sql`

**New Edge Function files:**
- `supabase/functions/dpo-request-deletion/index.ts`
- `supabase/functions/dpo-login/index.ts`
- `supabase/functions/dpo-logout/index.ts`
- `supabase/functions/dpo-panel/index.ts`
- `supabase/functions/dpo-pending-requests/index.ts`

**New package files:**
- `packages/supabase/src/functions/user-erasure-request-service.ts`

**Modified files:**
- `packages/supabase/src/functions/index.ts` — add `UserErasureRequestService` export
- `packages/supabase/src/index.ts` — add `UserErasureRequestService` export
- `packages/supabase/src/auth/AuthProvider.tsx` — switch default; add MMKV status update
- `packages/supabase/src/database.types.ts` — add `deletion_requested_at` to users
- `supabase/seed.sql` — new or updated operator seeding instructions

**No new RLS test files** — the `dpo_operators` table and `deletion_requested_at` column don't require new RLS test suites. The `/dpo/request-deletion` function is user-authenticated (covered by existing pattern).

### References

- Story 3.3 file: `_bmad-output/implementation-artifacts/3-3-dpo-edge-functions-and-audit-log.md`
- `supabase/functions/_shared/auth.ts` — `extractBearerToken()`, `verifyOperatorJwt()`
- `supabase/functions/consent-record/index.ts` — user JWT verification pattern
- `supabase/functions/dpo-erase-user/index.ts` — operator action pattern
- `supabase/functions/dpo-audit-log/index.ts` — pagination pattern, operator auth pattern
- `packages/supabase/src/functions/dpo-service.ts` — `IDpoService` implementation pattern
- `packages/supabase/src/functions/call-edge-fn.ts` — `callEdgeFn<TBody>()` signature
- `packages/supabase/src/auth/AuthProvider.tsx` — full file (lines 49-51 for dpoServiceRef, 141+ for requestAccountDeletion)
- `packages/core/src/services/IDpoService.ts` — `IDpoService` interface + `PendingDeletionRecord`
- `_bmad-output/implementation-artifacts/deferred-work.md` — W1 (MMKV completed status) resolved in T8
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md § ADR-008` — Staged Erasure (note: `erasure_jobs` table is future work, NOT this story)
- `_bmad-output/planning-artifacts/epics.md § Story 3.4` — AC source (lines 859–892)

## Dev Agent Record

### Agent Model Used

(to be filled)

### Debug Log References

None.

### Completion Notes List

(to be filled by dev agent)

### File List

(to be filled by dev agent)

## Change Log

| Date | Change |
|---|---|
| 2026-05-27 | Story 3.4 created — DPO Operator Panel (FR-DPO-07 second half) |
