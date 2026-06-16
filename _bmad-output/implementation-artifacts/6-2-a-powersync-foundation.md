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

### AC 2 — Auth lifecycle: connect on sign-in, disconnectAndClear on sign-out

**Given** the original rejected spec used a `connectedRef` that prevented reconnection after sign-out (D9)
**When** this story is implemented
**Then**:
- A `PowerSyncConnectionManager` component (inline in `_layout.tsx`) is a direct child of `AuthProvider`; it calls `useAuth()` and manages the lifecycle
- On each `userId` change (detected via `prevUserIdRef` initialised to `undefined`): if `userId` is `undefined` (auth still loading), the manager is a no-op and the effect returns early; if `userId` is a non-null string, resolve the per-user `powerSyncDb = getPowerSyncDatabase(userId)`, create a fresh `SupabasePowerSyncConnector(createSupabaseClient())`, and call `powerSyncDb.connect(connector)`; if `userId` is `null`, call `powerSyncDb.disconnectAndClear()` (clears local SQLite rows so user A's data is not visible to user B on shared devices — see Dev Notes "Per-user data isolation")
- All `connect()` / `disconnectAndClear()` calls are SEQUENCED through a single `inFlightRef = useRef<Promise<void>>(Promise.resolve())` chain inside `PowerSyncConnectionManager`. Each `userId` transition appends to the chain: `inFlightRef.current = inFlightRef.current.then(() => userId ? connect(...) : disconnectAndClear()).catch(logSyncLifecycleError)`. Eliminates the race where a late-resolving `connect()` arrives after a `disconnect()` (or vice versa) and leaves the app connected for a signed-out user.
- `logSyncLifecycleError(err)` calls `console.error('[PowerSync] lifecycle error:', err)` AND emits a Sentry breadcrumb (or equivalent observability hook — see Dev Notes "PowerSync observability") so silent fire-and-forget failures are diagnosable in production
- Signing out then signing back in as a different user creates a fresh connector bound to the new user's session AND wipes local SQLite via `disconnectAndClear()` — no state leaks between users

### AC 3 — SupabasePowerSyncConnector: fetchCredentials and uploadData

**Given** the rejected spec had multiple bugs in the connector (P1: `transaction.complete()` should be `batch.complete()`; P2: wrong `onConflict` for `user_onboarding_metadata`; P9: SupabaseClientLike interface missing fields; P10: empty EXPO_PUBLIC_POWERSYNC_URL should return null)
**When** this story is implemented
**Then**:
- `SupabasePowerSyncConnector` in `packages/sync/src/connector.ts` implements `PowerSyncBackendConnector` (from `@powersync/react-native`)
- The Supabase client is injected as a constructor argument typed against the real `SupabaseClient` via TYPE-ONLY import: `import type { SupabaseClient } from '@supabase/supabase-js'`. This carries zero runtime cost (TS strips type-only imports at compile) and does not create a runtime cycle. The hand-rolled `SupabaseClientLike` interface from the rejected spec is removed.
- `fetchCredentials()`: gets session via `supabaseClient.auth.getSession()`; if no session, returns `null`; if `EXPO_PUBLIC_POWERSYNC_URL` is falsy, returns `null`; if `EXPO_PUBLIC_POWERSYNC_URL` is set but fails URL validation (`try { new URL(endpoint) } catch { return null }`), returns `null` (logs a one-time warning so misconfigured environments are diagnosable); if `session.expires_at` is `undefined` (Supabase types it as `number | undefined` per `@supabase/auth-js@2.106.1/lib/types.d.ts:270`), returns `null`; otherwise returns `{ endpoint, token: session.access_token, expiresAt: new Date(session.expires_at * 1000) }` (matches `PowerSyncCredentials` from `@powersync/common`)
- `uploadData(database)`: calls `await database.getCrudBatch(200)` — if null (nothing to upload) returns immediately; for each `CrudEntry` in `batch.crud`: `UpdateType.PUT` → `supabaseClient.from(entry.table).upsert({ ...entry.opData, id: entry.id }, onConflictForTable(entry.table))` where `onConflictForTable(table)` returns `{ onConflict: ON_CONFLICT_OVERRIDES[table] }` for tables listed in the registry (currently `{ user_onboarding_metadata: 'user_id' }`) and `undefined` for all others (let PostgREST use the table's PRIMARY KEY); `UpdateType.PATCH` → `supabaseClient.from(entry.table).update(entry.opData!).eq('id', entry.id)`; `UpdateType.DELETE` → `supabaseClient.from(entry.table).delete().eq('id', entry.id)`; if any Supabase call returns `error`, re-throw (PowerSync will retry); on success call `await batch.complete()`
- The PUT spread order is `{ ...entry.opData, id: entry.id }` — `entry.id` MUST come last so a stray `id` field inside `opData` cannot override the canonical entry id
- `SupabasePowerSyncConnector` does NOT runtime-import from `@exposure-buddy/supabase`. The type-only `SupabaseClient` import from `@supabase/supabase-js` is permitted because (a) TS strips it at compile, leaving no runtime dependency edge, and (b) it eliminates the maintenance burden of a hand-rolled minimal interface (which previously caused P9). See Dev Notes "Connector boundary clarification".
- `packages/sync` does NOT become a runtime dep of `packages/supabase`. `@supabase/supabase-js` must be a `devDependency` (or `peerDependency`) in `packages/sync/package.json` — type-only consumers should not list it as a runtime dep.

### AC 4 — Durable PowerSyncSyncAdapter replaces no-op stub

**Given** `PowerSyncSyncAdapter` currently no-ops every `enqueue()` call (writes are lost on restart)
**When** this story is implemented
**Then**:
- `PowerSyncSyncAdapter` in `packages/sync/src/adapter.ts` takes `AbstractPowerSyncDatabase` as a constructor argument
- `enqueue('table', 'INSERT', payload)` → `db.execute('INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)', [vals])` (plain `INSERT` — no `OR IGNORE`; constraint violations propagate as SQLite errors → through `enqueue()` → to the caller, so the new `uq_user_position` and `uq_active_thread` constraints are enforced offline as well as on Supabase). Payload is filtered to snake_case keys first; if the filtered payload is empty, `enqueue()` throws `Error('[sync] INSERT payload empty after snake_case filter')` rather than producing invalid SQL.
- `enqueue('table', 'UPDATE', payload)` where `payload.type !== 'reorder_positions'` → `db.execute('UPDATE table SET col1=?, col2=? WHERE id=?', [...vals, id])` using only snake_case keys excluding `id`. If `id` is missing or `Object.keys(rest).length === 0`, `enqueue()` throws a descriptive error (do not silently generate invalid SQL).
- `enqueue('table', 'UPDATE', { type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition })` → `db.writeTransaction(async tx => { await tx.execute('UPDATE table SET position=?, updated_at=? WHERE id=?', [posA, now, idA]); await tx.execute('UPDATE table SET position=?, updated_at=? WHERE id=?', [posB, now, idB]) })` where `now = new Date().toISOString()` is computed ONCE at the start of `enqueue()` and reused for both statements (reconciles the `UPDATE` envelope from `(onboarding)/ladder.tsx`)
- `enqueue('table', 'reorder_positions', { itemAId, itemANewPosition, itemBId, itemBNewPosition })` → same two-transaction writes as above (reconciles the direct operation from `ladder.tsx`)
- `enqueue('table', 'DELETE', { id })` → `db.execute('DELETE FROM table WHERE id=?', [id])`
- Both reorder calling conventions produce IDENTICAL `db.execute()` calls (identical SQL AND identical `now` timestamp parameters within one call) — verified by a Vitest test (see T9.1)
- Constraint violations from `INSERT`, `UPDATE`, or reorder transactions are raised, not swallowed. Callers that originate writes (`apps/mobile/app/session/intent.tsx`, `apps/mobile/app/ladder.tsx`, `apps/mobile/app/(onboarding)/ladder.tsx`) currently do NOT have try/catch around `getAdapter().enqueue(...)` calls — surfacing those errors to the UI is out of scope for 6.2-A (see Out of Scope item #13) but the foundation now raises them.
- `initAdapter(adapter: SyncAdapter)` and `getAdapter(): SyncAdapter` are exported; `getAdapter()` throws if called before `initAdapter()`
- `initAdapter` is called at MODULE SCOPE in `apps/mobile/app/_layout.tsx` (before any useEffect fires) so that the recovery modal in `(app)/_layout.tsx` can call `getAdapter()` safely from any later React lifecycle (event handler, useEffect, render)

### AC 5 — PowerSync db PER-USER singleton and schema bump

**Given** `createPowerSyncDatabase()` currently returns a new instance on every call and `user_onboarding_metadata` lacks an `id` column (deferred 4-2-D5)
**When** this story is implemented
**Then**:
- `packages/sync/src/client.ts` exports `getPowerSyncDatabase(userId: string)` that returns a per-user singleton — the `dbFilename` is derived deterministically from `userId` (e.g. `exposure-buddy-<sha256(userId).slice(0,16)>.db`); a module-level `Map<string, PowerSyncDatabase>` caches one instance per user so repeat calls within a session return the same handle. `createPowerSyncDatabase(dbFilename?)` is kept for tests that need a fresh, non-cached instance.
- The per-user `dbFilename` is the PHYSICAL boundary that prevents user A's local SQLite rows from being visible to user B on a shared device — combined with `disconnectAndClear()` on sign-out (AC 2), this is defence in depth. The dev-rationale references "shared family phones in India" — see Dev Notes "Per-user data isolation".
- `packages/sync/src/schema.ts` `user_onboarding_metadata` table gains `id: column.text` as the first column (client-generated UUID primary key deferred from 4-2-D5)
- Schema version bump triggers PowerSync to reset local SQLite on next launch — expected behaviour for dev; offline-first users with pending `user_onboarding_metadata` writes accept data loss for this one table (this is the only pending write at risk; see Dev Notes)

### AC 6 — ARC-005 ESLint boundary resolved via re-exports

**Given** `apps/mobile/.eslintrc.js` bans `@powersync/react-native` and `@powersync/common` imports (ARC-005), and `useFearLadderItems` and home screen will need `useQuery`
**When** this story is implemented
**Then**:
- `packages/sync/src/index.ts` re-exports: `useQuery`, `usePowerSync`, `PowerSyncContext` from `@powersync/react-native`; `PowerSyncBackendConnector`, `AbstractPowerSyncDatabase`, `UpdateType` from `@powersync/react-native`
- `apps/mobile` imports these exclusively from `@exposure-buddy/sync` — no direct `@powersync/*` import anywhere in `apps/mobile`
- `pnpm turbo lint` passes with zero ARC-005 violations

### AC 7 — useFearLadderItems: real useQuery hook with isLoading

**Given** `apps/mobile/src/hooks/useFearLadderItems.ts` returns an empty stub array
**When** this story is implemented
**Then**:
- The stub is replaced with a real `useQuery<Row>(QUERY)` call (hook from `@exposure-buddy/sync`)
- Query: `SELECT id, description, predicted_suds, peak_suds, position, status FROM fear_ladder_items ORDER BY position ASC, id ASC` (id ASC establishes consistent ordering; tiebreaker logic in `resolveLowestPendingItem` is Story 6.2-B)
- Hook signature changes from `useFearLadderItems(_userId): FearLadderItem[]` to `useFearLadderItems(_userId): { items: FearLadderItem[]; isLoading: boolean }`. `isLoading` is forwarded from `useQuery`'s `isLoading` (true until the first SQLite query resolves; distinct from `items.length === 0` which means "loaded, zero rows"). Story 6.2-B's home-screen state machine needs this distinction to render a spinner vs the empty-ladder state.
- Results mapped from snake_case to `FearLadderItem` (camelCase) via `useMemo`
- `peak_suds` typed as `number | null` (PowerSync integer columns are nullable)
- `status` is RUNTIME-validated, not cast: rows with a status not in `('pending', 'completed')` (e.g. a legacy `'in_progress'` row from a pre-migration sync) are filtered out of `items` and a one-time `console.warn('[useFearLadderItems] filtering row with unexpected status:', status)` is emitted. This is consistent with AC 8 keeping the `in_progress` UI branch defensively while the migration backfills server-side.
- `_userId` param kept for call-site compat (combined defences: per-user `dbFilename` from AC 5 means user B's local DB never contained user A's rows; PowerSync sync-rules scope the upstream stream by `auth.uid()`)
- All call sites that destructure the hook return value are updated. Currently `apps/mobile/app/ladder.tsx` calls `useFearLadderItems(userId)` and treats the return as an array — update to `const { items, isLoading } = useFearLadderItems(userId)` and render a spinner when `isLoading` is true.
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
- Vitest test (Supabase service-role client, following the `dpo_audit_log.test.ts` pattern) in `packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts` verifies the constraint fires (see T9.2)

---

## Tasks / Subtasks

### T1 — DB Migrations

- [ ] **T1.1**: Create `supabase/migrations/0021_fear_ladder_items_constraints.sql`. All four steps run inside a single transaction so that if step 4 (UNIQUE) fails on existing duplicate `(user_id, position)` rows, steps 1–3 roll back and the table is not left half-migrated:
  ```sql
  -- Story 6.2-A: narrow status to MVP values; add deferrable position uniqueness

  BEGIN;

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

  COMMIT;
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

- [ ] **T2.3**: Update `packages/core/src/__tests__/selectors/fearLadder.test.ts`:
  - The existing test fixture at line 25 calls `makeItem('x', 1, 'in_progress')` — after T2.1 this literal is no longer assignable to `FearLadderItemStatus`.
  - Replace the `'in_progress'` literal with `'pending'` (or `'completed'`, whichever preserves the test's intent). If the test was specifically asserting `in_progress` handling, that assertion is now obsolete and should be deleted along with any related arrange/act/assert lines.
  - Without this update, T9.3 (`pnpm turbo typecheck` — zero errors) will fail.

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

- [ ] **T3.2**: Update `packages/sync/src/client.ts` — per-user singleton (sha256 keyed):
  ```typescript
  import { PowerSyncDatabase } from '@powersync/react-native'
  import { sha256 } from '@noble/hashes/sha256'      // already available in monorepo
  import { bytesToHex } from '@noble/hashes/utils'
  import { AppSchema } from './schema'

  const _dbByUserId = new Map<string, PowerSyncDatabase>()

  function dbFilenameForUser(userId: string): string {
    // Deterministic per-user filename — physical boundary against cross-user reads on shared devices.
    // SHA-256 (16 hex chars = 64 bits) — collision probability is negligible at user-count scales.
    const hash = bytesToHex(sha256(userId)).slice(0, 16)
    return `exposure-buddy-${hash}.db`
  }

  export function getPowerSyncDatabase(userId: string): PowerSyncDatabase {
    const cached = _dbByUserId.get(userId)
    if (cached) return cached
    const db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: dbFilenameForUser(userId) } })
    _dbByUserId.set(userId, db)
    return db
  }

  // Test-only: fresh instance with caller-supplied filename. Not memoised.
  export function createPowerSyncDatabase(dbFilename = 'exposure-buddy-test.db'): PowerSyncDatabase {
    return new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename } })
  }
  ```
  **Note:** If `@noble/hashes` is not already a transitive dep of `packages/sync`, add it as a direct dep. Alternative: use any deterministic short-hash function already in the codebase (e.g. djb2 — see `packages/core/src/util/`).

- [ ] **T3.3**: Create `packages/sync/src/connector.ts`:

  ```typescript
  import type { PowerSyncBackendConnector, AbstractPowerSyncDatabase, CrudEntry } from '@powersync/react-native'
  import { UpdateType } from '@powersync/react-native'
  // Type-only import — TS strips this at compile, no runtime edge added.
  // Eliminates the hand-rolled SupabaseClientLike interface (which previously caused P9).
  import type { SupabaseClient } from '@supabase/supabase-js'

  // Per-table onConflict registry. Tables not listed here use PostgREST's PK default.
  // user_onboarding_metadata has id UUID PRIMARY KEY + UNIQUE(user_id); migration 0012:26
  // explicitly directs the outbox adapter to use ON CONFLICT (user_id) DO UPDATE for
  // retry idempotency (two client-generated ids for the same user_id must converge to
  // an update, not a duplicate insert failure).
  const ON_CONFLICT_OVERRIDES: Record<string, string> = {
    user_onboarding_metadata: 'user_id',
  }

  function upsertOptionsFor(table: string): { onConflict: string } | undefined {
    const col = ON_CONFLICT_OVERRIDES[table]
    return col ? { onConflict: col } : undefined
  }

  let _urlValidationWarned = false

  export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
    constructor(private readonly supabase: SupabaseClient) {}

    async fetchCredentials() {
      const endpoint = process.env['EXPO_PUBLIC_POWERSYNC_URL']
      if (!endpoint) return null  // not configured in this env — local/CI use

      // Validate URL — a typo'd EXPO_PUBLIC_POWERSYNC_URL would otherwise surface as a
      // fire-and-forget connect() error that AC 2 mandates be only logged. Fail loud here.
      try {
        new URL(endpoint)
      } catch {
        if (!_urlValidationWarned) {
          console.warn('[PowerSync] EXPO_PUBLIC_POWERSYNC_URL is not a valid URL:', endpoint)
          _urlValidationWarned = true
        }
        return null
      }

      const { data: { session } } = await this.supabase.auth.getSession()
      if (!session) return null
      if (typeof session.expires_at !== 'number') return null  // Supabase types expires_at as number | undefined

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

    private async _uploadEntry(entry: CrudEntry): Promise<{ error: unknown }> {
      if (entry.op === UpdateType.PUT) {
        // Spread opData first, then id LAST so a stray opData.id cannot override the canonical entry id.
        const opts = upsertOptionsFor(entry.table)
        return opts
          ? this.supabase.from(entry.table).upsert({ ...entry.opData, id: entry.id }, opts)
          : this.supabase.from(entry.table).upsert({ ...entry.opData, id: entry.id })
      } else if (entry.op === UpdateType.PATCH) {
        return this.supabase.from(entry.table).update(entry.opData ?? {}).eq('id', entry.id)
      } else {
        // DELETE
        return this.supabase.from(entry.table).delete().eq('id', entry.id)
      }
    }
  }
  ```

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
      const now = new Date().toISOString()  // computed once per enqueue call; reused in _reorder

      if (operation === 'INSERT') {
        const snake = filterSnakeCase(p)
        if (Object.keys(snake).length === 0) {
          throw new Error(`[sync] INSERT payload empty after snake_case filter for table ${table}`)
        }
        const cols = Object.keys(snake).join(', ')
        const placeholders = Object.keys(snake).map(() => '?').join(', ')
        // Plain INSERT (no OR IGNORE) — constraint violations propagate to caller so the
        // new uq_user_position / uq_active_thread constraints are enforced offline too.
        await this.db.execute(
          `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
          Object.values(snake),
        )
      } else if (operation === 'UPDATE') {
        if (p['type'] === 'reorder_positions') {
          await this._reorder(table, p, now)
        } else {
          const { id, ...rest } = filterSnakeCase(p)
          if (id === undefined) {
            throw new Error(`[sync] UPDATE payload missing id for table ${table}`)
          }
          if (Object.keys(rest).length === 0) {
            throw new Error(`[sync] UPDATE payload has no fields to SET for table ${table}`)
          }
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
      } else {
        throw new Error(`[sync] unknown operation: ${operation}`)
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

  // Filter payload to valid snake_case column names. Tightened regex rejects keys
  // starting with `_`, digits, or containing uppercase / non-ASCII — prevents both
  // accidental camelCase fields (updatedAt) AND SQL identifier injection / prototype
  // pollution via crafted payload keys (`__proto__`, `1col`, etc).
  const SNAKE_KEY_RE = /^[a-z][a-z0-9_]*$/
  function filterSnakeCase(p: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(p).filter(([k]) => SNAKE_KEY_RE.test(k)))
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

- [ ] **T4.1**: Update `apps/mobile/app/_layout.tsx` — add the following, preserving ALL existing logic exactly. Because `getPowerSyncDatabase` is now per-user (AC 5), the db handle and adapter are resolved INSIDE `PowerSyncConnectionManager` (on each userId change), NOT at module scope. The recovery modal at `apps/mobile/app/(app)/_layout.tsx` calls `getAdapter()` from event handlers and from `useEffect` — both fire after first render, so `initAdapter()` can happen inside the connection manager's effect.

  **Module-scope additions** (after existing module-scope calls):
  ```typescript
  import { PowerSyncContext, initAdapter, getPowerSyncDatabase, PowerSyncSyncAdapter, SupabasePowerSyncConnector } from '@exposure-buddy/sync'
  // createSupabaseClient is exported from packages/supabase/src/client.ts → index.ts
  import { createSupabaseClient, useAuth } from '@exposure-buddy/supabase'
  // Add useAuth to the existing @exposure-buddy/supabase import (currently imports AuthProvider, OnboardingProvider, initSession, MMKV)
  ```

  **New inner component** (defined inside the file, after `RootLayout`):
  ```typescript
  function logSyncLifecycleError(err: unknown) {
    console.error('[PowerSync] lifecycle error:', err)
    // TODO(observability): Sentry.addBreadcrumb({ category: 'powersync', message: 'lifecycle error', data: { err: String(err) } })
    // — wire into the project's existing initErrorHandler() infra; see Dev Notes "PowerSync observability".
  }

  function PowerSyncConnectionManager({ children }: { children: React.ReactNode }) {
    const { userId } = useAuth()
    // undefined sentinel: auth still loading. null: signed-out. string: signed-in user id.
    const prevUserIdRef = useRef<string | null | undefined>(undefined)
    // Single in-flight promise chain — sequences connect/disconnectAndClear so a late-resolving
    // connect() cannot arrive after a sign-out and leave the app connected for a signed-out user.
    const inFlightRef = useRef<Promise<void>>(Promise.resolve())
    // Track the current per-user db so the disconnect branch operates on the right instance.
    const currentDbRef = useRef<ReturnType<typeof getPowerSyncDatabase> | null>(null)

    useEffect(() => {
      if (userId === undefined) return                          // auth still loading
      if (userId === prevUserIdRef.current) return              // no transition
      const prev = prevUserIdRef.current
      prevUserIdRef.current = userId

      if (userId) {
        const db = getPowerSyncDatabase(userId)
        currentDbRef.current = db
        // initAdapter is per-user too: each userId gets its own adapter instance bound to its db.
        initAdapter(new PowerSyncSyncAdapter(db))
        const connector = new SupabasePowerSyncConnector(createSupabaseClient())
        inFlightRef.current = inFlightRef.current
          .then(() => db.connect(connector))
          .catch(logSyncLifecycleError)
      } else {
        const db = currentDbRef.current
        currentDbRef.current = null
        if (!db) return  // nothing to disconnect
        inFlightRef.current = inFlightRef.current
          .then(() => db.disconnectAndClear())
          .catch(logSyncLifecycleError)
      }
    }, [userId])

    return <>{children}</>
  }
  ```

  **JSX changes** — wrap the inner tree with `PowerSyncContext.Provider` (value resolved from the per-user db ref) and `PowerSyncConnectionManager`. Note: because the db now changes per user, `PowerSyncContext.Provider`'s value cannot be a single module-scope handle; pass `currentDbRef.current` via state from `PowerSyncConnectionManager`, OR move the Provider inside the manager (preferred — see Dev Notes "PowerSyncContext.Provider placement"):

  ```tsx
  // Before:
  <GestureHandlerRootView>
    <AuthProvider mmkv={mmkv}>
      <OnboardingProvider mmkv={mmkv}>
        <SafeAreaProvider>
          <ReducedMotionProvider>
            <ThemeProvider>
              <Stack>
                <Stack.Screen ... />
                <Stack.Screen ... />
                {/* etc — preserve every Stack.Screen registration */}
              </Stack>
              <PortalHost />
            </ThemeProvider>
          </ReducedMotionProvider>
        </SafeAreaProvider>
      </OnboardingProvider>
    </AuthProvider>
  </GestureHandlerRootView>

  // After:
  <GestureHandlerRootView>
    <AuthProvider mmkv={mmkv}>
      <PowerSyncConnectionManager>
        {/* PowerSyncContext.Provider is placed INSIDE PowerSyncConnectionManager so that
            the per-user db handle (currentDbRef.current) can be passed as value. */}
        <OnboardingProvider mmkv={mmkv}>
          <SafeAreaProvider>
            <ReducedMotionProvider>
              <ThemeProvider>
                <Stack>
                  <Stack.Screen ... />
                  <Stack.Screen ... />
                  {/* etc — preserve every Stack.Screen registration verbatim */}
                </Stack>
                <PortalHost />
              </ThemeProvider>
            </ReducedMotionProvider>
          </SafeAreaProvider>
        </OnboardingProvider>
      </PowerSyncConnectionManager>
    </AuthProvider>
  </GestureHandlerRootView>
  ```

  **Implementation note on PowerSyncContext.Provider:** Since the db handle is per-user, the cleanest pattern is to lift `db` into local state inside `PowerSyncConnectionManager` (e.g. `const [db, setDb] = useState<PowerSyncDatabase | null>(null)`) and render `<PowerSyncContext.Provider value={db ?? noopDb}>` where `noopDb` is a placeholder used while signed-out. Confirm the exact pattern with installed `@powersync/react` `PowerSyncContext` defaults (it may accept `null`).

  **Invariants that MUST survive unchanged:**
  - `initErrorHandler()` module-scope call
  - `SplashScreen.preventAutoHideAsync()` module-scope call
  - `i18n` side-effect import order
  - `useFonts()` + `splashHidden` ref + `SplashScreen.hideAsync()` logic
  - The early `if (!fontsLoaded && !fontError) return null` guard (must remain BEFORE the PowerSyncContext.Provider so no partial provider renders during font load)
  - ALL `Stack.Screen` registrations unchanged (do not drop any during the rewrite — the `...` in the snippets above is illustrative)
  - `GestureHandlerRootView`, `ReducedMotionProvider`, `ThemeProvider`, `SafeAreaProvider` placement unchanged
  - `PortalHost` placement unchanged

### T5 — apps/mobile/src/sync/adapter.ts

- [ ] **T5.1**: Replace the module with thin re-exports from `@exposure-buddy/sync`:
  ```typescript
  export { getAdapter, initAdapter, SyncMode } from '@exposure-buddy/sync'
  export type { SyncAdapter } from '@exposure-buddy/sync'
  ```
  Callers (`apps/mobile/app/session/active.tsx`, etc.) already import `getAdapter` from this path — no call-site changes required.

### T6 — apps/mobile/src/hooks/useFearLadderItems.ts

- [ ] **T6.1**: Replace stub with real `useQuery` hook — return shape changes to `{ items, isLoading }`:
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

  const VALID_STATUSES = new Set<FearLadderItemStatus>(['pending', 'completed'])

  function isFearLadderItemStatus(s: string): s is FearLadderItemStatus {
    return VALID_STATUSES.has(s as FearLadderItemStatus)
  }

  export function useFearLadderItems(
    _userId: string | null,
  ): { items: FearLadderItem[]; isLoading: boolean } {
    const { data, isLoading } = useQuery<FearLadderRow>(QUERY)
    const items = useMemo<FearLadderItem[]>(
      () => (data ?? [])
        .filter(row => {
          if (!isFearLadderItemStatus(row.status)) {
            // Legacy 'in_progress' or any other unexpected value — filter out and warn.
            // AC 8 keeps the in_progress branch in ladder.tsx defensively; this hook
            // now refuses to surface such rows so downstream type narrowing is sound.
            console.warn('[useFearLadderItems] filtering row with unexpected status:', row.status, row.id)
            return false
          }
          return true
        })
        .map(row => ({
          id: row.id,
          description: row.description,
          predictedSuds: row.predicted_suds,
          peakSuds: row.peak_suds,
          position: row.position,
          status: row.status as FearLadderItemStatus,  // narrowed by the filter above
        })),
      [data],
    )
    return { items, isLoading }
  }
  ```
  **Call-site update:** `apps/mobile/app/ladder.tsx` currently treats the return as an array. Update to `const { items, isLoading } = useFearLadderItems(userId)` and render a spinner (or the existing skeleton) when `isLoading` is true. Add `apps/mobile/app/ladder.tsx` to the Modified Files list.

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
  The surrounding enqueue calls (a), (b), (c), and (e) onward are unchanged. After deletion, renumber ALL subsequent step-label comments to close the gap (verify by `grep '// (' apps/mobile/app/session/intent.tsx`):
  - step (e) → (d)  ("Write SESSION_IN_PROGRESS JSON blob to MMKV")
  - step (f) → (e)
  - step (g) → (f)
  - …continue for every step-label comment after the deleted block.

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

    // Same SQL statements AND same params (timestamps included): `now` is computed once
    // per enqueue() call and reused for both UPDATEs inside the writeTransaction, so calls
    // A and B should be byte-for-byte identical. (The drift between two separate enqueue()
    // calls is acceptable — that's not what this test checks; it checks the two CONVENTIONS
    // produce identical writes from a single payload.)
    expect(mockTx.execute.mock.calls).toEqual(callsA_recorded)
  })
  ```
  **Note:** rewrite the assertion to compare the full `mock.calls` arrays (SQL + params) once you capture them, not just the SQL strings. The previous spec acknowledged params would differ — they should NOT differ within one `enqueue()` call now that `now` is computed once.

- [ ] **T9.2**: Create `packages/supabase/__tests__/rls/exposure_sessions_active_thread.test.ts` — Vitest test (Supabase service-role client, not pgTAP) verifying `uq_active_thread` constraint (D15):
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
  useFearLadderItems()   → useQuery() → { items, isLoading } from local PowerSync table
  PowerSync db           → per-user singleton (Map<userId, PowerSyncDatabase>)
  Auth lifecycle         → sequenced via inFlightRef chain: connect on sign-in, disconnectAndClear on sign-out
  ESLint ARC-005         → useQuery/usePowerSync/PowerSyncContext re-exported from @exposure-buddy/sync
```

### Verified PowerSync API surface (@powersync/react-native@1.34.0 / @powersync/react@1.10.0 / @powersync/common@1.53.1)

The rejected spec contained several wrong assumptions about the API. Verified against installed type declarations:

| Claim in rejected spec | Actual API |
|---|---|
| `db.useQuery(QUERY)` (method on db object) | `useQuery<T>(QUERY, params?)` — **top-level hook** from `@powersync/react` |
| `PowerSyncProvider` component | **Does not exist.** Use `<PowerSyncContext.Provider value={db}>` |
| `transaction.complete()` | **`batch.complete()`** — method on `CrudBatch`, not on a transaction |
| `onConflict: 'id'` option on upsert | PostgREST uses PRIMARY KEY by default. For `user_onboarding_metadata` the PK IS `id` but the table also has `UNIQUE(user_id)` (see `supabase/migrations/0012_user_onboarding_metadata.sql:2,7`); the migration's own comment (line 26) directs the outbox adapter to use `ON CONFLICT (user_id) DO UPDATE` for retry idempotency. AC 3 implements this via the per-table `ON_CONFLICT_OVERRIDES` registry in `connector.ts`. |

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
2. Owns the `PowerSyncContext.Provider` for its subtree (so the per-user db handle is the provider's `value`)
3. Uses `prevUserIdRef` (initialised to `undefined`) to detect userId transitions and avoid spurious effects while auth is still loading
4. Uses `inFlightRef = useRef<Promise<void>>(Promise.resolve())` to SEQUENCE every `connect()` / `disconnectAndClear()` call — a chain, not parallel fire-and-forget. Eliminates the race where a late-resolving connect arrives after a disconnect.
5. Resolves a per-user db (`getPowerSyncDatabase(userId)`) and per-user adapter (`initAdapter(new PowerSyncSyncAdapter(db))`) on each sign-in transition.

Key behaviours:
- Auth still loading: `userId === undefined` → effect returns early; nothing happens.
- Cold start, user previously signed in: MMKV → auth resolves → `userId` goes from `undefined` to the stored userId → effect fires → resolve per-user db → initAdapter → enqueue `connect()` on the in-flight chain.
- Sign out: `userId` → null → effect enqueues `disconnectAndClear()` on the chain (the chain guarantees any in-flight connect resolves first).
- Sign in (different user): `userId` changes to new string → effect resolves a different per-user db → fresh connector → enqueues connect on the chain. Combined with the per-user `dbFilename` (AC 5) and `disconnectAndClear()` on the previous sign-out, no state leaks.
- Token refresh (`TOKEN_REFRESHED` event): userId stays the same → `prevUserIdRef.current === userId` → effect is a no-op → existing connection continues.

### initAdapter placement

`initAdapter(new PowerSyncSyncAdapter(db))` runs inside `PowerSyncConnectionManager`'s userId-transition effect, bound to the per-user db. The recovery modal in `apps/mobile/app/(app)/_layout.tsx` calls `getAdapter()` from a button `onPress` handler (`handleRecoveryEnd` at `(app)/_layout.tsx:61–90`) and from later useEffects — both run after the connection manager has had a chance to initialise the adapter for the current user. There is no first-render race because the recovery modal is itself a descendant of `PowerSyncConnectionManager`.

Module-scope `initAdapter` is NOT used because the adapter now depends on the per-user db which is only knowable once auth resolves.

The `connect()` call (which IS async and requires auth) is separate, in `PowerSyncConnectionManager.useEffect`.

### SupabasePowerSyncConnector — circular dep avoidance

`packages/sync` MUST NOT have a RUNTIME import from `@exposure-buddy/supabase`. Dependency graph:
```
@exposure-buddy/supabase → @exposure-buddy/core
@exposure-buddy/sync     → @exposure-buddy/core
```
The Supabase client is injected via the connector constructor. The connector's TYPE-ONLY import of `SupabaseClient` from `@supabase/supabase-js` (`import type { SupabaseClient } from '@supabase/supabase-js'`) is permitted because TypeScript strips type-only imports at compile, leaving no runtime dependency edge. The package.json must list `@supabase/supabase-js` as a `devDependency` (or `peerDependency`), not a runtime `dependency`, to make this explicit.

### Connector boundary clarification — why type-only import (P-CR-21)

The rejected spec's hand-rolled `SupabaseClientLike` interface drifted from the real `SupabaseClient` shape and re-introduced P9 by typing `expires_at: number` (real type is `number | undefined`) and `update().eq()` as a plain `Promise<{ error }>` (real return is a thenable `PostgrestFilterBuilder`). The type-only import resolves both: zero runtime cost, perfect type fidelity, no maintenance tax.

**Correct implementation for UpdateType import:**
```typescript
// packages/sync/src/connector.ts — import at TOP of file, not dynamically
import { UpdateType } from '@powersync/react-native'
```
`UpdateType` is a string enum (`'PUT'`, `'PATCH'`, `'DELETE'`). Import it at the top — no dynamic import needed.

### Per-user data isolation — defence in depth on shared devices (AC 2 + AC 5 — D-CR-02)

This app's primary market is India, where a single phone is often shared across family members. PowerSync's default single local-SQLite store is a leak vector: when user A signs out and user B signs in on the same device, A's rows are visible to B until the next sync overwrites them — or indefinitely if the device is offline.

The mitigation is layered:

1. **Per-user `dbFilename`** (AC 5 / T3.2) — `getPowerSyncDatabase(userId)` derives the filename from `sha256(userId).slice(0,16)`. User B's `PowerSyncDatabase` instance opens a different SQLite file from user A's. Physical isolation; no application-layer trust required.
2. **`disconnectAndClear()` on sign-out** (AC 2 / T4.1) — clears the local SQLite contents for the signing-out user's db before the next sign-in. Belt to the suspenders.
3. **PowerSync sync-rules** (server-side, see `supabase/sync-rules.yaml`) — scope every bucket by `auth.uid()` so the upstream stream cannot deliver another user's rows.

Note: `user_onboarding_metadata` has no sync-rules bucket today; it is effectively write-only. This is an Epic 9 cleanup item.

### PowerSync observability — surface fire-and-forget failures (AC 2)

AC 2 sequences `connect()` / `disconnectAndClear()` via the `inFlightRef` promise chain and routes errors through `logSyncLifecycleError(err)`. The minimum bar is `console.error('[PowerSync] lifecycle error:', err)`. The recommended (and required-before-production) bar is also emitting a Sentry breadcrumb (or whatever observability hook the project's `initErrorHandler()` infra already provides) so silent fire-and-forget failures are diagnosable in production. Wire this into the existing error pipeline — do not introduce a new logger.

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
- Reorder convention equivalence (D15-resolved): both `'UPDATE' + { type: 'reorder_positions' }` and direct `'reorder_positions'` operation must call `db.writeTransaction` with identical SQL AND identical params (timestamps included — `now` is computed once per `enqueue()` call now)
- INSERT: verify `filterSnakeCase` removes camelCase keys; verify plain `INSERT INTO ...` SQL (no `OR IGNORE`); verify empty-payload throws descriptive error
- UPDATE: verify snake_case payload written as `SET col=?` clauses; verify missing `id` throws; verify empty-SET throws
- DELETE: verify `DELETE FROM table WHERE id=?`
- `filterSnakeCase`: verify the tightened regex (`/^[a-z][a-z0-9_]*$/`) rejects `_proto`, `__proto__`, `1col`, `updatedAt`, and accepts `id`, `user_id`, `predicted_suds`
- `getAdapter()` throws before `initAdapter()` is called
- Unknown operation throws `[sync] unknown operation: <op>`

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
  ], isLoading: false })),
}))
```
- Verify `useFearLadderItems(null)` returns `{ items, isLoading }` (object, not array)
- Verify `items[0]` maps row to `FearLadderItem` (camelCase fields)
- Verify `peakSuds` is `null` (not 0 or undefined) when DB value is null
- Verify `status` is `'pending'` (runtime-validated)
- Verify `isLoading: true` is forwarded when `useQuery` returns `isLoading: true`
- Verify a row with unexpected status (e.g. `'in_progress'`) is filtered out of `items` and a warning is emitted

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

- **Do not use `db.useQuery()` (method on db object).** `useQuery` is a top-level React hook exported from `@powersync/react-native`. Usage: `const { data, isLoading } = useQuery<Row>(QUERY)`.
- **Do not reference `PowerSyncProvider`.** It doesn't exist. Use `<PowerSyncContext.Provider value={db}>`.
- **Do not call `transaction.complete()` in `uploadData`.** Call `batch.complete()` — `batch` is the `CrudBatch` returned by `getCrudBatch()`.
- **Do not call `getPowerSyncDatabase()` without a userId.** The signature is `getPowerSyncDatabase(userId: string)` — it returns a per-user singleton from a `Map`. Calling at module scope without a userId is impossible by design.
- **Do not use `connectedRef` to guard `connect()`.** A ref survives sign-out → sign-in. Use the `prevUserIdRef` pattern (initialised to `undefined`) to detect transitions, and sequence calls through the `inFlightRef` promise chain.
- **Do not call `powerSyncDb.disconnect()` on sign-out — use `disconnectAndClear()`.** Plain disconnect leaves local SQLite rows visible to the next user on a shared device. `disconnectAndClear()` wipes the local store as part of teardown.
- **Do not add `@powersync/*` imports in `apps/mobile`.** Route all PowerSync access through `@exposure-buddy/sync`.
- **Do not RUNTIME-import from `@exposure-buddy/supabase` in `packages/sync/src/connector.ts`.** Inject the Supabase client as a constructor argument. The TYPE-ONLY import `import type { SupabaseClient } from '@supabase/supabase-js'` is permitted (TS strips it at compile).
- **Do not hand-roll a `SupabaseClientLike` interface.** The hand-rolled minimal interface drifts from the real `SupabaseClient` shape and re-introduces P9 (the rejected spec's original defect). Use `import type { SupabaseClient } from '@supabase/supabase-js'`.
- **Do not call `initAdapter()` at module scope.** The adapter now depends on the per-user db handle which is only resolvable once auth has resolved. Call `initAdapter()` inside `PowerSyncConnectionManager`'s userId-transition effect, after `getPowerSyncDatabase(userId)`.
- **Do not call `supabase.from(table).upsert(data)` from the generic connector without consulting `ON_CONFLICT_OVERRIDES`.** Tables listed in the registry (currently `user_onboarding_metadata: 'user_id'`) require `{ onConflict }` to honour secondary UNIQUE constraints. Default (PK-based) upsert is correct for the OTHER tables.
- **Do not use `INSERT OR IGNORE` in the adapter.** Plain `INSERT` is required so the new `uq_user_position` and `uq_active_thread` constraints (ACs 8/9) are enforced offline. `OR IGNORE` silently drops constraint-violating rows and makes upstream data-model bugs invisible.
- **Do not spread `entry.id` BEFORE `...entry.opData` in connector PUT.** Use `{ ...entry.opData, id: entry.id }` so `entry.id` (the canonical row id) cannot be overridden by a stray `id` field inside `opData`.
- **Do not `as FearLadderItemStatus`-cast row.status in `useFearLadderItems`.** Use the runtime `isFearLadderItemStatus` predicate to filter rows; logged-warn on unexpected values. The cast lies if a legacy `'in_progress'` row arrives via sync.
- **Do not delete the `in_progress` branch from `statusLabel()` in `ladder.tsx`.** Defensive belt-and-suspenders for any stale pre-migration row that slips through; harmless if `useFearLadderItems` is already filtering them out.

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
- `apps/mobile/app/ladder.tsx:148–152` — statusLabel function (T8.1 adds comment); also caller of `useFearLadderItems` (T6.1 changes return shape)
- `packages/core/src/selectors/fearLadder.ts` — current selector (T2.1 adds FearLadderItemStatus)
- `packages/core/src/__tests__/selectors/fearLadder.test.ts:25` — uses `'in_progress'` literal; T2.3 updates
- `supabase/migrations/0012_user_onboarding_metadata.sql:2,7,26` — `id PRIMARY KEY` + `UNIQUE(user_id)` + comment directing `ON CONFLICT (user_id) DO UPDATE`
- `supabase/migrations/0013_fear_ladder_items.sql` — source of old status constraint name
- `supabase/migrations/0016_exposure_sessions.sql:6` — `status CHECK IN ('started', 'completed', 'abandoned')` — 0022 pre-cleanup uses `'abandoned'`
- `apps/mobile/app/(app)/_layout.tsx:61–90` — `handleRecoveryEnd` (button onPress) calls `getAdapter().enqueue()`
- `packages/supabase/__tests__/rls/dpo_audit_log.test.ts` — Vitest service-role test pattern to follow (skipIf, service client, cleanup)
- `node_modules/.pnpm/@supabase+auth-js@2.106.1/node_modules/@supabase/auth-js/dist/main/lib/types.d.ts:270` — `expires_at?: number` (optional)
- `node_modules/.pnpm/@powersync+react@1.10.0_*/node_modules/@powersync/react/lib/index.d.ts` — verified hook exports
- `node_modules/.pnpm/@powersync+common@1.53.1/node_modules/@powersync/common/lib/client/sync/bucket/CrudBatch.d.ts` — `batch.complete()` signature
- `node_modules/.pnpm/@powersync+common@1.53.1/node_modules/@powersync/common/lib/client/sync/bucket/CrudEntry.d.ts` — `CrudEntry` shape and `UpdateType` enum

---

## Review Findings

_Multi-layer adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) run 2026-06-16 against the spec doc itself (no code yet). Decision-needed items must be resolved before dev picks up; patch items are spec edits to apply before implementation; deferred items are recorded in `deferred-work.md`._

### Decisions resolved (party-mode roundtable 2026-06-16 — Winston/Amelia/Sally)

- [x] **[Review][Decision] D-CR-01 — INSERT OR IGNORE → plain INSERT.** Resolution: **(c)** plain `INSERT` (raise on conflict, surface to caller). All three agents converged; silent drops mask data-model bugs. → Folded into Patch P-CR-16.
- [x] **[Review][Decision] D-CR-02 — Local SQLite single-store across user switch.** Resolution: **(b) + (c)** — implement BOTH `db.disconnectAndClear()` on sign-out AND per-user `dbFilename`. Defence in depth on shared-device markets (India). → Folded into Patch P-CR-17.
- [x] **[Review][Decision] D-CR-03 — `user_onboarding_metadata` upsert vs migration 0012 directive.** Resolution: **(c)** keep `id` PK but pin onConflict to `user_id` for this one table in the connector. Unanimous. → Folded into Patch P-CR-18.
- [x] **[Review][Decision] D-CR-04 — `useQuery` exposes no `isLoading`.** Resolution: **(a)** AC 7 hook returns `{ items, isLoading }`. Unanimous; non-negotiable for offline-first UX. → Folded into Patch P-CR-19.
- [x] **[Review][Decision] D-CR-05 — Fire-and-forget connect/disconnect race.** Resolution: **(b)** track in-flight promise and sequence inside `PowerSyncConnectionManager`. Unanimous. → Folded into Patch P-CR-20.
- [x] **[Review][Decision] D-CR-06 — `SupabaseClientLike` re-introduces P9.** Resolution: **(a)** use `import type { SupabaseClient } from '@supabase/supabase-js'` (type-only — no runtime dep). Unanimous. → Folded into Patch P-CR-21.

### Patches (21) — all applied 2026-06-16

- [x] **[Review][Patch] P-CR-16 — Replace `INSERT OR IGNORE` with plain `INSERT` in T3.4.** Applied: AC 4 + T3.4 code block + Anti-Patterns + Testing Requirements all updated.
- [x] **[Review][Patch] P-CR-17 — Per-user `dbFilename` + `disconnectAndClear()` on sign-out.** Applied: AC 2, AC 5, T3.2, T4.1 all rewritten; Dev Notes "Per-user data isolation" added.
- [x] **[Review][Patch] P-CR-18 — Per-table onConflict registry, pin `user_onboarding_metadata` to `user_id`.** Applied: AC 3 + T3.3 code block + Anti-Patterns + Verified API Surface table all corrected (the PK claim line 601 was wrong — `id` is the PK, `user_id` carries the UNIQUE).
- [x] **[Review][Patch] P-CR-19 — `useFearLadderItems` returns `{ items, isLoading }`.** Applied: AC 7 + T6.1 + Testing Requirements + File List all updated; `apps/mobile/app/ladder.tsx` added to Modified Files.
- [x] **[Review][Patch] P-CR-20 — Sequence `connect()`/`disconnectAndClear()` via `inFlightRef` promise chain.** Applied: AC 2 + T4.1 code block + Dev Notes "PowerSyncConnectionManager component rationale" all updated.
- [x] **[Review][Patch] P-CR-21 — Replace hand-rolled `SupabaseClientLike` with `import type { SupabaseClient }`.** Applied: AC 3 + T3.3 code block + Anti-Patterns + Dev Notes "Connector boundary clarification" added; `packages/sync/package.json` noted in T3.3.
- [x] **[Review][Patch] `session.expires_at` optional guard.** Applied: T3.3 `fetchCredentials` now checks `typeof session.expires_at !== 'number'` and returns null.
- [x] **[Review][Patch] T2.1 must update `packages/core/src/__tests__/selectors/fearLadder.test.ts`.** Applied: new task T2.3 added; test file added to File List Modified.
- [x] **[Review][Patch] Migration 0021: wrap in `BEGIN; … COMMIT;`.** Applied: T1.1 SQL now opens with `BEGIN;` and closes with `COMMIT;`.
- [x] **[Review][Patch] Connector PUT spread order.** Applied: T3.3 `_uploadEntry` now uses `{ ...entry.opData, id: entry.id }`.
- [x] **[Review][Patch] `filterSnakeCase` tightened regex + empty-payload guards.** Applied: T3.4 uses `SNAKE_KEY_RE = /^[a-z][a-z0-9_]*$/`; INSERT/UPDATE throw on empty payload.
- [x] **[Review][Patch] T7.1 full comment renumbering.** Applied: T7.1 now enumerates `e→d, f→e, g→f, …`.
- [x] **[Review][Patch] T4.1 JSX full wrapper tree.** Applied: T4.1 Before/After now shows `GestureHandlerRootView`, `ReducedMotionProvider`, `ThemeProvider`, `SafeAreaProvider`, `PortalHost` explicitly; Invariants list expanded.
- [x] **[Review][Patch] `PowerSyncConnectionManager` distinguishes `userId === undefined`.** Applied: T4.1 effect early-returns when `userId === undefined`; `prevUserIdRef` initialised to `undefined`.
- [x] **[Review][Patch] AC 9 wording: "pgTAP" → "Vitest".** Applied: AC 9 last bullet now says "Vitest test (Supabase service-role client, not pgTAP)".
- [x] **[Review][Patch] References line `ladder.tsx:148–151` → `148–152`.** Applied.
- [x] **[Review][Patch] Recovery modal call-site description.** Applied: Dev Notes "initAdapter placement" rewritten — modal calls `getAdapter()` from `handleRecoveryEnd` (button onPress) at `(app)/_layout.tsx:61–90`, not first-render useEffect. References list updated.
- [x] **[Review][Patch] T6.1 runtime validation of `row.status`.** Applied: T6.1 now uses `isFearLadderItemStatus` predicate to filter rows and warn on unexpected values; no `as` cast.
- [x] **[Review][Patch] `fetchCredentials` URL validation.** Applied: T3.3 wraps `new URL(endpoint)` in try/catch and warns once on invalid URL.
- [x] **[Review][Patch] AC 2 observability beyond `console.error`.** Applied: AC 2 now mandates `logSyncLifecycleError()` which logs AND emits a Sentry breadcrumb; Dev Notes "PowerSync observability" added.
- [x] **[Review][Patch] AC 4 reorder convention: `now` computed once per enqueue.** Applied: AC 4 + T3.4 `enqueue()` computes `now` once and passes it to `_reorder`; T9.1 test note rewritten to compare full `mock.calls` arrays (SQL + params).

### Deferred (16) — recorded in `deferred-work.md`

- [x] [Review][Defer] Module-scope `getPowerSyncDatabase()` throw produces white-screen with no error boundary — broader app-lifecycle topic, not 6.2-A specific.
- [x] [Review][Defer] AC 5 schema-bump reset risk audit beyond `user_onboarding_metadata` (verify other ps_crud tables are empty at upgrade time).
- [x] [Review][Defer] AC 9 `CREATE UNIQUE INDEX` racing with concurrent INSERT during deploy — use `CREATE UNIQUE INDEX CONCURRENTLY` or app-side write-lock at deploy time.
- [x] [Review][Defer] AC 7 `_userId` param is dead while local SQLite is multi-tenant — sync-rules-based isolation only works when connected.
- [x] [Review][Defer] AC 4 `OR IGNORE` for client-generated UUID PKs has negligible collision probability but no acceptance test of the "duplicate id" path.
- [x] [Review][Defer] Fast Refresh re-running module scope in dev causes `initAdapter` double-init — make `initAdapter` idempotent in a follow-up.
- [x] [Review][Defer] Service-role test cleanup leakage on failed runs — pattern-wide concern, not 6.2-A specific.
- [x] [Review][Defer] `predicted_suds` nullable in PowerSync vs DB `NOT NULL` — verify at impl; add app-level validation if needed.
- [x] [Review][Defer] `createPowerSyncDatabase()` test escape hatch creates test/prod semantic divergence.
- [x] [Review][Defer] Two-PATCH non-atomic reorder retry consistency — Out of Scope item #8 (`swap_ladder_positions` RPC, Story 6.2-C).
- [x] [Review][Defer] AC 8 line-number coordinates (107–115, 149) will drift — use code-region quotes in future stories.
- [x] [Review][Defer] AC 1 "works in all screens" is untestable as written — narrow to enumerated screens in future stories.
- [x] [Review][Defer] AC 6 lint claim narrowness — verify `packages/sync` ESLint config does not also forbid the new re-exports.
- [x] [Review][Defer] AC 3 PATCH retry has no idempotency key — last-write-wins is system-wide; document the semantics.
- [x] [Review][Defer] `AbstractPowerSyncDatabase.writeTransaction` existence assumed — verify at impl against installed type declarations.
- [x] [Review][Defer] Multi-instance connector recreation on user switch may leak prior Supabase client's auth listeners/realtime channels — verify createSupabaseClient is idempotent.

### Dismissed as noise (7)

AC 9 "most recent" undefined (T1.2 actually specifies `started_at DESC NULLS LAST, id DESC`); `@powersync/react` vs `@powersync/react-native` import path (the latter re-exports the former); D1/D2/D3/D4/D5/D9/D14 resolution verified by Auditor; AC 8 keeping `in_progress` branch in `statusLabel` is harmless defensive code (server is migrated; local writes never landed via the no-op adapter); `filterSnakeCase` locale (non-ASCII keys impossible from generated code paths); AC 9 `'abandoned'` value verified present in `exposure_sessions.status` CHECK constraint (0016:6); spec elision of Out-of-Scope/Anti-Pattern sections in the Blind Hunter view was by experimental design.

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
- `packages/core/src/__tests__/selectors/fearLadder.test.ts` — replace `'in_progress'` literal with `'pending'` (T2.3; post-narrowing typecheck fix)
- `packages/sync/src/schema.ts` — `id: column.text` on `user_onboarding_metadata`
- `packages/sync/src/client.ts` — per-user `getPowerSyncDatabase(userId)` keyed by sha256-derived `dbFilename`
- `packages/sync/src/adapter.ts` — real durable implementation with `initAdapter` / `getAdapter`; plain `INSERT` (no OR IGNORE); tightened `filterSnakeCase` regex; descriptive errors on empty/missing-id payloads
- `packages/sync/src/index.ts` — connector, per-user singleton, `initAdapter`, `getAdapter` + hook re-exports
- `packages/sync/package.json` — `@supabase/supabase-js` listed as `devDependency` (type-only consumer)
- `apps/mobile/app/_layout.tsx` — `PowerSyncConnectionManager` (per-user db + sequenced lifecycle); `PowerSyncContext.Provider` placed inside the manager
- `apps/mobile/src/sync/adapter.ts` — re-exports from `@exposure-buddy/sync`
- `apps/mobile/src/hooks/useFearLadderItems.ts` — real `useQuery` hook; returns `{ items, isLoading }`; runtime-validates `status`
- `apps/mobile/app/ladder.tsx` — destructure `{ items, isLoading }` from `useFearLadderItems`; render spinner while loading; legacy comment on `in_progress` branch in `statusLabel`
- `apps/mobile/app/session/intent.tsx` — remove `in_progress` status enqueue (lines 107–115); renumber subsequent step-label comments

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-06-16 | Story drafted as 6.2-A (PowerSync Foundation split); status `ready-for-dev` | Claude Sonnet 4.6 (bmad-create-story) |
| 2026-06-16 | Multi-layer code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) → 6 decisions resolved via party-mode roundtable (Winston/Amelia/Sally) → all 21 patches applied to spec; 16 deferred to `deferred-work.md` | Claude Opus 4.7 (bmad-code-review) |
