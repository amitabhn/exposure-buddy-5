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
