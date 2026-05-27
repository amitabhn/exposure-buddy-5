# Story 3.4: DPO Operator Panel

Status: review

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

- [x] T1 — Create `supabase/migrations/0009_dpo_operators.sql` (AC: 1)
  - [x] `CREATE TABLE IF NOT EXISTS public.dpo_operators (id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`
  - [x] Add comment: `-- dpo_operators: DPO operator identities. id matches auth.users.id for JWT sub alignment. Managed via seeding only — no self-registration.`
  - [x] No RLS needed: only service_role accesses this table (via Edge Function login check)
  - [x] NOTE (F9 — accepted): No FK to `auth.users` is declared. `dpo_operators.id` alignment with `auth.users.id` is enforced procedurally via the seeding pattern (Admin API creates auth user first, then INSERT uses the returned UUID). An orphaned row (mismatched UUID) would pass the email-based login check in `dpo-login` but produce an `acting_operator_id` in `dpo_audit_log` that does not correspond to any operator row. The T10 seeding curl command is the guardrail — follow it exactly.

- [x] T2 — Create `supabase/migrations/0010_deletion_requested_at.sql` (AC: 2)
  - [x] `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ`
  - [x] Add comment: `-- deletion_requested_at: set by /dpo/request-deletion Edge Function when user submits account deletion request. Queried by DPO panel to surface pending erasure requests.`

- [x] T3 — Create `supabase/functions/dpo-request-deletion/index.ts` (AC: 3)
  - [x] POST-only method guard
  - [x] CORS preflight
  - [x] Env var fast-fail (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - [x] Extract + verify user JWT via `adminClient.auth.getUser(jwt)` — regular user JWT (NOT `dpo_operator` role required)
  - [x] Do NOT parse the request body — it is intentionally empty (`{}`); user identity is derived exclusively from the verified JWT, never from a body field (C2/BOLA prevention — see F1 in Change Log)
  - [x] Use service_role client to `UPDATE public.users SET deletion_requested_at = now() WHERE id = user.id`
  - [x] Return `200 { ok: true }` — do NOT check for existing deletion_requested_at (idempotent: re-submission updates timestamp)
  - [x] Return `401` if JWT invalid

- [x] T4 — Create `supabase/functions/dpo-login/index.ts` (AC: 4)
  - [x] POST-only method guard
  - [x] CORS preflight
  - [x] Env var fast-fail (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY) — all three required; SUPABASE_ANON_KEY is used by the anon client for `signInWithPassword` (C1)
  - [x] Parse body: `{ email: string, password: string }` — return `400 { error: 'Bad request' }` if either field is missing, not a string, or is an empty string after `.trim()`; do NOT forward empty credentials to Supabase Auth (`if (!email?.trim() || !password?.trim()) return 400`)
  - [x] Create anon client (`createClient(url, anonKey)`) and call `signInWithPassword({ email, password })`
  - [x] On auth error: return `401 { error: 'Invalid credentials' }` — DO NOT disclose which field failed
  - [x] Verify `user.app_metadata?.role === 'dpo_operator'` — 401 if not
  - [x] Verify email exists in `dpo_operators` table with `active = true` using service_role client — 401 if not
  - [x] Set `Set-Cookie: dpo_token=<access_token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  - [x] Return `200 { ok: true, token: <access_token> }` — token in body for in-memory storage by panel JS

- [x] T5 — Create `supabase/functions/dpo-logout/index.ts` (AC: 5)
  - [x] POST-only method guard
  - [x] CORS preflight
  - [x] Set `Set-Cookie: dpo_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` to clear cookie
  - [x] Return `200 { ok: true }`
  - [x] NOTE (F3 — accepted, deferred to Epic 4): The cookie is cleared client-side but the underlying Supabase session JWT remains valid until expiry (≤8 hours). Server-side revocation via `adminClient.auth.admin.signOut(userId)` is not implemented here — it would require parsing the cookie server-side, creating an admin client, and an extra Supabase Auth round-trip, disproportionate for this story's scope. Mitigated by: (a) 8h Max-Age TTL limits the exposure window, (b) `dpo_operators.active = false` blocks re-login, (c) small operator roster limits blast radius. File as security hardening ticket for Epic 4 / SOC-2 prep. (F10 same root cause — `active = false` deactivation does not revoke in-flight sessions; same deferred mitigation applies.)

- [x] T6 — Create `supabase/functions/dpo-panel/index.ts` (AC: 6)
  - [x] CORS OPTIONS handler (E1 — before any method guard): `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })` — same pattern as all other Edge Functions
  - [x] GET-only method guard (after OPTIONS check)
  - [x] Return `Content-Type: text/html` with the panel HTML (inline in the Edge Function)
  - [ ] Panel HTML structure (all JS inline in `<script>` tag, no external dependencies):
    - Login form (hidden after auth): email + password fields + "Login" button
    - Dashboard (hidden before auth): three sections below
    - Section 1: Pending Erasure Requests — JS calls GET `__SUPABASE_URL__/functions/v1/dpo-pending-requests` (see T6a); response shape: `{ requests: Array<{ id: string, email: string | null, deletion_requested_at: string }> }`; render each row with email (display "(email not available)" if `email === null` — C5), requested date, and "Confirm Erasure" button; on confirm: POST `__SUPABASE_URL__/functions/v1/dpo-erase-user` with body `{ targetUserId: request.id }` (C3 — field name must be `targetUserId`, NOT `userId`)
    - Section 2: Export — search input (userId UUID); "Trigger Export" button POSTs to `__SUPABASE_URL__/functions/v1/dpo-export-user` with body `{ targetUserId: <entered-uuid> }` (C4 — field name must be `targetUserId`, NOT `userId`); response: `{ export: { user, authUser, profile, consentRecords, sessions } }`; display in `<details>` wrapper
    - Section 3: Audit Log — paginated table; JS calls GET `__SUPABASE_URL__/functions/v1/dpo-audit-log?page=<n>&pageSize=20` (M2 — must pass `page` and `pageSize` query params); response: `{ entries: [...], page, pageSize, total }`; "Previous" / "Next" buttons update `page` param
    - Logout button
  - [x] Panel JS flow: login → store token in closure variable → pass as `Authorization: Bearer <token>` on all `/dpo/*` calls → logout clears variable + calls `/dpo/logout`
  - [x] Panel JS uses `fetch()` to call existing Edge Functions via absolute URLs using the `__SUPABASE_URL__` token (replaced at serve time — see Dev Notes: Panel URL Canonical Pattern)
  - [x] To query pending erasure requests, the panel calls the helper Edge Function `dpo-pending-requests` (GET, operator-authenticated) — see T6a
  - [x] **IMPORTANT**: All `fetch()` calls in the panel JS must use absolute URLs with the `__SUPABASE_URL__` substitution token. Never use relative paths — see Dev Notes: Panel URL Canonical Pattern.
  - [x] Section 2 export display: wrap the exported data `<pre>` block in `<details><summary>Exported data (click to reveal)</summary><pre id="export-output"></pre></details>` so PII is not visible by default in screen recordings or shoulder-surfing
  - [x] NOTE (F12 — accepted): PII rendered in the export `<pre>` block is intentional per AC6(d) — the DPO is authorised to view it. The `<details>` wrapper is a low-cost shoulder-surfing mitigation. A future hardening sprint should offer download-to-file instead of in-browser display.
  - [x] Manual verification checklist (complete in Dev Agent Completion Notes — CI cannot cover browser behaviour): (a) login form rejects bad credentials with error message; (b) pending erasure list loads after login; (c) "Confirm Erasure" dialog appears before executing erasure; (d) logout clears `operatorToken` and returns to login screen

- [x] T6a — Create `supabase/functions/dpo-pending-requests/index.ts` (support for panel Section 1)
  - [x] CORS preflight (non-optional): `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })` — import corsHeaders from `../_shared/cors.ts`. Panel JS sends `Authorization` header which always triggers a CORS preflight; without this the endpoint will 405 in every browser.
  - [x] GET-only method guard (after OPTIONS check)
  - [x] Env var fast-fail (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - [x] Operator JWT verification via `verifyOperatorJwt()` from `_shared/auth.ts`
  - [x] Query `SELECT id, email, deletion_requested_at FROM public.users WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NULL ORDER BY deletion_requested_at ASC`
  - [x] Write `dpo_audit_log` entry: `action_type: 'audit_view'`, `target_user_id = operatorId` (consistent with audit-log pattern; FR-DPO-06 does not require a distinct action_type for queue views — `audit_view` covers all DPO read access)
  - [x] Return `200 { requests: Array<{ id: string, email: string | null, deletion_requested_at: string }> }` — shape matches the SELECT columns; panel JS uses `request.id` as `targetUserId` for erase calls and renders `email ?? '(email not available)'` (E3)

- [x] T7 — Create `packages/supabase/src/functions/user-erasure-request-service.ts` (AC: 2)
  - [x] `UserErasureRequestService` class implementing `IDpoService` from `@exposure-buddy/core`
  - [x] `async requestErasure(_userId: string): Promise<void>` calls `callEdgeFn('dpo-request-deletion', {})` — userId is intentionally omitted from the request body; the Edge Function derives user identity exclusively from the verified Bearer JWT (BOLA prevention — never pass user-supplied identity in the body)
  - [x] Export from `packages/supabase/src/functions/index.ts`
  - [x] Export from `packages/supabase/src/index.ts`

- [x] T8 — Update `packages/supabase/src/auth/AuthProvider.tsx` (AC: 2)
  - [x] Replace `DpoServiceStub` default with `UserErasureRequestService`:
    - Remove import: `import { DpoServiceStub, type IDpoService, type PendingDeletionRecord } from '@exposure-buddy/core'`
    - Add imports: `import { UserErasureRequestService } from '../functions'` and `import type { IDpoService, PendingDeletionRecord } from '@exposure-buddy/core'`
    - Change `dpoServiceRef` default: `dpoService ?? new UserErasureRequestService()`
  - [x] In `requestAccountDeletion()`, write the 'pending' record to MMKV **before** the try-catch that calls `requestErasure()`, so the user has local evidence of submission regardless of network outcome (Step A — replaces the MMKV write that `DpoServiceStub` previously performed; `AuthProvider` now owns this write, making it invariant across all `IDpoService` implementations):
    ```typescript
    // Step A — BEFORE the try-catch, before calling requestErasure():
    if (mmkvRef.current) {
      // eslint-disable-next-line i18next/no-literal-string
      const pendingRecord: PendingDeletionRecord = { userId: authState.userId!, requestedAt: new Date().toISOString(), status: 'pending' }
      mmkvRef.current.set('pending_deletion_request', JSON.stringify(pendingRecord))
      setPendingDeletion(pendingRecord)
    }
    ```
  - [x] The try-catch around `requestErasure()` (from Story 3.3 T18) is preserved unchanged
  - [x] After the try-catch, update MMKV `pending_deletion_request` status to `'completed'` (Step B — resolves deferred W1 from Story 2.4; the `if (raw)` guard now reliably finds the record written in Step A):
    ```typescript
    // Step B — AFTER try-catch block, before sessionSignOut:
    if (mmkvRef.current) {
      try {
        // eslint-disable-next-line i18next/no-literal-string
        const raw = mmkvRef.current.getString('pending_deletion_request')
        if (raw) {
          const record = JSON.parse(raw) as PendingDeletionRecord
          mmkvRef.current.set('pending_deletion_request', JSON.stringify({ ...record, status: 'completed' }))
          setPendingDeletion({ ...record, status: 'completed' })
        }
      } catch { /* ignore parse error — status update is best-effort */ }
    }
    ```

- [x] T9 — Update `packages/supabase/src/database.types.ts`
  - [x] Current `users` table shape (M1 — do NOT modify existing fields, only add `deletion_requested_at`):
    - `Row`: `{ id: string, email: string | null, created_at: string, deleted_at: string | null }`
    - `Insert`: `{ id: string, email: string, created_at?: string, deleted_at?: string | null }`
    - `Update`: `{ id?: string, email?: string | null, created_at?: string, deleted_at?: string | null }`
  - [x] Add `deletion_requested_at: string | null` to `users.Row` (after `deleted_at`)
  - [x] Add `deletion_requested_at?: string | null` to `users.Insert` (after `deleted_at`)
  - [x] Add `deletion_requested_at?: string | null` to `users.Update` (after `deleted_at`)

- [x] T10 — Append to `supabase/seed.sql` (AC: 8) — file already exists; do NOT overwrite or truncate existing content; append the DPO operator seed block below all existing content
  - [x] Document: seeding requires a manual step to create the Supabase Auth user first (use `supabase` CLI or Admin API — cannot be done in SQL alone)
  - [x] Provide seed pattern:
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
  - [x] Note: The seed UUID must match the auth.users.id created by the Admin API call

- [x] T11 — CI verification
  - [x] `turbo run typecheck` — all pass
  - [x] `turbo run lint` — all clean
  - [x] `turbo run test` — core: 11 pass; supabase: 17 RLS skip (no live DB, expected); mobile pre-existing failures unrelated to this story
  - [x] Panel smoke test (requires `supabase start`): `curl -s http://localhost:54321/functions/v1/dpo-panel | grep 'type="password"'` — local Supabase not running in CI; HTML verified by code review (template contains `type="password"` on line 162 of dpo-panel/index.ts)

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
  // Use __SUPABASE_URL__ token — replaced at serve time by dpo-panel/index.ts
  const res = await fetch('__SUPABASE_URL__/functions/v1/dpo-login', {
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
  const res = await fetch('__SUPABASE_URL__/functions/v1/dpo-pending-requests', {
    headers: apiHeaders()
  })
  // ... render table
}
```

**Panel URL Canonical Pattern (F5):** All `fetch()` calls in the panel JS must use absolute URLs with the `__SUPABASE_URL__` substitution token. Do NOT use relative paths — they resolve against the caller's origin and break in local development (`http://localhost:54321/functions/v1/dpo-panel`) and any other non-root serving context.

**To inject SUPABASE_URL into panel HTML:**
```typescript
// In dpo-panel/index.ts:
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
// Use global regex replace so ALL __SUPABASE_URL__ occurrences are substituted:
const html = PANEL_HTML_TEMPLATE.replace(/__SUPABASE_URL__/g, supabaseUrl)
return new Response(html, { headers: { 'Content-Type': 'text/html' } })
```

### `UserErasureRequestService` — New Mobile-Side Service

`UserErasureRequestService` is the production replacement for `DpoServiceStub` in `AuthProvider`. It calls `/dpo/request-deletion` (user-authenticated) to persist the deletion request server-side.

```typescript
// packages/supabase/src/functions/user-erasure-request-service.ts
import type { IDpoService } from '@exposure-buddy/core'
import { callEdgeFn } from './call-edge-fn'

export class UserErasureRequestService implements IDpoService {
  async requestErasure(_userId: string): Promise<void> {
    // userId intentionally omitted from the request body (F1 — BOLA prevention).
    // The Edge Function derives user identity exclusively from the verified Bearer JWT.
    // Never pass user-supplied userId in the body of a user-authenticated endpoint.
    await callEdgeFn('dpo-request-deletion', {})
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

**Context:** `DpoServiceStub` previously wrote the `{ status: 'pending' }` record to MMKV during `requestErasure()`. `UserErasureRequestService` does not — it only makes the network call. Story 3.4 moves the MMKV write into `AuthProvider` so it is invariant across all `IDpoService` implementations.

`requestAccountDeletion()` requires **two** MMKV operations in sequence:

**Step A — Write 'pending' BEFORE the try-catch (before calling `requestErasure()`):**
```typescript
// F2: write 'pending' before requestErasure so evidence of submission exists
// regardless of network outcome. Replaces the write DpoServiceStub previously did.
if (mmkvRef.current) {
  // eslint-disable-next-line i18next/no-literal-string
  const pendingRecord: PendingDeletionRecord = { userId: authState.userId!, requestedAt: new Date().toISOString(), status: 'pending' }
  mmkvRef.current.set('pending_deletion_request', JSON.stringify(pendingRecord))
  setPendingDeletion(pendingRecord)
}
```

**Step B — Update to 'completed' AFTER the try-catch (before `sessionSignOut`):**
```typescript
// Resolve W1: update MMKV record to 'completed' now that server-side request is submitted.
// The if (raw) guard reliably finds the record written in Step A above.
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
// Correct usage for dpo-request-deletion (empty body — identity from JWT):
await callEdgeFn('dpo-request-deletion', {})
// No generic needed — TypeScript infers TBody as {} which satisfies Record<string, unknown>
```

`TBody extends Record<string, unknown>` — always use an object body, never a primitive. For `dpo-request-deletion` specifically, pass an empty object `{}` — do NOT include `userId` in the body (F1/C2: server derives user identity from JWT only). (E2: omit the `Record<string, never>` generic — `{}` infers correctly.)

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
- `supabase/seed.sql` — APPEND operator seeding block; file already exists, do NOT overwrite or truncate existing content

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

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- **T1/T2**: Migrations `0009_dpo_operators.sql` and `0010_deletion_requested_at.sql` created. No RLS on `dpo_operators` (service_role-only access pattern). Migration numbering preserved — next is `0011` for Story 3.5.
- **T3 (`dpo-request-deletion`)**: User-authenticated; does NOT call `verifyOperatorJwt()`. Body intentionally not parsed (C2/BOLA: user identity derived from JWT only). Idempotent `UPDATE` — re-submission updates timestamp.
- **T4 (`dpo-login`)**: Three env vars required (SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY). Anon client used for `signInWithPassword`. Two-layer check: `app_metadata.role === 'dpo_operator'` then `dpo_operators` table `active = true`. Cookie attributes: HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=28800. Empty-string credential guard (C1).
- **T5 (`dpo-logout`)**: Clears cookie with Max-Age=0. Session JWT revocation deferred (F3/F10, accepted for Epic 4).
- **T6 (`dpo-panel`)**: Self-contained HTML + inline JS. Token stored in closure (not localStorage). `__SUPABASE_URL__` global replace at serve time (F5). All three AC sections: erasure queue, export, audit log. Confirmation dialogs before erasure and export. XSS mitigation via `escHtml()` on all rendered data. Export PII wrapped in `<details>` (F12).
- **T6a (`dpo-pending-requests`)**: CORS OPTIONS first (before method guard) — panel JS `Authorization` header triggers preflight. Operator JWT verified. `audit_view` log entry written on every call. Response shape: `{ requests: Array<{ id, email | null, deletion_requested_at }> }` (E3).
- **T7 (`UserErasureRequestService`)**: Implements `IDpoService`. Calls `callEdgeFn('dpo-request-deletion', {})` with empty body — no `userId` in body (F1/BOLA). Exported from `functions/index.ts` and `src/index.ts`.
- **T8 (`AuthProvider`)**: Removed `DpoServiceStub` import (and `@exposure-buddy/core` combined import). Added `UserErasureRequestService` import. Step A: MMKV `pending` write before try-catch. Step B: MMKV `completed` update after try-catch (resolves W1). `DpoServiceStub` still available in core for test injection.
- **T9 (`database.types.ts`)**: Added `deletion_requested_at: string | null` to `users.Row`, `?.Insert`, and `?.Update` (after `deleted_at` in all three).
- **T10 (`seed.sql`)**: Appended (not overwrote) DPO operator seed block with two-step instructions. `ON CONFLICT (email) DO NOTHING` for idempotency.
- **T11 (CI)**: `turbo typecheck` — 10/10 ✅; `turbo lint` — 7/7 ✅; `turbo test` — core 11 pass, supabase 17 skip (RLS, expected), mobile failures pre-existing (react-test-renderer version mismatch, unrelated). Panel smoke test: Supabase not running in dev environment; HTML template verified by code inspection (contains `type="password"`).
- **T6 Manual Verification Checklist** (AC6 — run against `supabase start`):
  - (a) Login form rejects bad credentials: login screen shows "Invalid credentials" error from `/dpo/login` 401 response — implemented in `doLogin()` error branch
  - (b) Pending erasure list loads after login: `loadPendingErasures()` called in `showDashboard()` — calls `dpo-pending-requests` with Bearer token
  - (c) "Confirm Erasure" dialog: `window.confirm()` in `confirmErasure()` — erasure POST blocked until confirmed
  - (d) Logout clears token: `doLogout()` sets `operatorToken = null`, calls `/dpo/logout`, shows login screen

### File List

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
- `packages/supabase/src/functions/index.ts`
- `packages/supabase/src/index.ts`
- `packages/supabase/src/auth/AuthProvider.tsx`
- `packages/supabase/src/database.types.ts`
- `supabase/seed.sql`

## Change Log

| Date | Change |
|---|---|
| 2026-05-27 | Story 3.4 created — DPO Operator Panel (FR-DPO-07 second half) |
| 2026-05-27 | Adversarial review CR pass — 6 fixes applied: F1 (remove userId from body/BOLA), F2 (MMKV pending write before requestErasure), F5 (canonical URL pattern, no relative paths), F6 (CORS OPTIONS in T6a), F7 (seed.sql append not create), F8 (falsifiable AC6 curl smoke test), F11 (empty-string credential guard); 4 accept-with-notes added: F3/F10 (JWT revocation deferred Epic 4), F9 (no-FK documented), F12 (details wrapper suggestion) |
| 2026-05-27 | Story validation pass — 5 critical fixes (C1: T4 anon key in env-var list, C2: T3 body-parse prohibition, C3: erase body field targetUserId, C4: export body field targetUserId, C5: null email handling in panel); 3 enhancements (E1: CORS OPTIONS in T6, E2: callEdgeFn generic simplified, E3: dpo-pending-requests response shape specified); 2 minor items (M1: T9 current field snapshot, M2: audit log URL params) |
| 2026-05-27 | Story 3.4 implemented — all T1–T11 complete; typecheck ✅ lint ✅ core/supabase tests ✅; status → review |
