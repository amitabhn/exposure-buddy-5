# Story 6.2-A: PowerSync Foundation

**Status:** ready-for-dev

## Story

As the platform, I want PowerSync wired end-to-end — real singleton db, live Supabase connector with correct auth lifecycle, durable adapter, DB integrity migrations, and ESLint boundary resolved — so that all Epic 6 stories work against real local SQLite data and real Supabase sync rather than in-memory no-op stubs.

*Splits from: original Story 6.2 (rejected 2026-06-16). Depends on: Story 6.1 merged ✅.*
*Enables: Story 6.2-B (home screen morning state) and Story 6.2-C (ladder item delete), both of which require real PowerSync data.*

---

## Acceptance Criteria

### AC 1 — PowerSyncContext.Provider wired in root layout

**Given** `PowerSyncContext` is not currently provided in the React tree
**When** this story is implemented
**Then**:
- `PowerSyncContext.Provider value={powerSyncDb}` is added to `apps/mobile/app/_layout.tsx` wrapping `OnboardingProvider` and `Stack`, and sitting INSIDE `AuthProvider` (auth must be initialised before PowerSync connector calls `fetchCredentials`)
- `powerSyncDb` is the singleton from `getPowerSyncDatabase()` — created at module scope, not inside a component
- `useQuery` and `usePowerSync` (re-exported from `@exposure-buddy/sync`) work in all screens
- ARC-005 ESLint rule (`@powersync/react-native` banned in `apps/mobile`) is satisfied by routing all PowerSync hook imports through `@exposure-buddy/sync`

### AC 2 — Auth lifecycle: connect on sign-in, disconnect on sign-out

**Given** the original rejected spec used a `connectedRef` that prevented reconnection after sign-out (D9)
**When** this story is implemented
**Then**:
- A `PowerSyncConnectionManager` component (inline in `_layout.tsx`) is a direct child of `AuthProvider`; it calls `useAuth()` and manages the lifecycle
- On each `userId` change (detected via `prevUserIdRef`): if `userId` is a non-null string, create a fresh `SupabasePowerSyncConnector(createSupabaseClient())` and call `powerSyncDb.connect(connector)`; if `userId` is null, call `powerSyncDb.disconnect()`
- `powerSyncDb.connect()` result is void (fire-and-forget); errors are caught and logged with `console.error`; the function is never `await`-ed at the call site
- `powerSyncDb.disconnect()` is similarly fire-and-forget; errors are swallowed
- Signing out then signing back in as a different user creates a fresh connector bound to the new user's session — no state leaks between users

### AC 3 — SupabasePowerSyncConnector: fetchCredentials and uploadData

**Given** the rejected spec had multiple bugs in the connector (P1: `transaction.complete()` should be `batch.complete()`; P2: wrong `onConflict` for `user_onboarding_metadata`; P9: SupabaseClientLike interface missing fields; P10: empty EXPO_PUBLIC_POWERSYNC_URL should return null)
**When** this story is implemented
**Then**:
- `SupabasePowerSyncConnector` in `packages/sync/src/connector.ts` implements `PowerSyncBackendConnector` (from `@powersync/react-native`)
- `fetchCredentials()`: gets session via `supabaseClient.auth.getSession()`; if no session OR `EXPO_PUBLIC_POWERSYNC_URL` is falsy, returns `null`; otherwise returns `{ endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL, token: session.access_token, expiresAt: new Date(session.expires_at * 1000) }` (matches `PowerSyncCredentials` interface)
- `uploadData(database)`: calls `await database.getCrudBatch(200)` — if null (nothing to upload) returns immediately; for each `CrudEntry` in `batch.crud`: `UpdateType.PUT` → `supabaseClient.from(entry.table).upsert({ id: entry.id, ...entry.opData })` (no `onConflict` override — let PostgREST use the table's PRIMARY KEY); `UpdateType.PATCH` → `supabaseClient.from(entry.table).update(entry.opData!).eq('id', entry.id)`; `UpdateType.DELETE` → `supabaseClient.from(entry.table).delete().eq('id', entry.id)`; if any Supabase call returns `error`, re-throw (PowerSync will retry); on success call `await batch.complete()`
- `SupabasePowerSyncConnector` does NOT import from `@exposure-buddy/supabase` — the Supabase client is injected as a constructor argument typed against a minimal `SupabaseClientLike` interface (to avoid circular dep: supabase → core, sync → supabase)
- `packages/sync` does NOT become a dep of `packages/supabase`

### AC 4 — Durable PowerSyncSyncAdapter replaces no-op stub

**Given** `PowerSyncSyncAdapter` currently no-ops every `enqueue()` call (writes are lost on restart)
**When** this story is implemented
**Then**:
- `PowerSyncSyncAdapter` in `packages/sync/src/adapter.ts` takes `AbstractPowerSyncDatabase` as a constructor argument
- `enqueue('table', 'INSERT', payload)` → `db.execute('INSERT OR IGNORE INTO table (col1, col2, ...) VALUES (?, ?, ...)', [vals])` using only snake_case keys from payload (camelCase keys are filtered out before building the SQL — see Dev Notes)
- `enqueue('table', 'UPDATE', payload)` where `payload.type !== 'reorder_positions'` → `db.execute('UPDATE table SET col1=?, col2=? WHERE id=?', [...vals, id])` using only snake_case keys excluding `id`
- `enqueue('table', 'UPDATE', { type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition })` → `db.writeTransaction(async tx => { await tx.execute('UPDATE table SET position=?, updated_at=? WHERE id=?', [posA, now, idA]); await tx.execute('UPDATE table SET position=?, updated_at=? WHERE id=?', [posB, now, idB]) })` (reconciles the `UPDATE` envelope from `(onboarding)/ladder.tsx`)
- `enqueue('table', 'reorder_positions', { itemAId, itemANewPosition, itemBId, itemBNewPosition })` → same two-transaction writes as above (reconciles the direct operation from `ladder.tsx`)
- `enqueue('table', 'DELETE', { id })` → `db.execute('DELETE FROM table WHERE id=?', [id])`
- Both reorder calling conventions produce IDENTICAL `db.execute()` calls — verified by a Vitest test (see T9.3)
- `initAdapter(adapter: SyncAdapter)` and `getAdapter(): SyncAdapter` are exported; `getAdapter()` throws if called before `initAdapter()`
- `initAdapter` is called at MODULE SCOPE in `apps/mobile/app/_layout.tsx` (before any useEffect fires) so that the recovery modal in `(app)/_layout.tsx` can call `getAdapter()` safely on first render

### AC 5 — PowerSync db singleton and schema bump

**Given** `createPowerSyncDatabase()` currently returns a new instance on every call and `user_onboarding_metadata` lacks an `id` column (deferred 4-2-D5)
**When** this story is implemented
**Then**:
- `packages/sync/src/client.ts` exports `getPowerSyncDatabase(dbFilename?)` that returns a module-level singleton (`PowerSyncDatabase` instance); `createPowerSyncDatabase()` kept for tests that need a fresh instance
- `packages/sync/src/schema.ts` `user_onboarding_metadata` table gains `id: column.text` as the first column (client-generated UUID primary key deferred from 4-2-D5)
- Schema version bump triggers PowerSync to reset local SQLite on next launch — expected behaviour for dev; offline-first users with pending `user_onboarding_metadata` writes accept data loss for this one table (this is the only pending write at risk; see Dev Notes)

### AC 6 — ARC-005 ESLint boundary resolved via re-exports

**Given** `apps/mobile/.eslintrc.js` bans `@powersync/react-native` and `@powersync/common` imports (ARC-005), and `useFearLadderItems` and home screen will need `useQuery`
**When** this story is implemented
**Then**:
- `packages/sync/src/index.ts` re-exports: `useQuery`, `usePowerSync`, `PowerSyncContext` from `@powersync/react-native`; `PowerSyncBackendConnector`, `AbstractPowerSyncDatabase`, `UpdateType` from `@powersync/react-native`
- `apps/mobile` imports these exclusively from `@exposure-buddy/sync` — no direct `@powersync/*` import anywhere in `apps/mobile`
- `pnpm turbo lint` passes with zero ARC-005 violations

### AC 7 — useFearLadderItems: real useQuery hook

**Given** `apps/mobile/src/hooks/useFearLadderItems.ts` returns an empty stub array
**When** this story is implemented
**Then**:
- The stub is replaced with a real `useQuery<Row>(QUERY)` call (hook from `@exposure-buddy/sync`)
- Query: `SELECT id, description, predicted_suds, peak_suds, position, status FROM fear_ladder_items ORDER BY position ASC, id ASC` (id ASC establishes consistent ordering; tiebreaker logic in `resolveLowestPendingItem` is Story 6.2-B)
- Results mapped from snake_case to `FearLadderItem` (camelCase) via `useMemo`
- `peak_suds` typed as `number | null` (PowerSync integer columns are nullable)
- `status` cast to `FearLadderItemStatus` (narrowed type from AC 8)
- `_userId` param kept for call-site compat (PowerSync sync-rules already scope the query to the authenticated user)
- After this story, the Courage Ladder screen (`apps/mobile/app/ladder.tsx`) renders real `fear_ladder_items` data for authenticated users

### AC 8 — FearLadderItemStatus type narrowing + intent.tsx cleanup + migration 0021

**Given** `fear_ladder_items.status` is typed as `string` (4-4-D3) and `intent.tsx` writes a now-illegal `'in_progress'` status
**When** this story is implemented
**Then**:
- `packages/core/src/selectors/fearLadder.ts` exports `FearLadderItemStatus = 'pending' | 'completed'` as a TypeScript union type; `FearLadderItem.status` typed as `FearLadderItemStatus`
- `packages/core/src/index.ts` exports `FearLadderItemStatus`
- Migration `0021_fear_ladder_items_constraints.sql` runs:
  1. Backfills any `status = 'in_progress'` rows to `'pending'` before altering constraint
  2. `ALTER TABLE public.fear_ladder_items DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check` (auto-generated name from 0013 migration)
  3. `ALTER TABLE public.fear_ladder_items ADD CONSTRAINT check_status CHECK (status IN ('pending', 'completed'))`
  4. `ALTER TABLE public.fear_ladder_items ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED` (guards against duplicate positions from offline concurrent writes; 4-3-D5)
- `apps/mobile/app/session/intent.tsx`: the entire block (d) "Enqueue fear_ladder_items UPDATE status → in_progress" (lines 107–115) is REMOVED; items stay `'pending'` while a session is active; `'completed'` is set by debrief on session completion
- `apps/mobile/app/ladder.tsx` `statusLabel`: the `in_progress` branch (line 149) is kept with a comment explaining it guards against stale pre-migration rows; it is NOT removed

### AC 9 — Migration 0022: partial unique index uq_active_thread

**Given** FR-HOME-03 requires one active thread per user per fear item (must close before real writes flow)
**When** migration `0022_exposure_sessions_active_thread.sql` runs
**Then**:
- Pre-cleanup step: any duplicate `(user_id, fear_item_id)` pairs with `status = 'started'` are resolved by keeping the most recent row and setting duplicates to `status = 'abandoned'`; note: no such duplicates should exist in dev on a fresh `supabase start`, but the migration must be safe on any DB state
- `CREATE UNIQUE INDEX IF NOT EXISTS uq_active_thread ON public.exposure_sessions (user_id, fear_item_id) WHERE status = 'started'` executes successfully
- Attempting a second INSERT with the same `(user_id, fear_item_id, status='started')` raises a unique-constraint violation at the DB layer
- pgTAP test in `packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts` verifies the constraint fires (see T9.2)

---

## Tasks / Subtasks

### T1 — DB Migrations

- [ ] **T1.1**: Create `supabase/migrations/0021_fear_ladder_items_constraints.sql`:
  ```sql
  -- Story 6.2-A: narrow status to MVP values; add deferrable position uniqueness

  -- Step 1: backfill any in_progress rows to pending before narrowing the constraint
  UPDATE public.fear_ladder_items SET status = 'pending' WHERE status = 'in_progress';

  -- Step 2: drop the auto-generated status check from migration 0013
  ALTER TABLE public.fear_ladder_items DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check;

  -- Step 3: named constraint — only 'pending' and 'completed' permitted
  ALTER TABLE public.fear_ladder_items
    ADD CONSTRAINT check_status CHECK (status IN ('pending', 'completed'));

  -- Step 4: deferrable position uniqueness — allows bulk reorder swaps within a transaction
  ALTER TABLE public.fear_ladder_items
    ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED;
  ```

- [ ] **T1.2**: Create `supabase/migrations/0022_exposure_sessions_active_thread.sql`:
  ```sql
  -- Story 6.2-A: enforce one active thread per user per fear item (FR-HOME-03)

  -- Pre-cleanup: resolve any existing duplicates (keep most recent, abandon others)
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id, fear_item_id ORDER BY started_at DESC NULLS LAST, id DESC) AS rn
    FROM public.exposure_sessions
    WHERE status = 'started'
  )
  UPDATE public.exposure_sessions
    SET status = 'abandoned'
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  -- Partial unique index: only one 'started' row per (user_id, fear_item_id)
  CREATE UNIQUE INDEX IF NOT EXISTS uq_active_thread
    ON public.exposure_sessions (user_id, fear_item_id)
    WHERE status = 'started';
  ```

### T2 — packages/core: FearLadderItemStatus type narrowing

- [ ] **T2.1**: Update `packages/core/src/selectors/fearLadder.ts`:
  - Add `export type FearLadderItemStatus = 'pending' | 'completed'`
  - Change `FearLadderItem.status` from `string` to `FearLadderItemStatus`
  - No other changes (tiebreaker sort belongs to Story 6.2-B which owns `resolveLowestPendingItem`)
  - **ARC-001**: zero new RN/Expo/Supabase imports

- [ ] **T2.2**: Update `packages/core/src/index.ts`:
  - Add `export type { FearLadderItemStatus } from './selectors/fearLadder'`

### T3 — packages/sync: connector, singleton, real adapter, schema, re-exports

- [ ] **T3.1**: Update `packages/sync/src/schema.ts` — add `id: column.text` as the first column in `user_onboarding_metadata`:
  ```typescript
  const user_onboarding_metadata = new Table({
    id: column.text,            // client-generated UUID PK (deferred from 4-2-D5)
    user_id: column.text,
    suds_calibration_value: column.integer,
    completed_at: column.text,
    created_at: column.text,
  })
  ```

- [ ] **T3.2**: Update `packages/sync/src/client.ts` — lazy singleton:
  ```typescript
  import { PowerSyncDatabase } from '@powersync/react-native'
  import { AppSchema } from './schema'

  let _db: PowerSyncDatabase | null = null

  export function getPowerSyncDatabase(dbFilename = 'exposure-buddy.db'): PowerSyncDatabase {
    if (!_db) _db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename } })
    return _db
  }

  // Kept for tests that need a fresh (non-singleton) instance
  export function createPowerSyncDatabase(dbFilename = 'exposure-buddy.db'): PowerSyncDatabase {
    return new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename } })
  }
  ```

- [ ] **T3.3**: Create `packages/sync/src/connector.ts`:

  ```typescript
  import type { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/react-native'
  import type { UpdateType } from '@powersync/react-native'

  // Minimal Supabase client interface — avoids importing @exposure-buddy/supabase
  // (which would create a circular dep: supabase→core, sync→supabase).
  // The real SupabaseClient satisfies this structurally.
  export interface SupabaseClientLike {
    auth: {
      getSession(): Promise<{
        data: {
          session: { access_token: string; expires_at: number } | null
        }
      }>
    }
    from(table: string): {
      upsert(data: Record<string, unknown>): Promise<{ error: unknown }>
      update(data: Record<string, unknown>): { eq(col: string, val: string): Promise<{ error: unknown }> }
      delete(): { eq(col: string, val: string): Promise<{ error: unknown }> }
    }
  }

  export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
    constructor(private readonly supabase: SupabaseClientLike) {}

    async fetchCredentials() {
      const endpoint = process.env['EXPO_PUBLIC_POWERSYNC_URL']
      if (!endpoint) return null  // not configured in this env — local/CI use

      const { data: { session } } = await this.supabase.auth.getSession()
      if (!session) return null

      return {
        endpoint,
        token: session.access_token,
        expiresAt: new Date(session.expires_at * 1000),
      }
    }

    async uploadData(database: AbstractPowerSyncDatabase) {
      const batch = await database.getCrudBatch(200)
      if (!batch) return  // nothing to upload

      for (const entry of batch.crud) {
        const { error } = await this._uploadEntry(entry)
        if (error) throw error  // PowerSync will retry after configured wait (default 5s)
      }

      await batch.complete()
    }

    private async _uploadEntry(entry: { table: string; id: string; op: UpdateType; opData?: Record<string, unknown> }) {
      // Import UpdateType from @powersync/react-native at call site
      const { UpdateType: UT } = await import('@powersync/react-native')

      if (entry.op === UT.PUT) {
        return this.supabase.from(entry.table).upsert({ id: entry.id, ...entry.opData })
      } else if (entry.op === UT.PATCH) {
        return this.supabase.from(entry.table).update(entry.opData ?? {}).eq('id', entry.id)
      } else {
        // DELETE
        return this.supabase.from(entry.table).delete().eq('id', entry.id)
      }
    }
  }
  ```

  **Implementation note:** Replace the dynamic import inside `_uploadEntry` with a top-level import: `import { UpdateType } from '@powersync/react-native'` at the top of `connector.ts`. Then use `UpdateType.PUT`, `UpdateType.PATCH`, `UpdateType.DELETE` directly. The dynamic `import()` in the code block above is illustrative — use the static import in the actual implementation.

- [ ] **T3.4**: Replace `packages/sync/src/adapter.ts` with the real implementation (preserves `SyncAdapter` interface and `SyncMode` export):

  ```typescript
  import type { AbstractPowerSyncDatabase } from '@powersync/react-native'
  import type { OutboxOperation } from './utils/outbox-schema'

  // ARC-005: All durable writes go through this interface.
  export interface SyncAdapter {
    enqueue(table: string, operation: OutboxOperation, payload: unknown): Promise<void>
    flush(): Promise<void>
    getPendingCount(): Promise<number>
  }

  export enum SyncMode {
    NORMAL = 'NORMAL',
    CRISIS_PAUSED = 'CRISIS_PAUSED',
    CRISIS_WRITE_WINDOW = 'CRISIS_WRITE_WINDOW',
  }

  export class PowerSyncSyncAdapter implements SyncAdapter {
    constructor(private readonly db: AbstractPowerSyncDatabase) {}

    async enqueue(table: string, operation: OutboxOperation, payload: unknown): Promise<void> {
      const p = payload as Record<string, unknown>
      const now = new Date().toISOString()

      if (operation === 'INSERT') {
        const snake = filterSnakeCase(p)
        const cols = Object.keys(snake).join(', ')
        const placeholders = Object.keys(snake).map(() => '?').join(', ')
        await this.db.execute(
          `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`,
          Object.values(snake),
        )
      } else if (operation === 'UPDATE') {
        if (p['type'] === 'reorder_positions') {
          await this._reorder(table, p, now)
        } else {
          const { id, ...rest } = filterSnakeCase(p)
          const setClause = Object.keys(rest).map(k => `${k} = ?`).join(', ')
          await this.db.execute(
            `UPDATE ${table} SET ${setClause} WHERE id = ?`,
            [...Object.values(rest), id],
          )
        }
      } else if (operation === 'reorder_positions') {
        await this._reorder(table, p, now)
      } else if (operation === 'DELETE') {
        await this.db.execute(`DELETE FROM ${table} WHERE id = ?`, [p['id']])
      }
    }

    private async _reorder(table: string, p: Record<string, unknown>, now: string) {
      const idA = p['itemAId'] as string
      const posA = p['itemANewPosition'] as number
      const idB = p['itemBId'] as string
      const posB = p['itemBNewPosition'] as number
      await this.db.writeTransaction(async tx => {
        await tx.execute(`UPDATE ${table} SET position = ?, updated_at = ? WHERE id = ?`, [posA, now, idA])
        await tx.execute(`UPDATE ${table} SET position = ?, updated_at = ? WHERE id = ?`, [posB, now, idB])
      })
    }

    async flush(): Promise<void> { /* PowerSync handles flush automatically */ }
    async getPendingCount(): Promise<number> { return 0 }
  }

  // Filter payload to only snake_case keys (no uppercase chars) — prevents camelCase
  // convenience fields (e.g. updatedAt) from being written to SQLite columns
  function filterSnakeCase(p: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(p).filter(([k]) => k === k.toLowerCase()))
  }

  let _adapter: SyncAdapter | null = null

  export function initAdapter(adapter: SyncAdapter): void {
    _adapter = adapter
  }

  export function getAdapter(): SyncAdapter {
    if (!_adapter) throw new Error('[sync] SyncAdapter not initialized — call initAdapter() before first render')
    return _adapter
  }
  ```

- [ ] **T3.5**: Update `packages/sync/src/index.ts`:
  - Add exports: `SupabasePowerSyncConnector` from `./connector`; `getPowerSyncDatabase` from `./client`; `initAdapter`, `getAdapter` from `./adapter`
  - Add re-exports for `apps/mobile` consumption (ARC-005 resolution):
    ```typescript
    export { useQuery, usePowerSync, PowerSyncContext } from '@powersync/react-native'
    export type { PowerSyncBackendConnector, AbstractPowerSyncDatabase, UpdateType } from '@powersync/react-native'
    ```

### T4 — apps/mobile/app/_layout.tsx: PowerSync wiring

- [ ] **T4.1**: Update `apps/mobile/app/_layout.tsx` — add the following, preserving ALL existing logic exactly:

  **Module-scope additions** (after existing module-scope calls):
  ```typescript
  import { PowerSyncContext, initAdapter, getPowerSyncDatabase, PowerSyncSyncAdapter, SupabasePowerSyncConnector } from '@exposure-buddy/sync'
  // createSupabaseClient is exported from packages/supabase/src/client.ts → index.ts
  import { createSupabaseClient, useAuth } from '@exposure-buddy/supabase'
  // Add useAuth to the existing @exposure-buddy/supabase import (currently imports AuthProvider, OnboardingProvider, initSession, MMKV)

  const powerSyncDb = getPowerSyncDatabase()
  // Must be module-scope: recovery modal in (app)/_layout.tsx calls getAdapter() on first render,
  // before any useEffect can fire. The db is ready because getPowerSyncDatabase() is sync.
  initAdapter(new PowerSyncSyncAdapter(powerSyncDb))
  ```

  **Inside `RootLayout` component** (add after the existing `splashHidden` ref):
  ```typescript
  // PowerSync auth lifecycle — must be inside AuthProvider child component
  // (defined below as PowerSyncConnectionManager)
  ```

  **New inner component** (defined inside the file, after `RootLayout`):
  ```typescript
  function PowerSyncConnectionManager({ children }: { children: React.ReactNode }) {
    const { userId } = useAuth()
    const prevUserIdRef = useRef<string | null | undefined>(undefined)

    useEffect(() => {
      if (userId === prevUserIdRef.current) return
      prevUserIdRef.current = userId

      if (userId) {
        const connector = new SupabasePowerSyncConnector(createSupabaseClient())
        powerSyncDb.connect(connector).catch((err: unknown) => {
          console.error('[PowerSync] connect failed:', err)
        })
      } else {
        powerSyncDb.disconnect().catch(() => {})
      }
    }, [userId])

    return <>{children}</>
  }
  ```

  **JSX changes** — wrap the inner tree with `PowerSyncContext.Provider` and `PowerSyncConnectionManager`:
  ```tsx
  // Before:
  <AuthProvider mmkv={mmkv}>
    <OnboardingProvider mmkv={mmkv}>
      <SafeAreaProvider>
        ...
        <Stack>...</Stack>
        ...
      </SafeAreaProvider>
    </OnboardingProvider>
  </AuthProvider>

  // After:
  <AuthProvider mmkv={mmkv}>
    <PowerSyncContext.Provider value={powerSyncDb}>
      <PowerSyncConnectionManager>
        <OnboardingProvider mmkv={mmkv}>
          <SafeAreaProvider>
            ...
            <Stack>...</Stack>
            ...
          </SafeAreaProvider>
        </OnboardingProvider>
      </PowerSyncConnectionManager>
    </PowerSyncContext.Provider>
  </AuthProvider>
  ```

  **Invariants that MUST survive unchanged:**
  - `initErrorHandler()` module-scope call
  - `SplashScreen.preventAutoHideAsync()` module-scope call
  - `i18n` side-effect import order
  - `useFonts()` + `splashHidden` ref + `SplashScreen.hideAsync()` logic
  - The early `if (!fontsLoaded && !fontError) return null` guard (must remain BEFORE the PowerSyncContext.Provider so no partial provider renders during font load)
  - All `Stack.Screen` registrations unchanged
  - `PortalHost` placement unchanged

### T5 — apps/mobile/src/sync/adapter.ts

- [ ] **T5.1**: Replace the module with thin re-exports from `@exposure-buddy/sync`:
  ```typescript
  export { getAdapter, initAdapter, SyncMode } from '@exposure-buddy/sync'
  export type { SyncAdapter } from '@exposure-buddy/sync'
  ```
  Callers (`apps/mobile/app/session/active.tsx`, etc.) already import `getAdapter` from this path — no call-site changes required.

### T6 — apps/mobile/src/hooks/useFearLadderItems.ts

- [ ] **T6.1**: Replace stub with real `useQuery` hook:
  ```typescript
  import { useQuery } from '@exposure-buddy/sync'
  import { useMemo } from 'react'
  import type { FearLadderItem, FearLadderItemStatus } from '@exposure-buddy/core'

  const QUERY = `
    SELECT id, description, predicted_suds, peak_suds, position, status
    FROM fear_ladder_items
    ORDER BY position ASC, id ASC
  `

  type FearLadderRow = {
    id: string
    description: string
    predicted_suds: number
    peak_suds: number | null   // PowerSync integer columns are nullable
    position: number
    status: string
  }

  export function useFearLadderItems(_userId: string | null): FearLadderItem[] {
    const { data } = useQuery<FearLadderRow>(QUERY)
    return useMemo(
      () => (data ?? []).map(row => ({
        id: row.id,
        description: row.description,
        predictedSuds: row.predicted_suds,
        peakSuds: row.peak_suds,
        position: row.position,
        status: row.status as FearLadderItemStatus,
      })),
      [data],
    )
  }
  ```

### T7 — apps/mobile/app/session/intent.tsx: remove in_progress enqueue

- [ ] **T7.1**: Delete the entire block labelled "(d) Enqueue fear_ladder_items UPDATE status → in_progress" (current lines 107–115):
  ```typescript
  // DELETE these lines:
  // (d) Enqueue fear_ladder_items UPDATE status → in_progress (last_write_wins guard)
  // eslint-disable-next-line i18next/no-literal-string
  await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
    id: fearItemId,
    // eslint-disable-next-line i18next/no-literal-string
    status: 'in_progress',
    updated_at: now,
    updatedAt: Date.now(),
  })
  ```
  The surrounding enqueue calls (a), (b), (c), and (e) onward are unchanged. After deletion, step (e) "Write SESSION_IN_PROGRESS JSON blob to MMKV" renumbers to (d) in comments — update the comment labels accordingly.

### T8 — apps/mobile/app/ladder.tsx: legacy comment

- [ ] **T8.1**: Add a comment above the `in_progress` branch in `statusLabel()` (line 149):
  ```typescript
  const statusLabel = (status: string) => {
    // Legacy: 'in_progress' was removed from the DB CHECK constraint in migration 0021
    // (Story 6.2-A). Stale rows from pre-migration syncs may still carry this value.
    if (status === 'in_progress') return t('ladder.statusInProgress')
    if (status === 'completed') return t('ladder.statusCompleted')
    return t('ladder.statusPending')
  }
  ```

### T9 — Tests and CI verification

- [ ] **T9.1**: Create `packages/sync/__tests__/adapter.test.ts` — Vitest test for reorder convention equivalence (D15):
  ```typescript
  // Both enqueue calling conventions must produce IDENTICAL db.execute() calls (D15-resolved)
  it('UPDATE reorder_positions envelope and direct reorder_positions operation produce identical writes', async () => {
    const mockTx = { execute: vi.fn() }
    const mockDb = { execute: vi.fn(), writeTransaction: vi.fn(async fn => fn(mockTx)) }
    const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
    const payload = { itemAId: 'a', itemANewPosition: 1, itemBId: 'b', itemBNewPosition: 2 }

    await adapter.enqueue('fear_ladder_items', 'UPDATE', { type: 'reorder_positions', ...payload })
    const callsA = mockTx.execute.mock.calls.map(c => c[0])
    mockTx.execute.mockClear()
    mockDb.writeTransaction.mockClear()

    await adapter.enqueue('fear_ladder_items', 'reorder_positions', payload)
    const callsB = mockTx.execute.mock.calls.map(c => c[0])

    expect(callsA).toEqual(callsB)  // same SQL statements; params differ only in timestamp (acceptable)
  })
  ```

- [ ] **T9.2**: Create `packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts` — pgTAP-style Vitest test verifying `uq_active_thread` constraint (D15):
  - Follow exact pattern of `dpo_audit_log.test.ts` (service role client, test user create/cleanup, `skipIf(!SERVICE_ROLE_KEY || !ANON_KEY)`)
  - Test: insert first `status='started'` row for `(userId, fearItemId)` → succeeds
  - Test: insert second `status='started'` row for same pair → fails with Supabase error (unique violation)
  - Test: insert second row for DIFFERENT `fearItemId` → succeeds (constraint is per fear item)
  - Test: insert second row for same `fearItemId` but `status='abandoned'` → succeeds (partial index only covers 'started')

- [ ] **T9.3**: `pnpm turbo typecheck` — zero errors across all packages
- [ ] **T9.4**: `pnpm turbo lint` — zero errors; no ARC-005 violations in `apps/mobile` (no direct `@powersync/*` imports)
- [ ] **T9.5**: `pnpm turbo test` — all suites green
- [ ] **T9.6**: ARC-001 boundary check: `packages/core/src/selectors/fearLadder.ts` has zero RN/Expo/Supabase imports
- [ ] **T9.7**: ARC-005 boundary check: `packages/sync/src/connector.ts` does NOT import from `@exposure-buddy/supabase`

---

## Dev Notes

### Architecture — before and after this story

```
BEFORE 6.2-A:
  getAdapter().enqueue() → PowerSyncSyncAdapter (in-memory no-op, lost on restart)
  useFearLadderItems()   → EMPTY[] (stub, no data)
  PowerSync db           → new instance per call (no singleton)
  Auth lifecycle         → no connect/disconnect; PowerSync not actually syncing
  ESLint ARC-005         → @powersync/react-native banned but useFearLadderItems needs it

AFTER 6.2-A:
  getAdapter().enqueue() → db.execute() → PowerSync SQLite → uploadData() → Supabase
  useFearLadderItems()   → useQuery() → local PowerSync fear_ladder_items table
  PowerSync db           → singleton, shared across the app
  Auth lifecycle         → connect on sign-in (via PowerSyncConnectionManager), disconnect on sign-out
  ESLint ARC-005         → useQuery/usePowerSync/PowerSyncContext re-exported from @exposure-buddy/sync
```

### Verified PowerSync API surface (@powersync/react-native@1.34.0 / @powersync/react@1.10.0 / @powersync/common@1.53.1)

The rejected spec contained several wrong assumptions about the API. Verified against installed type declarations:

| Claim in rejected spec | Actual API |
|---|---|
| `db.useQuery(QUERY)` (method on db object) | `useQuery<T>(QUERY, params?)` — **top-level hook** from `@powersync/react` |
| `PowerSyncProvider` component | **Does not exist.** Use `<PowerSyncContext.Provider value={db}>` |
| `transaction.complete()` | **`batch.complete()`** — method on `CrudBatch`, not on a transaction |
| `onConflict: 'id'` option on upsert | PostgREST uses PRIMARY KEY by default; explicit `id` override is wrong for `user_onboarding_metadata` (PK is `user_id`, not `id`) |

**Correct hook usage pattern:**
```typescript
// In any component that is a descendant of <PowerSyncContext.Provider>:
import { useQuery } from '@exposure-buddy/sync'  // re-exported from @powersync/react-native

const { data: items } = useQuery<Row>('SELECT * FROM table WHERE ...')
// data is Row[] — starts as [] while PowerSync initialises local SQLite
```

**CrudEntry shape:**
```typescript
type CrudEntry = {
  id: string           // row id
  op: UpdateType       // UpdateType.PUT | UpdateType.PATCH | UpdateType.DELETE
  table: string        // table name
  opData?: Record<string, any>   // column values for PUT/PATCH
}
// UpdateType (string enum): PUT = 'PUT', PATCH = 'PATCH', DELETE = 'DELETE'
```

**CrudBatch.complete():**
- Called AFTER all entries in the batch have been successfully uploaded
- Removes the batch from `ps_crud` (PowerSync's durable outbox)
- If `complete()` is not called, PowerSync will retry `uploadData()` on next sync cycle

### PowerSyncConnectionManager component rationale (D9 fix)

`RootLayout` provides `AuthProvider` in its JSX — it cannot call `useAuth()` itself (a component cannot consume its own context). The `PowerSyncConnectionManager` is a thin child component that:
1. Lives inside `AuthProvider` (can call `useAuth()`)
2. Lives inside `PowerSyncContext.Provider` (can access the db if needed)
3. Uses `prevUserIdRef` to detect userId transitions (established pattern from `auth-patterns-consistency-rules.md`)

Key behaviours:
- Cold start, user previously signed in: MMKV → auth resolves → `userId` goes from `null` to the stored userId → effect fires → connect
- Sign out: `userId` → null → effect fires → disconnect
- Sign in (different user): `userId` changes to new string → effect fires → fresh connector → connect
- Token refresh (`TOKEN_REFRESHED` event): userId stays the same → `prevUserIdRef.current === userId` → effect is a no-op → existing connection continues

### initAdapter placement (P3 fix)

`initAdapter(new PowerSyncSyncAdapter(powerSyncDb))` is called at MODULE SCOPE in `_layout.tsx`, not inside a `useEffect`. This is intentional:

- The recovery modal in `apps/mobile/app/(app)/_layout.tsx` calls `getAdapter().enqueue()` from a `useEffect` that fires on the first render
- Module-scope calls in `_layout.tsx` run before any React rendering
- `getPowerSyncDatabase()` is synchronous (no async factory)
- The adapter is ready before any screen mounts

The `connect()` call (which IS async and requires auth) is separate, in `PowerSyncConnectionManager.useEffect`.

### SupabasePowerSyncConnector — circular dep avoidance

`packages/sync` MUST NOT import from `@exposure-buddy/supabase`. Dependency graph:
```
@exposure-buddy/supabase → @exposure-buddy/core
@exposure-buddy/sync     → @exposure-buddy/core
```
If sync imported supabase: `sync → supabase → core` (chain is fine), but the intent is to keep packages independent. The real risk is if supabase ever imports sync (would create a cycle). Injection avoids the issue entirely.

**Correct implementation for UpdateType import:**
```typescript
// packages/sync/src/connector.ts — import at TOP of file, not dynamically
import { UpdateType } from '@powersync/react-native'
```
`UpdateType` is a string enum (`'PUT'`, `'PATCH'`, `'DELETE'`). Import it at the top — no dynamic import needed.

### filterSnakeCase rationale (P4 fix)

`intent.tsx` currently passes both `updated_at` (ISO string for the DB column) and `updatedAt` (epoch-ms number for legacy compat) in enqueue payloads. When the adapter was a no-op stub, this was harmless. With real `db.execute()` calls, `updatedAt` would produce a non-existent column error. `filterSnakeCase` removes all keys with uppercase characters (camelCase keys) before building SQL.

This is intentional defensive behaviour — callers do not need to be updated atomically. Story 6.2-A removes the `status: 'in_progress'` enqueue from `intent.tsx` (T7.1) which is the only other caller that passes non-DB-column fields.

### intent.tsx: why remove in_progress entirely

The `in_progress` value was a hint to the ladder screen that an item has an active session. With PowerSync wired, the home screen (Story 6.2-B) checks `exposure_sessions WHERE status = 'started'` for the active-thread state — not `fear_ladder_items.status`. The ladder screen already has the "Start session" button gated on `item.status === 'pending'` and the active-session recovery route. The `in_progress` status update was redundant and is now prohibited by migration 0021.

No call sites OTHER than `intent.tsx` write `status: 'in_progress'` to `fear_ladder_items`.

### user_onboarding_metadata schema bump (AC 5 — 4-2-D5)

Adding `id: column.text` to the PowerSync schema bumps the schema version and triggers a local SQLite reset on first launch post-deploy. Any pending `user_onboarding_metadata` rows in `ps_crud` (outbox) are lost. Risk assessment:
- Pending `user_onboarding_metadata` writes can only exist if the user completed SUDS calibration BUT the no-op adapter silently dropped the enqueue. These writes never reached Supabase anyway.
- The `suds_calibration_value` is also stored in MMKV (`SUDS_CALIBRATION` key). After the reset, the outbox is empty but the local preference persists in MMKV.
- Net: no real-world data loss.

### Migration 0021 — constraint name

The original status check in `0013_fear_ladder_items.sql` has no explicit name; PostgreSQL auto-names it `fear_ladder_items_status_check`. The migration uses `DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check` — if the name differs on any specific Postgres version, the drop silently succeeds (IF EXISTS) and the new constraint is added regardless. Test against `supabase db reset` to verify.

### ARC-005 re-export list

`packages/sync/src/index.ts` re-exports from `@powersync/react-native`. This is safe because:
1. `packages/sync` already depends on `@powersync/react-native` (in `package.json`)
2. The ESLint rule bans `@powersync/*` only in `apps/mobile`, not in `packages/sync`
3. `apps/mobile` accesses all PowerSync APIs exclusively through `@exposure-buddy/sync`

Required re-exports:
- `useQuery` — reactive query hook (used by `useFearLadderItems`, and in Story 6.2-B for home screen queries)
- `usePowerSync` — returns `AbstractPowerSyncDatabase` (used for direct `db.execute()` in Story 6.2-C)
- `PowerSyncContext` — React context (used in `_layout.tsx` as `<PowerSyncContext.Provider value={db}>`)
- `UpdateType` (type) — used in `uploadData` handler
- `PowerSyncBackendConnector` (type), `AbstractPowerSyncDatabase` (type) — for `packages/sync` internal typing

---

## Testing Requirements

### packages/sync (Vitest)

**`packages/sync/__tests__/adapter.test.ts`** (new):
- Reorder convention equivalence (D15-resolved): both `'UPDATE' + { type: 'reorder_positions' }` and direct `'reorder_positions'` operation must call `db.writeTransaction` with identical SQL statements
- INSERT: verify `filterSnakeCase` removes camelCase keys; verify `INSERT OR IGNORE` SQL structure
- UPDATE: verify snake_case payload written as `SET col=?` clauses
- DELETE: verify `DELETE FROM table WHERE id=?`
- `getAdapter()` throws before `initAdapter()` is called

### packages/supabase (Vitest + local Supabase)

**`packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts`** (new):
- Follow `dpo_audit_log.test.ts` structure exactly (skipIf, service client, test user create/cleanup)
- `describe.skipIf(skipIfNoSupabase)('uq_active_thread partial unique index')`
- First `started` row for `(userId, fearItemId)` → succeeds
- Second `started` row for same pair → Supabase error (unique violation)
- Second row for different `fearItemId` → succeeds
- Row with `status='abandoned'` for same pair → succeeds (partial index only covers `started`)

### apps/mobile (Jest + RNTL)

**`apps/mobile/src/hooks/useFearLadderItems.test.ts`** (new — simple unit):
```typescript
// Mock @exposure-buddy/sync to return known rows
jest.mock('@exposure-buddy/sync', () => ({
  useQuery: jest.fn(() => ({ data: [
    { id: '1', description: 'Fear A', predicted_suds: 5, peak_suds: null, position: 1, status: 'pending' }
  ]})),
}))
```
- Verify `useFearLadderItems(null)` maps row to `FearLadderItem` (camelCase fields)
- Verify `peakSuds` is `null` (not 0 or undefined) when DB value is null
- Verify `status` is `'pending'` cast to `FearLadderItemStatus`

---

## Out of Scope — do NOT implement in this story

1. **`resolveHomeScreenState` full 8-state machine** — Story 6.2-B
2. **Morning state UI (AC 1 of original spec)** — Story 6.2-B
3. **`resolveLowestPendingItem` tiebreaker sort** — Story 6.2-B (though the SQL query `ORDER BY position ASC, id ASC` establishes consistent ordering from the DB layer)
4. **Home screen `usePowerSync` / active-thread query in `index.tsx`** — Story 6.2-B
5. **CourageLadderEntryCard SUDS clamp** — Story 6.2-B
6. **i18n keys for state3/state4/state10** — Story 6.2-B
7. **Ladder item delete (AC 7 of original spec)** — Story 6.2-C
8. **`swap_ladder_positions` Postgres RPC** (D6) — Story 6.2-C (the adapter's `uploadData` handles reorders as two PATCH ops for now — non-atomic; RPC makes it atomic)
9. **DELETE RLS policy on `fear_ladder_items`** — Story 6.2-C
10. **`dpo_audit_log` entry on fear item deletion** — Story 6.2-C
11. **Real E2E sync test** — `EXPO_PUBLIC_POWERSYNC_URL` may not be provisioned; `uploadData` runs locally but cannot verify round-trip to Supabase cloud
12. **Hermes CJS redirect for `@powersync/react-native`** — investigate at implementation time; the existing Metro CJS redirect for `@supabase/supabase-js` (`metro.config.js`) may serve as a template if needed

---

## Anti-Patterns to Avoid

- **Do not use `db.useQuery()` (method on db object).** `useQuery` is a top-level React hook exported from `@powersync/react-native`. Usage: `const { data } = useQuery<Row>(QUERY)`.
- **Do not reference `PowerSyncProvider`.** It doesn't exist. Use `<PowerSyncContext.Provider value={db}>`.
- **Do not call `transaction.complete()` in `uploadData`.** Call `batch.complete()` — `batch` is the `CrudBatch` returned by `getCrudBatch()`.
- **Do not put `getPowerSyncDatabase()` inside a React component.** It creates a new db instance on every render (until the singleton guard fires, but the module-scope call is cleaner and avoids any race).
- **Do not use `connectedRef` to guard `connect()`.** A ref survives sign-out → sign-in. Use the `prevUserIdRef` pattern to detect transitions.
- **Do not add `@powersync/*` imports in `apps/mobile`.** Route all PowerSync access through `@exposure-buddy/sync`.
- **Do not import from `@exposure-buddy/supabase` in `packages/sync/src/connector.ts`.** Inject the Supabase client as a constructor argument.
- **Do not call `initAdapter()` inside a `useEffect`.** Call it at module scope so screens can call `getAdapter()` on first render.
- **Do not pass `onConflict: 'user_id'` or any onConflict override to `supabase.from().upsert()` in the generic connector.** The connector doesn't know which column is the PK for each table. PostgREST's default behaviour (use the table's PK) is correct.
- **Do not delete the `in_progress` branch from `statusLabel()` in `ladder.tsx`.** Stale pre-migration rows from any connected device will carry `status = 'in_progress'` until they sync and get the app-level backfill.

---

## References

- `_bmad-output/implementation-artifacts/_archive/6-2-rejected.md:877–948` — Roundtable Recommended Redraft Plan; D1/D2/D3/D4/D5/D6/D7/D8/D9/D14/D15 resolutions
- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — 8-state machine (context; implementation in 6.2-B)
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — ADR-001 (core boundary), ADR-003 (MMKV), ADR-004 (startup sequence), ADR-008 (PowerSync API)
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — Example 3 (derived state hook), auth patterns (prevRef), ARC-005
- `packages/sync/src/adapter.ts` — current no-op stub (full file; T3.4 replaces)
- `packages/sync/src/client.ts` — current factory (full file; T3.2 changes to singleton)
- `packages/sync/src/schema.ts` — current schema (full file; T3.1 adds id column)
- `packages/sync/src/index.ts` — current exports (full file; T3.5 updates)
- `apps/mobile/app/_layout.tsx` — root layout (full file; T4.1 modifies)
- `apps/mobile/src/sync/adapter.ts` — thin re-export (full file; T5.1 replaces)
- `apps/mobile/src/hooks/useFearLadderItems.ts` — current stub (full file; T6.1 replaces)
- `apps/mobile/app/session/intent.tsx:107–115` — in_progress enqueue block (T7.1 removes)
- `apps/mobile/app/ladder.tsx:148–151` — statusLabel function (T8.1 adds comment)
- `packages/core/src/selectors/fearLadder.ts` — current selector (T2.1 adds FearLadderItemStatus)
- `supabase/migrations/0013_fear_ladder_items.sql` — source of old status constraint name
- `packages/supabase/__tests__/rls/dpo_audit_log.test.ts` — pgTAP test pattern to follow
- `node_modules/.pnpm/@powersync+react@1.10.0_*/node_modules/@powersync/react/lib/index.d.ts` — verified hook exports
- `node_modules/.pnpm/@powersync+common@1.53.1/node_modules/@powersync/common/lib/client/sync/bucket/CrudBatch.d.ts` — `batch.complete()` signature
- `node_modules/.pnpm/@powersync+common@1.53.1/node_modules/@powersync/common/lib/client/sync/bucket/CrudEntry.d.ts` — `CrudEntry` shape and `UpdateType` enum

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

**New files:**
- `supabase/migrations/0021_fear_ladder_items_constraints.sql`
- `supabase/migrations/0022_exposure_sessions_active_thread.sql`
- `packages/sync/src/connector.ts`
- `packages/sync/__tests__/adapter.test.ts`
- `packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts`
- `apps/mobile/src/hooks/useFearLadderItems.test.ts`

**Modified files:**
- `packages/core/src/selectors/fearLadder.ts` — `FearLadderItemStatus` type; `FearLadderItem.status` narrowed
- `packages/core/src/index.ts` — export `FearLadderItemStatus`
- `packages/sync/src/schema.ts` — `id: column.text` on `user_onboarding_metadata`
- `packages/sync/src/client.ts` — lazy singleton `getPowerSyncDatabase()`
- `packages/sync/src/adapter.ts` — real durable implementation with `initAdapter` / `getAdapter`
- `packages/sync/src/index.ts` — connector, singleton, `initAdapter`, `getAdapter` + hook re-exports
- `apps/mobile/app/_layout.tsx` — `PowerSyncContext.Provider`, `PowerSyncConnectionManager`, module-scope `initAdapter`
- `apps/mobile/src/sync/adapter.ts` — re-exports from `@exposure-buddy/sync`
- `apps/mobile/src/hooks/useFearLadderItems.ts` — real `useQuery` hook
- `apps/mobile/app/session/intent.tsx` — remove `in_progress` status enqueue (lines 107–115)
- `apps/mobile/app/ladder.tsx` — legacy comment on `in_progress` branch

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-06-16 | Story drafted as 6.2-A (PowerSync Foundation split); status `ready-for-dev` | Claude Sonnet 4.6 (bmad-create-story) |
