# Story 1.7: Data Foundation — Supabase, MMKV & PowerSync Adapter Scaffold

Status: done

## Story

As a developer,
I want the Supabase project provisioned, MMKV encrypted local storage initialised, and the PowerSync SyncAdapter interface scaffolded,
so that all durable writes from Epic 2 onwards call `adapter.enqueue()` — bypassing the sync layer with direct DB calls is impossible by architecture (ARC-004, ARC-005, ARC-006, ARC-007).

## Acceptance Criteria

1. **Supabase Client (ARC-006)**
   **Given** `packages/supabase` is scaffolded with `@supabase/supabase-js`
   **When** `createSupabaseClient()` is called at app startup
   **Then** it returns a `SupabaseClient` configured from `SUPABASE_URL` + `SUPABASE_ANON_KEY` (EAS env vars); a base migration at `supabase/migrations/0001_users.sql` creates the `users` table with UUID PK, `email`, and `created_at`

2. **Users Table RLS (ARC-006/ARC-007)**
   **Given** RLS is enabled on the `users` table (`supabase/migrations/0002_rls.sql`)
   **When** a test user reads their own row, a different user's row, or reads unauthenticated
   **Then** 4 assertions in `packages/supabase/__tests__/rls/users.test.ts` pass: own-row read ✓, cross-user read ✗, unauthenticated read ✗, clinician stub (empty — ARC-007 deferred to Epic 5)

3. **MMKV Startup Sequence (ARC-004)**
   **Given** `initSession()` is called before `AuthProvider` mounts in `apps/mobile/app/_layout.tsx`
   **When** the app cold-starts
   **Then** key derivation from `expo-secure-store` → MMKV init → session handle passed to `AuthProvider`; `SecureStore` is used exclusively for sensitive auth tokens; MMKV holds session state

4. **SyncAdapter Interface (ARC-005)**
   **Given** `packages/sync` exports the `SyncAdapter` interface
   **When** any package needs to persist a write
   **Then** it must call `adapter.enqueue(table, operation, payload)`; a `no-restricted-imports` ESLint rule in `apps/mobile/.eslintrc.js` blocks direct `@powersync/react-native` imports outside `packages/sync`; `flush()` and `getPendingCount()` complete the interface

5. **PowerSyncSyncAdapter Stub (ARC-005)**
   **Given** `PowerSyncSyncAdapter` implements `SyncAdapter`
   **When** `enqueue()`, `flush()`, or `getPendingCount()` is called
   **Then** each method resolves as a no-op (real sync wired in Epic 6); the class satisfies the TypeScript interface contract and `pnpm turbo typecheck` passes

6. **MMKV Key Rotation Stub (ARC-004)**
   **Given** `packages/supabase/__tests__/rls/mmkv-key-rotation.stub.ts` exists
   **When** a developer reads the file
   **Then** the Android reinstall / backup-restore edge case is documented as a typed `KeyRotationScenario`; full implementation is explicitly deferred to Epic 9

---

## Tasks / Subtasks

- [x] Task 1 — Supabase CLI root structure (AC: 1)
  - [x] Create `supabase/config.toml` — Supabase CLI config with local dev port and project ref placeholder
  - [x] Create `supabase/seed.sql` — empty seed file
  - [x] Create `supabase/migrations/0001_users.sql` — users table (UUID PK, email, created_at)

- [x] Task 2 — RLS migration (AC: 2)
  - [x] Create `supabase/migrations/0002_rls.sql` — enable RLS; own-row read/update policies; cross-user block; clinician stub comment

- [x] Task 3 — packages/supabase: install deps + client (AC: 1)
  - [x] `pnpm add --filter @exposure-buddy/supabase @supabase/supabase-js`
  - [x] `pnpm add --filter @exposure-buddy/supabase react-native-mmkv expo-secure-store`
  - [x] Add `react`, `react-native` as peerDependencies in `packages/supabase/package.json`
  - [x] Create `packages/supabase/src/client.ts` — `createSupabaseClient()` using env vars
  - [x] Create `packages/supabase/src/database.types.ts` — hand-authored skeleton for users table

- [x] Task 4 — Auth layer scaffold (AC: 3)
  - [x] Create `packages/supabase/src/auth/session.ts` — MMKV init with SecureStore-derived key; `initSession()`; typed MMKV key constants; `getAuthState()` / `setAuthState()` / `clearAuthState()`
  - [x] Create `packages/supabase/src/auth/AuthProvider.tsx` — React context; `onAuthStateChange` listener; writes to MMKV on each event; exports `AuthContext`
  - [x] Create `packages/supabase/src/auth/useAuth.ts` — `useAuth()` hook returning typed `AuthState`
  - [x] Update `packages/supabase/src/index.ts` — export client, auth hooks, auth provider

- [x] Task 5 — Vitest config for packages/supabase + RLS test harness (AC: 2, 6)
  - [x] Add `vitest` to packages/supabase devDeps; create `vitest.config.ts`
  - [x] Add `"test": "vitest run"` to packages/supabase/package.json scripts
  - [x] Create `packages/supabase/__tests__/rls/users.test.ts` — 4-assertion structure
  - [x] Create `packages/supabase/__tests__/rls/mmkv-key-rotation.stub.ts` — typed `KeyRotationScenario`

- [x] Task 6 — packages/sync: install deps + interface (AC: 4, 5)
  - [x] `pnpm add --filter @exposure-buddy/sync @powersync/react-native@1.34.0` (exact pin)
  - [x] `pnpm add --filter @exposure-buddy/sync zod`
  - [x] Create `packages/sync/src/schema.ts` — PowerSync SQLite schema (users table scaffold)
  - [x] Create `packages/sync/src/utils/outbox-schema.ts` — Zod schema for outbox entry
  - [x] Create `packages/sync/src/utils/outbox.ts` — durable outbox helpers
  - [x] Create `packages/sync/src/utils/conflict.ts` — stub `resolveConflict()`
  - [x] Create `packages/sync/src/adapter.ts` — `SyncAdapter` interface + `SyncMode` enum + `PowerSyncSyncAdapter` stub
  - [x] Create `packages/sync/src/client.ts` — `createPowerSyncDatabase()` factory
  - [x] Update `packages/sync/src/index.ts` — export all public API

- [x] Task 7 — apps/mobile: PowerSync boundary lint rule (AC: 4)
  - [x] Update `apps/mobile/.eslintrc.js` — add `no-restricted-imports` rule banning `@powersync/react-native` imports outside `packages/sync`

- [x] Task 8 — apps/mobile: cold start provider wiring (AC: 3)
  - [x] Update `apps/mobile/app/_layout.tsx` — `initSession()` in `useEffect`; wrap tree with `AuthProvider` from `@exposure-buddy/supabase`

- [x] Task 9 — pnpm-workspace.yaml onlyBuiltDependencies (if needed)
  - [x] Add `react-native-mmkv` and `@powersync/react-native` to `onlyBuiltDependencies` in `pnpm-workspace.yaml` if lifecycle errors occur

- [x] Task 10 — CI gate: supabase-import-gate (AC: 1)
  - [x] Update `.github/workflows/ci.yml` — add `supabase-import-gate` job

- [x] Task 11 — Full CI validation
  - [x] `pnpm turbo build` exits 0
  - [x] `pnpm turbo typecheck` exits 0
  - [x] `pnpm turbo lint` exits 0
  - [x] `pnpm --filter @exposure-buddy/supabase test` exits 0

---

## Dev Notes

### Dependency installation pattern (from Story 1.6)
- Always: `pnpm add --filter @exposure-buddy/<package> <dep>` (not `expo install`)
- If lifecycle error: add to `pnpm-workspace.yaml` `onlyBuiltDependencies`

### Package version guidance
| Package | Version | Constraint |
|---|---|---|
| `@supabase/supabase-js` | `^2` | caret OK; latest stable 2.x |
| `react-native-mmkv` | `^3` | RN 0.81 + new arch requires v3.x |
| `expo-secure-store` | `~14.0.0` | Expo SDK 54 compatible; use `~` |
| `@powersync/react-native` | `1.34.0` | **Exact pin, no `^`** (ADR-RN-VERSION) |
| `zod` | `^3` | stable 3.x |

### Architecture boundaries (must not violate)
- `packages/core`: zero new deps; untouched this story
- `packages/supabase`: may import `@supabase/supabase-js`, `react-native-mmkv`, `expo-secure-store`, `packages/core`
- `packages/sync`: may import `@powersync/react-native`, `zod`, `packages/core`, `packages/supabase/src/auth/session` (ONLY this path)
- `apps/mobile`: must NOT import `@supabase/supabase-js` or `@powersync/react-native` directly — only via package wrappers

### NativeWind is REJECTED — no `className` props anywhere (from Story 1.3)

### MMKV key derivation pattern
```typescript
// packages/supabase/src/auth/session.ts
import * as SecureStore from 'expo-secure-store'
import { MMKV } from 'react-native-mmkv'

const MMKV_KEY_ALIAS = 'exposure-buddy.mmkv.key'

export async function initSession(): Promise<MMKV> {
  let encryptionKey = await SecureStore.getItemAsync(MMKV_KEY_ALIAS)
  if (!encryptionKey) {
    encryptionKey = crypto.randomUUID()
    await SecureStore.setItemAsync(MMKV_KEY_ALIAS, encryptionKey)
  }
  return new MMKV({ id: 'exposure-buddy', encryptionKey })
}
```

### SyncAdapter interface pattern
```typescript
export interface SyncAdapter {
  enqueue(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: unknown): Promise<void>
  flush(): Promise<void>
  getPendingCount(): Promise<number>
}

export enum SyncMode {
  NORMAL = 'NORMAL',
  CRISIS_PAUSED = 'CRISIS_PAUSED',
  CRISIS_WRITE_WINDOW = 'CRISIS_WRITE_WINDOW',
}
```

### Cold start ordering in _layout.tsx
1. `initErrorHandler()` — must stay first
2. `SplashScreen.preventAutoHideAsync()` — must stay second
3. Side-effect `../src/i18n` — must stay third
4. `initSession()` called in `useEffect`; session handle passed to `AuthProvider`

### What is NOT in scope
- Real PowerSync cloud relay connection (Epic 6)
- Actual OTP authentication flow (Epic 2.1)
- Edge Functions (Epic 3)
- DPDPA consent (Epic 3)
- MMKV key rotation full implementation (Epic 9)
- Any screen UI
- Hindi locale (`hi.json`) — placeholder only

---

## Dev Agent Record

### Story 1.7 Implementation Log

#### Implemented by: Dev Agent (Story 1.7)

_Tasks completed will be checked off above as implementation proceeds._

---

### Review Findings

Code review run 2026-05-23 — 3 decision-needed, 9 patch, 7 deferred, 8 dismissed.

#### Decision-Needed

- [x] [Review][Decision] D1: AC5 — made all three `SyncAdapter` methods true no-ops (`return Promise.resolve()`); removed `_pending` queue; Zod outbox types preserved in `./utils/outbox-schema` and `./utils/outbox` for Epic 6. [`packages/sync/src/adapter.ts`]
- [x] [Review][Decision] D2: `react-native-mmkv` reverted to `^3` — no native device test CI coverage to validate v4 JSI bindings; spike story deferred for v4 validation with physical device gate. [`packages/supabase/package.json`]
- [x] [Review][Decision] D3: `expo-secure-store` reverted to `~14.0.0` — 56.x is SDK 56 aligned, not SDK 54; security-critical component must match Expo's official compatibility table. [`packages/supabase/package.json`]

#### Patch

- [x] [Review][Patch] P1: INSERT RLS policy missing — `0002_rls.sql` enables RLS and creates SELECT + UPDATE policies but no INSERT policy. With RLS on and no INSERT policy, Postgres denies authenticated users from inserting their own row; service role in tests bypasses this and masks the bug. Add a `users_own_row_insert` policy: `FOR INSERT WITH CHECK (auth.uid() = id)`. [`supabase/migrations/0002_rls.sql`]
- [x] [Review][Patch] P2: MMKV session not bootstrapped into Supabase JS client on cold start — `AuthProvider` reads MMKV via `getAuthState()` and surfaces the cached session to React state, but never calls `supabase.auth.setSession({access_token, refresh_token})`. The Supabase client has no in-memory session, so `autoRefreshToken: true` never fires, and API calls will 401 after the stored token expires (~1 hour). Fix: call `supabase.auth.setSession(mmkvSession)` on cold-start hydration inside `AuthProvider.useEffect`. [`packages/supabase/src/auth/AuthProvider.tsx`, `packages/supabase/src/client.ts`]
- [x] [Review][Patch] P3: `isLoading` set to `false` unconditionally before `onAuthStateChange` fires — the `useEffect` calls `setIsLoading(false)` synchronously after registering the listener, so any component gating navigation on `isLoading === false` sees a "done, no session" flash before the cached MMKV state or the Supabase event resolves. Fix: remove the unconditional `setIsLoading(false)` outside the listener; only set it inside `onAuthStateChange` after updating auth state. [`packages/supabase/src/auth/AuthProvider.tsx`]
- [x] [Review][Patch] P4: `onAuthStateChange` silently drops events when `mmkvRef.current` is null — the listener has an early `if (!store) return` guard but no retry or queue. A `SIGNED_IN` / `INITIAL_SESSION` event firing during the `initSession()` async window (before `mmkv` state propagates to `AuthProvider`) is silently lost; the app shows signed-out state even for returning users. Fix is coupled to P2/P3: bootstrapping the session synchronously via `setSession()` before registering the listener eliminates the null window. [`packages/supabase/src/auth/AuthProvider.tsx`]
- [x] [Review][Patch] P5: `getAuthState` calls `JSON.parse` without try/catch — a truncated or corrupt MMKV write (OOM kill mid-write, storage corruption) throws `SyntaxError` synchronously inside the `useState` initializer, crashing the root component tree. Fix: wrap in `try/catch` and return `DEFAULT_AUTH_STATE` + clear the corrupted key on parse failure. [`packages/supabase/src/auth/session.ts:57`]
- [x] [Review][Patch] P6: `initSession` has no concurrent-call guard — two simultaneous callers both pass the `if (_mmkv) return _mmkv` check (it's null for both before the first `await` resolves), each generates a different UUID, one writes to SecureStore last, but the winning MMKV instance was opened with the other UUID; on the next cold start `SecureStore` returns the wrong key and MMKV fails to decrypt. Fix: replace the simple `null` guard with a promise singleton: `let _initPromise: Promise<MMKV> | null = null`. [`packages/supabase/src/auth/session.ts`]
- [x] [Review][Patch] P7: `setAuthState` writes three MMKV keys non-atomically — an OOM kill between writes leaves `AUTH_SESSION` holding the new session while `AUTH_USER_ID` still reflects the previous user. Fix: store all auth state as a single serialized JSON value under one key (e.g. `AUTH_STATE`), so the write is atomic from MMKV's perspective. [`packages/supabase/src/auth/session.ts:64-68`]
- [x] [Review][Patch] P8: `vitest ^4.1.7` devDep in `packages/sync` with no `test` script and no test files — dead-weight dependency that creates version skew. Fix: either (a) add `"test": "vitest run"` + `vitest.config.ts` with `passWithNoTests: true` (matching `packages/supabase` pattern), or (b) remove `vitest` from devDeps entirely until sync tests are needed. [`packages/sync/package.json`]
- [x] [Review][Patch] P9: RLS test `beforeAll` uses non-null assertions without error handling — `a.user!.id` throws if `createUser` fails (e.g. duplicate email from a prior dirty run), leaving cleanup in `afterAll` with `undefined` IDs. Fix: assert `a.user` is non-null explicitly with a meaningful test failure message; add error checks on both `createUser` responses before dereferencing. [`packages/supabase/__tests__/rls/users.test.ts:42-43`]

#### Deferred

- [x] [Review][Defer] W1: In-memory `_pending` outbox — `PowerSyncSyncAdapter` holds queued entries in a plain array; all entries lost on app restart. Documented scaffold; real durability wired in Epic 6. [`packages/sync/src/adapter.ts`] — deferred, pre-existing scaffold behavior
- [x] [Review][Defer] W2: `zod ^4.4.3` vs spec's `^3` constraint — zod 4.x is now the stable `latest` on npm; the spec was written before v4 GA; no functional regression observed in CI. Update the Dev Notes version table in the next story to reflect zod 4.x. — deferred, spec predates zod 4 GA
- [x] [Review][Defer] W3: AES-256 key entropy under-provisioned — `crypto.randomUUID().replace(/-/g, '')` yields 32 hex chars = 16 bytes (128 bits); AES-256 requires 32 bytes. The `encryptionType: 'AES-256'` claim may be incorrect. Acceptable for scaffold; address in Epic 9 MMKV key hygiene (story 9-4). [`packages/supabase/src/auth/session.ts:44`] — deferred, pre-existing scaffold; Epic 9
- [x] [Review][Defer] W4: `resolveConflict` stub has no guard or "not implemented" indicator — future callers cannot distinguish scaffold from intentional server-wins policy. Acceptable at scaffold stage; Epic 6 hardens. [`packages/sync/src/utils/conflict.ts`] — deferred, pre-existing scaffold
- [x] [Review][Defer] W5: `supabase-import-gate` CI step hardcodes scanned directories — new packages added to the monorepo will silently bypass the boundary check. Minor CI hygiene; fix in Epic 9 or next CI cleanup story. [`.github/workflows/ci.yml`] — deferred, minor CI hygiene
- [x] [Review][Defer] W6: `email` column in `public.users` duplicates `auth.users.email` with no sync trigger — stale on email change. Pre-existing design choice; no trigger migration is in scope for this story. [`supabase/migrations/0001_users.sql`] — deferred, pre-existing design choice
- [x] [Review][Defer] W7: Clinician stub test (4th assertion) signs in as User B and performs an active cross-user read — AC2 describes it as "empty (ARC-007 deferred)". Currently passes because no clinician policy exists; functionally validates cross-user blocking but is semantically a duplicate of the cross-user read test. Disputable AC interpretation; acceptable for now. [`packages/supabase/__tests__/rls/users.test.ts:88-97`] — deferred, disputable AC interpretation
