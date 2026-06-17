# Story 6.2: Home Screen Morning State (State 3)

Status: backlog — REJECTED 2026-06-16 by pre-implementation review; see Review Findings below. Redraft required before dev can pick up.

## Story

As a user who has completed onboarding and has no active exposure thread,
I want a home screen that surfaces today's challenge clearly,
So that I know exactly what to do next without hunting through the app (FR-HOME-01, FR-HOME-03, UX-DR-14).

*Depends on: Story 6.1 merged to main ✅ (technique screen + briefing screen wired; ladder.tsx "Start session" navigates to `/session/technique`).*

---

## Acceptance Criteria

### AC 1 — State 3 renders: today's challenge card

**Given** onboarding is complete (`KV_KEYS.ONBOARDING_COMPLETE` truthy) and `resolveHomeScreenState()` returns `'morning'`
**When** the home screen mounts
**Then** state 3 renders — `CourageLadderEntryCard` is shown with `lowestPendingItem` populated from the real `fear_ladder_items` PowerSync query; the primary CTA reads `t('home.state3.cta')` (canonical English: "Start today's challenge"); tapping the CTA generates a UUID `sessionId` and navigates to `/session/technique?fearItemId=<id>&sessionId=<uuid>&description=<encoded>&predictedSuds=<n>`; the greeting and CalmMe button remain visible below the card

### AC 2 — Pure core selector: lowest pending item + ladder-complete stub

**Given** the today's challenge selector runs in `packages/core`
**When** `resolveLowestPendingItem(items)` is called
**Then** a pure TypeScript selector (zero side-effects, no RN/Expo deps) returns the `FearLadderItemSummary` for the lowest-`position` item with `status = 'pending'`; when two items share the same `position`, the tiebreaker sorts by `id ASC` so ordering is deterministic (4-4-CR-D1); if no pending items remain the selector returns `null` and `resolveHomeScreenState()` returns `'completed'`; in that case the home screen renders a one-sentence ladder-complete stub (state 10 placeholder): `t('home.state10.ladderComplete')` (canonical English: "You've completed every challenge on your ladder."); no CTA appears on the ladder-complete stub

### AC 3 — Migration: partial unique index for active thread enforcement (FR-HOME-03)

**Given** a partial unique index must enforce one active thread per user per fear item
**When** migration `0022_exposure_sessions_active_thread.sql` runs
**Then** `CREATE UNIQUE INDEX uq_active_thread ON public.exposure_sessions (user_id, fear_item_id) WHERE status = 'started'` executes successfully; attempting to insert a second `status = 'started'` row for the same `(user_id, fear_item_id)` raises a unique-constraint violation at the DB layer; no existing rows are affected (the constraint is on future inserts only)

### AC 4 — i18n: all user-facing strings gated

**Given** all user-facing strings must be i18n-gated
**When** the home screen (state 3 or state 10 stub) renders
**Then** every visible string uses `t()` from i18next; no raw string literals appear in the component; CI lint passes (`i18next/no-literal-string` rule)

### AC 5 — PowerSync wired: provider, real queries, durable outbox connector

**Given** `PowerSyncProvider` has not yet been wired into the app root and `useFearLadderItems` still returns `[]`
**When** this story is implemented
**Then**:
- `PowerSyncProvider` is added to `apps/mobile/app/_layout.tsx` wrapping the root navigator (inside `AuthProvider`/`OnboardingProvider`, outside `Stack`)
- `PowerSyncDatabase` singleton is exported from `packages/sync/src/client.ts`; initialized with `AppSchema`; `SupabasePowerSyncConnector` (new file `packages/sync/src/connector.ts`) is passed to `db.connect(connector)` in a `useEffect` in `_layout.tsx` after MMKV is ready
- `apps/mobile/src/sync/adapter.ts` is updated to lazily initialize the real `PowerSyncSyncAdapter(db)` backed by the PowerSync db singleton; `initAdapter(db: AbstractPowerSyncDatabase)` is exported and called from `_layout.tsx` before rendering
- `apps/mobile/src/hooks/useFearLadderItems.ts` stub is replaced with a real `usePowerSync()` + `db.useQuery()` call against the local PowerSync SQLite `fear_ladder_items` table; items are mapped from snake_case columns to camelCase `FearLadderItem`; query is `SELECT id, description, predicted_suds, peak_suds, position, status FROM fear_ladder_items ORDER BY position ASC, id ASC`
- `exposure_sessions` active-thread check in `apps/mobile/app/(app)/index.tsx` uses `usePowerSync()` + `db.useQuery()` (`SELECT id, fear_item_id, created_at FROM exposure_sessions WHERE status = 'started' LIMIT 1`); not a direct Supabase call
- `packages/sync/src/schema.ts` `user_onboarding_metadata` table gains `id: column.text` as the first column (deferred from 4-2-D5)
- The `reorder_positions` enqueue convention inconsistency is reconciled in `SupabasePowerSyncConnector.uploadData()` and in `PowerSyncSyncAdapter.enqueue()`: both calling conventions — `enqueue('fear_ladder_items', 'UPDATE', { type: 'reorder_positions', itemAId, ... })` from `(onboarding)/ladder.tsx` AND `enqueue('fear_ladder_items', 'reorder_positions', { itemAId, ... })` from `ladder.tsx` — translate to the same two-row `db.execute('UPDATE fear_ladder_items SET position = ?, updated_at = ? WHERE id = ?', ...)` calls, producing identical writes in PowerSync's `ps_crud` outbox
- After this story the ladder screen renders real `fear_ladder_items` data for authenticated users

### AC 6 — fear_ladder_items: status constraint, type, tiebreaker, SUDS clamp

**Given** `fear_ladder_items.status` is currently typed as `string` with values `('pending', 'in_progress', 'completed')` (4-4-D3)
**When** this story's migration and code changes land
**Then**:
- Migration `0021_fear_ladder_items_constraints.sql` drops the existing inline status check constraint (`fear_ladder_items_status_check`) and adds a new named check: `ALTER TABLE public.fear_ladder_items ADD CONSTRAINT check_status CHECK (status IN ('pending', 'completed'))`
- Same migration adds `ALTER TABLE public.fear_ladder_items ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED` — constraint is deferrable so bulk reorder swaps within a single transaction can temporarily violate uniqueness without error (4-3-D5)
- Same migration adds a DELETE RLS policy: `CREATE POLICY "fear_ladder_items_delete_own" ON public.fear_ladder_items FOR DELETE USING (auth.uid() = user_id)` (required for remove-item feature in AC 7)
- `packages/core/src/selectors/fearLadder.ts` exports `FearLadderItemStatus = 'pending' | 'completed'`; `FearLadderItem.status` is typed as `FearLadderItemStatus` (not `string`)
- `resolveLowestPendingItem` references the typed value: `.filter(item => item.status === 'pending')`; sort has secondary tiebreaker: `.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))`
- `packages/core/src/index.ts` exports `FearLadderItemStatus`
- `CourageLadderEntryCard` clamps `predictedSuds` to `[0, 10]` before rendering the "Anxiety: X/10" label: `const clampedSuds = Math.min(10, Math.max(0, lowestPendingItem.predictedSuds))` (4-4-CR-D4)

### AC 7 — Remove item destructive action in ladder edit modal

**Given** the user has real `fear_ladder_items` data and needs to correct or remove an entry
**When** the user opens the edit form for a ladder item (`formVisible = true` and `editingItem !== null`)
**Then** a "Remove item" `TouchableOpacity` with `accessibilityRole="button"` and `accessibilityLabel={t('ladder.removeItem')}` is visible below the Save/Cancel buttons; it uses a destructive red text style (`color: '#b91c1c'`); tapping it calls `Alert.alert(t('ladder.delete.title'), t('ladder.delete.confirm'), [...])` with two options: `t('ladder.delete.remove')` (style: 'destructive') and `t('ladder.delete.cancel')` (style: 'cancel'); on "Remove" confirm: the item is removed from local `items` state optimistically (`setItems(prev => prev.filter(i => i.id !== editingItem.id))`); `closeForm()` is called; a `DELETE` operation is enqueued (`getAdapter().enqueue('fear_ladder_items', 'DELETE', { id: editingItem.id })`); if the enqueue `catch` fires, the removed item is re-inserted into local state (rollback) and an error message is shown via `Alert.alert`; on next sync the row is hard-deleted from Supabase (RLS DELETE policy gates `auth.uid() = user_id`); swipe-to-delete is NOT required in this story — in-modal button is the sole delete affordance

### AC 8 — resolveHomeScreenState: full 8-state machine (ADR-HOME-STATE-RESOLVE)

**Given** `resolveHomeScreenState()` is currently a trivial stub returning `'default'` (Story 5.6 placeholder)
**When** this story is implemented
**Then** `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState` is expanded to the full 8-state machine defined in `ADR-HOME-STATE-RESOLVE.md` with the following priority ordering (first-match wins):
1. `'first-use'` if `!ctx.hasAccount`
2. `'completed'` if `ctx.ladderComplete`
3. `'empty-ladder'` if `ctx.hasAccount && !ctx.hasLadder`
4. **State 9 deferred** — `// State 9 (return-after-gap) deferred post-MVP — falls through` (no check on `ctx.gapDays`)
5. **State 5 deferred** — `// State 5 (avoidance detection) deferred post-MVP — falls through` (no avoidance heuristics checked)
6. `'progressing'` if `ctx.activeThread !== null` (active thread exists)
7. `'morning'` if `ctx.hasLadder && !ctx.activeThread`
8. `'empty-ladder'` fallback (unreachable if priority 3 is correct)

`HomeScreenContext` and `HomeScreenState` types are both exported from `packages/core`; the function is tested with minimum 8 cases (see Testing section); the home screen in this story renders full UI only for states `'morning'` (AC 1) and `'completed'` (AC 2 stub); for state `'progressing'` a one-line stub renders `t('home.state4.inProgress')` (canonical: "You have a session in progress.") — Story 6.3 replaces this with the full state 4 UI; for states `'first-use'` and `'empty-ladder'` the existing default home screen behavior renders (routing gate in `(app)/_layout.tsx` handles the pre-auth/pre-onboarding cases)

---

## Tasks / Subtasks

### T1 — DB Migrations (AC 3, AC 6)

- [ ] T1.1: Create `supabase/migrations/0021_fear_ladder_items_constraints.sql`:
  ```sql
  -- Story 6.2: constrain status to MVP values, add position uniqueness, add DELETE policy
  
  -- Drop the auto-generated inline check constraint from 0013
  ALTER TABLE public.fear_ladder_items DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check;
  
  -- Named constraint: MVP permits only 'pending' and 'completed' (in_progress removed; status goes directly pending → completed)
  ALTER TABLE public.fear_ladder_items
    ADD CONSTRAINT check_status CHECK (status IN ('pending', 'completed'));
  
  -- Deferrable unique constraint for bulk reorder swaps within a single transaction (4-3-D5)
  ALTER TABLE public.fear_ladder_items
    ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED;
  
  -- DELETE policy required for remove-item feature (AC 7)
  CREATE POLICY "fear_ladder_items_delete_own"
    ON public.fear_ladder_items FOR DELETE
    USING (auth.uid() = user_id);
  ```

- [ ] T1.2: Create `supabase/migrations/0022_exposure_sessions_active_thread.sql`:
  ```sql
  -- Story 6.2: enforce one active thread per user per fear item (FR-HOME-03)
  CREATE UNIQUE INDEX uq_active_thread
    ON public.exposure_sessions (user_id, fear_item_id)
    WHERE status = 'started';
  ```

### T2 — packages/core: types, selector, state machine (AC 2, AC 6, AC 8)

- [ ] T2.1: Update `packages/core/src/selectors/fearLadder.ts`:
  - Export `FearLadderItemStatus = 'pending' | 'completed'` as a TypeScript union type
  - Update `FearLadderItem.status` from `string` to `FearLadderItemStatus`
  - Add tiebreaker to `resolveLowestPendingItem`: sort by `position ASC` then `id ASC` (replace `a.position - b.position` with `a.position - b.position || a.id.localeCompare(b.id)`)
  - Filter references the typed value: `item.status === 'pending'`
  - **ARC-011**: zero new RN/Expo/Supabase imports

- [ ] T2.2: Expand `packages/core/src/erp/home-screen-state.ts` with full ADR-HOME-STATE-RESOLVE implementation:
  ```typescript
  // ARC-011: zero imports from react-native, expo-*, or @supabase/*
  
  export type HomeScreenState =
    | 'first-use'         // State 1
    | 'empty-ladder'      // State 2
    | 'morning'           // State 3
    | 'progressing'       // State 4
    | 'avoidance'         // State 5 — deferred post-MVP
    | 'mid-exposure'      // State 6 — reserved; resolved by active exposure screen, not home
    | 'return-after-gap'  // State 9 — deferred post-MVP
    | 'completed'         // State 10
  
  export type HomeScreenContext = {
    hasAccount: boolean
    hasLadder: boolean
    activeThread: {
      exists: boolean
      openCount: number
      openDurationHours: number
      userDeclaredIncomplete: boolean
    } | null
    gapDays: number
    ladderComplete: boolean
    nowMs: number  // Date.now() — injected, not read inside function
  }
  
  export function resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState {
    if (!ctx.hasAccount) return 'first-use'
    if (ctx.ladderComplete) return 'completed'
    if (!ctx.hasLadder) return 'empty-ladder'
    // State 9 (return-after-gap) deferred post-MVP — falls through to state 3
    // State 5 (avoidance detection) deferred post-MVP — falls through
    if (ctx.activeThread !== null) return 'progressing'
    if (ctx.hasLadder && !ctx.activeThread) return 'morning'
    return 'empty-ladder'  // unreachable fallback
  }
  ```

- [ ] T2.3: Update `packages/core/src/index.ts`:
  - Export `HomeScreenContext`, `HomeScreenState` from `./erp/home-screen-state`
  - Export `FearLadderItemStatus` from `./selectors/fearLadder`
  - (Current export lines: `resolveHomeScreenState`, `HomeDisplayState` — replace `HomeDisplayState` export with the new types; remove the old `HomeDisplayState` type)

- [ ] T2.4: Update `packages/core/src/erp/home-screen-state.test.ts` — replace single test with the 8 minimum cases from ADR-HOME-STATE-RESOLVE:
  - Case 1: happy path — first-use: no account → `'first-use'`
  - Case 2: happy path — morning: account, ladder, no active thread, gap < 10 → `'morning'`
  - Case 3: happy path — avoidance deferred; active thread returns progressing: `'progressing'`
  - Case 4: happy path — completed outranks gap: `ladderComplete = true`, `gapDays = 15` → `'completed'`
  - Case 5: edge — no ladder: account, no ladder → `'empty-ladder'`
  - Case 6: edge — ladder complete: all pending gone → `'completed'`
  - Case 7: edge — active thread exists → `'progressing'` (state 9 deferred, so `gapDays >= 10` falls through)
  - Case 8: edge — `nowMs` injected: same context, different `nowMs` should not affect result (pure function)

- [ ] T2.5: Update `packages/core/src/__tests__/selectors/fearLadder.test.ts` — add tiebreaker test case:
  - `it('uses id ASC as tiebreaker when two items share the same position', ...)`: two items at `position: 1` with ids `'b'` and `'a'` — result is `'a'`

### T3 — packages/sync: real connector and durable adapter (AC 5)

- [ ] T3.1: Update `packages/sync/src/schema.ts` — add `id: column.text` to `user_onboarding_metadata` table as the first column (4-2-D5):
  ```typescript
  const user_onboarding_metadata = new Table({
    id: column.text,  // client-generated UUID primary key (deferred from 4-2-D5)
    user_id: column.text,
    suds_calibration_value: column.integer,
    completed_at: column.text,
    created_at: column.text,
  })
  ```

- [ ] T3.2: Create `packages/sync/src/connector.ts` — `SupabasePowerSyncConnector` implementing `PowerSyncBackendConnector`:
  - `fetchCredentials()`: calls `createSupabaseClient().auth.getSession()`; returns `{ endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL ?? '', token: session.access_token, expiresAt: new Date(session.expires_at! * 1000) }` or `null` if no session
  - `uploadData(database)`: reads `await database.getCrudBatch(200)`; for each CRUD op in the batch:
    - `PUT` (PowerSync's INSERT/UPSERT): `await createSupabaseClient().from(op.table).upsert({ id: op.id, ...op.opData }, { onConflict: 'id' })`
    - `PATCH` (PowerSync's UPDATE): `await createSupabaseClient().from(op.table).update(op.opData).eq('id', op.id)`
    - `DELETE`: `await createSupabaseClient().from(op.table).delete().eq('id', op.id)`
  - If any Supabase call returns `error`, re-throw to signal PowerSync to retry
  - Call `await transaction.complete()` only after all ops succeed
  - Import `createSupabaseClient` from `@exposure-buddy/supabase` (already used in `packages/sync/src/adapter.ts`... actually wait: `packages/sync` should NOT import from `@exposure-buddy/supabase` to avoid circular deps. Instead, `fetchCredentials` and `uploadData` receive the Supabase client as a constructor dependency injected from `apps/mobile`.)

  **IMPORTANT** — circular dep avoidance: `packages/sync` must NOT import from `@exposure-buddy/supabase` (would create a cycle: supabase→core, sync→supabase). Instead, `SupabasePowerSyncConnector` receives the Supabase client as a constructor argument typed against a minimal interface:
  ```typescript
  interface SupabaseClientLike {
    auth: { getSession(): Promise<{ data: { session: { access_token: string; expires_at: number } | null } }> }
    from(table: string): { upsert(data: unknown, opts?: unknown): Promise<{ error: unknown }>; update(data: unknown): { eq(col: string, val: string): Promise<{ error: unknown }> }; delete(): { eq(col: string, val: string): Promise<{ error: unknown }> } }
  }
  ```
  The real Supabase client satisfies this interface structurally. `apps/mobile/_layout.tsx` passes the real client in.

- [ ] T3.3: Update `packages/sync/src/client.ts` — export a PowerSync db singleton:
  ```typescript
  import { PowerSyncDatabase } from '@powersync/react-native'
  import { AppSchema } from './schema'
  
  let _db: PowerSyncDatabase | null = null
  
  export function getPowerSyncDatabase(dbFilename = 'exposure-buddy.db'): PowerSyncDatabase {
    if (!_db) {
      _db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename } })
    }
    return _db
  }
  
  // Kept for backwards compat / tests that need a fresh instance
  export function createPowerSyncDatabase(dbFilename = 'exposure-buddy.db'): PowerSyncDatabase {
    return new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename } })
  }
  ```

- [ ] T3.4: Update `packages/sync/src/adapter.ts` — replace the module-level no-op singleton with a lazy initialization pattern:
  ```typescript
  import type { AbstractPowerSyncDatabase } from '@powersync/react-native'
  
  // Real adapter backed by PowerSync local SQLite. Call initAdapter(db) before getAdapter().
  export class PowerSyncSyncAdapter implements SyncAdapter {
    constructor(private readonly db: AbstractPowerSyncDatabase) {}
    
    async enqueue(table: string, operation: OutboxOperation, payload: unknown): Promise<void> {
      const p = payload as Record<string, unknown>
      const now = new Date().toISOString()
      
      if (operation === 'INSERT') {
        const cols = Object.keys(p).join(', ')
        const placeholders = Object.keys(p).map(() => '?').join(', ')
        const vals = Object.values(p)
        await this.db.execute(`INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, vals)
      } else if (operation === 'UPDATE') {
        // Reconcile reorder_positions envelope from (onboarding)/ladder.tsx (4-2-D5 deferred convention)
        if (p.type === 'reorder_positions') {
          await this._reorder(table, p.itemAId as string, p.itemANewPosition as number, p.itemBId as string, p.itemBNewPosition as number, now)
        } else {
          const { id, ...fields } = p
          const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ')
          await this.db.execute(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...Object.values(fields), id])
        }
      } else if (operation === 'reorder_positions') {
        // Direct reorder_positions operation from ladder.tsx
        await this._reorder(table, p.itemAId as string, p.itemANewPosition as number, p.itemBId as string, p.itemBNewPosition as number, now)
      } else if (operation === 'DELETE') {
        await this.db.execute(`DELETE FROM ${table} WHERE id = ?`, [p.id])
      }
    }
    
    private async _reorder(table: string, idA: string, posA: number, idB: string, posB: number, now: string) {
      await this.db.writeTransaction(async tx => {
        await tx.execute(`UPDATE ${table} SET position = ?, updated_at = ? WHERE id = ?`, [posA, now, idA])
        await tx.execute(`UPDATE ${table} SET position = ?, updated_at = ? WHERE id = ?`, [posB, now, idB])
      })
    }
    
    async flush(): Promise<void> { /* PowerSync handles flush automatically */ }
    async getPendingCount(): Promise<number> { return 0 }
  }
  
  let _adapter: SyncAdapter | null = null
  
  export function initAdapter(adapter: SyncAdapter): void {
    _adapter = adapter
  }
  
  export function getAdapter(): SyncAdapter {
    if (!_adapter) throw new Error('[sync] SyncAdapter not initialized — call initAdapter() before getAdapter()')
    return _adapter
  }
  ```

- [ ] T3.5: Update `packages/sync/src/index.ts` — export `SupabasePowerSyncConnector` from `./connector`, `getPowerSyncDatabase` from `./client`, `initAdapter` from `./adapter`

### T4 — packages/ui: SUDS clamp (AC 6)

- [ ] T4.1: Update `packages/ui/src/components/CourageLadderEntryCard.tsx` — clamp `predictedSuds` before render:
  ```tsx
  {lowestPendingItem ? (
    <View>
      <Text style={styles.description}>{lowestPendingItem.description}</Text>
      <Text style={styles.suds}>Anxiety: {Math.min(10, Math.max(0, lowestPendingItem.predictedSuds))}/10</Text>
    </View>
  ) : ...}
  ```

### T5 — apps/mobile: PowerSyncProvider wiring (AC 5)

- [ ] T5.1: Update `apps/mobile/app/_layout.tsx`:
  - Import `PowerSyncProvider` from `@powersync/react-native`
  - Import `getPowerSyncDatabase`, `SupabasePowerSyncConnector`, `initAdapter`, `PowerSyncSyncAdapter` from `@exposure-buddy/sync`
  - Import `createSupabaseClient` from `@exposure-buddy/supabase`
  - Create the db singleton at module scope: `const powerSyncDb = getPowerSyncDatabase()`
  - In `RootLayout`, add a `useEffect` (after MMKV is ready, i.e., `mmkv !== undefined`) that:
    1. Creates the connector: `const connector = new SupabasePowerSyncConnector(createSupabaseClient())`
    2. Calls `initAdapter(new PowerSyncSyncAdapter(powerSyncDb))` — must be called before any screen renders that uses `getAdapter()`
    3. Calls `powerSyncDb.connect(connector)` to start background sync (returns void; no await needed)
    - **Guard**: only call `connect()` once; use a `connectedRef = useRef(false)` guard
  - Wrap the `<Stack>` (root navigator) with `<PowerSyncProvider database={powerSyncDb}>...</PowerSyncProvider>`; `PowerSyncProvider` must be INSIDE `AuthProvider` (auth must be ready before sync uses credentials)
  - **Existing invariants that must survive unchanged**: font loading logic, `initErrorHandler()`, `SplashScreen.preventAutoHideAsync()`, `AuthProvider`, `OnboardingProvider`, `SafeAreaProvider`, all `Stack.Screen` registrations

- [ ] T5.2: Update `apps/mobile/src/sync/adapter.ts`:
  - The module-level `const _adapter = new PowerSyncSyncAdapter()` is REMOVED
  - Re-export `getAdapter` and `initAdapter` from `@exposure-buddy/sync` (thin re-export; call sites in screens don't change):
    ```typescript
    export { getAdapter, initAdapter } from '@exposure-buddy/sync'
    ```

- [ ] T5.3: Update `apps/mobile/src/hooks/useFearLadderItems.ts` — replace stub:
  ```typescript
  import { usePowerSync } from '@powersync/react-native'
  import { useMemo } from 'react'
  import type { FearLadderItem } from '@exposure-buddy/core'
  
  const QUERY = `
    SELECT id, description, predicted_suds, peak_suds, position, status
    FROM fear_ladder_items
    ORDER BY position ASC, id ASC
  `
  
  export function useFearLadderItems(_userId: string | null): FearLadderItem[] {
    const db = usePowerSync()
    const { data } = db.useQuery<{
      id: string; description: string; predicted_suds: number;
      peak_suds: number | null; position: number; status: string
    }>(QUERY)
    return useMemo(() =>
      (data ?? []).map(row => ({
        id: row.id,
        description: row.description,
        predictedSuds: row.predicted_suds,
        peakSuds: row.peak_suds,
        position: row.position,
        status: row.status as import('@exposure-buddy/core').FearLadderItemStatus,
      })),
      [data]
    )
  }
  ```
  Note: `_userId` param kept for call-site compat; PowerSync queries are scoped to the authenticated user by sync-rules.

### T6 — apps/mobile: Home screen state 3 + state machine wiring (AC 1, AC 2, AC 4, AC 8)

- [ ] T6.1: Update `apps/mobile/app/(app)/index.tsx`:
  - Add imports: `usePowerSync` from `@powersync/react-native`; `resolveHomeScreenState`, `resolveLowestPendingItem`, `HomeScreenContext` from `@exposure-buddy/core`; `generateUUID` (inline or from a shared util)
  - Remove the comment `// PowerSync no-op stub...` and the `resolveLowestPendingItem([])` call
  - Add active-session query hook:
    ```tsx
    const db = usePowerSync()
    const { data: activeSessions } = db.useQuery<{ id: string }>(
      "SELECT id FROM exposure_sessions WHERE status = 'started' LIMIT 1"
    )
    const hasActiveSession = (activeSessions?.length ?? 0) > 0
    ```
  - Wire `useFearLadderItems` to get real items (import the hook):
    ```tsx
    const items = useFearLadderItems(authState.userId)
    const lowestPendingItem = resolveLowestPendingItem(items)
    ```
  - Build `HomeScreenContext` and resolve state:
    ```tsx
    const ctx: HomeScreenContext = {
      hasAccount: true,  // (app)/_layout.tsx gate ensures this
      hasLadder: items.length > 0,
      activeThread: hasActiveSession ? { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false } : null,
      gapDays: 0,  // State 9 deferred post-MVP — always 0; see ADR-HOME-STATE-RESOLVE
      ladderComplete: items.length > 0 && lowestPendingItem === null,
      nowMs: Date.now(),
    }
    const homeState = resolveHomeScreenState(ctx)
    ```
  - Helper: `generateUUID` for sessionId — inline the same UUID v4 function from `ladder.tsx` (same pattern, not shared package)
  - Render based on `homeState`:
    - `homeState === 'morning'`: existing card layout; change `CourageLadderEntryCard onPress` from `router.push('/ladder')` to the state 3 CTA; add a dedicated primary CTA `TouchableOpacity` below the card with `t('home.state3.cta')` that navigates to `/session/technique?fearItemId=<id>&sessionId=<uuid>&description=<encoded>&predictedSuds=<n>` (generate `sessionId = generateUUID()` inside `onPress` handler, NOT on render); pass `lowestPendingItem` to the card via prop; the card's own `onPress` still navigates to `/ladder` (viewing the full ladder)
    - `homeState === 'completed'`: render `t('home.state10.ladderComplete')` in a `<Text>` element; no CTA; greeting and CalmMe button remain
    - `homeState === 'progressing'`: render `t('home.state4.inProgress')` as a one-line stub; greeting and CalmMe button remain; Story 6.3 replaces this
    - Other states: render existing behavior (greeting + card with null item + CalmMe)
  - **Invariants that must survive unchanged**:
    - `firstHomeVisitSeen` / `markFirstHomeVisitSeen` logic and its `useEffect` on `authState.userId`
    - Accessibility focus `useEffect` on `cardRef` (100ms delay)
    - `CalmMeButton` / `calmMeButton` TouchableOpacity navigating to `/calm-me`
    - `seenOnMount` ref pattern preventing greeting flicker

- [ ] T6.2: Update `apps/mobile/app/(app)/index.test.tsx` — add and update tests:
  - Update existing mocks: `@exposure-buddy/core` mock now includes `resolveHomeScreenState` and `resolveLowestPendingItem`; add `usePowerSync` mock from `@powersync/react-native`
  - Add mock for `useFearLadderItems` hook: `jest.mock('../../../src/hooks/useFearLadderItems', () => ({ useFearLadderItems: jest.fn(() => []) }))`
  - New test cases:
    - (a) `resolveHomeScreenState` returns `'morning'` + `lowestPendingItem` non-null → state 3 renders; `t('home.state3.cta')` is visible
    - (b) state 3 CTA navigates to `/session/technique` URL containing `fearItemId`, `sessionId`, `description`, `predictedSuds`
    - (c) `resolveHomeScreenState` returns `'completed'` → renders `t('home.state10.ladderComplete')`, no CTA button
    - (d) `resolveHomeScreenState` returns `'progressing'` → renders `t('home.state4.inProgress')` stub
  - Existing tests must remain green (7 passing tests in current suite)

### T7 — apps/mobile: Remove item in ladder.tsx (AC 7)

- [ ] T7.1: Update `apps/mobile/app/ladder.tsx`:
  - Import `Alert` from `react-native`
  - Add `handleRemoveItem` async function:
    ```typescript
    async function handleRemoveItem() {
      if (!editingItem) return
      const itemToRemove = editingItem
      closeForm()
      const prev = [...items]
      setItems(items.filter(i => i.id !== itemToRemove.id))  // optimistic
      try {
        // eslint-disable-next-line i18next/no-literal-string
        await getAdapter().enqueue('fear_ladder_items', 'DELETE', { id: itemToRemove.id })
      } catch (err) {
        setItems(prev)  // rollback
        Alert.alert(t('ladder.delete.errorTitle'), t('ladder.delete.errorMessage'))
      }
    }
    ```
  - Inside the edit modal (when `editingItem !== null`), add a "Remove item" button BELOW the Save/Cancel row:
    ```tsx
    {editingItem && (
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => {
          Alert.alert(
            t('ladder.delete.title'),
            t('ladder.delete.confirm'),
            [
              { text: t('ladder.delete.cancel'), style: 'cancel' },
              { text: t('ladder.delete.remove'), style: 'destructive', onPress: handleRemoveItem },
            ]
          )
        }}
        accessibilityRole="button"
        accessibilityLabel={t('ladder.removeItem')}
      >
        <Text style={styles.removeButtonText}>{t('ladder.removeItem')}</Text>
      </TouchableOpacity>
    )}
    ```
  - Add to `StyleSheet`: `removeButton: { marginTop: 16, alignItems: 'center', paddingVertical: 12 }` and `removeButtonText: { fontSize: 15, color: '#b91c1c' }` (destructive red)
  - **`ladder.statusInProgress`** reference in `statusLabel()`: since `status` can no longer be `'in_progress'` at DB level, but the hook's `status` type is `FearLadderItemStatus` now, the `in_progress` branch in `statusLabel()` becomes unreachable — leave it in place to avoid a breaking change (string value 'in_progress' can still appear from stale local data); add a comment: `// Legacy value — status CHECK constraint now only permits 'pending' | 'completed' (Story 6.2)`

### T8 — i18n keys (AC 4)

- [ ] T8.1: Add to `apps/mobile/src/i18n/locales/en.json` under `"home"` object:
  ```json
  "state3": {
    "cta": "Start today's challenge"
  },
  "state4": {
    "inProgress": "You have a session in progress."
  },
  "state10": {
    "ladderComplete": "You've completed every challenge on your ladder."
  }
  ```

- [ ] T8.2: Add to `apps/mobile/src/i18n/locales/en.json` under `"ladder"` object:
  ```json
  "removeItem": "Remove item",
  "delete": {
    "title": "Remove item",
    "confirm": "Remove this item from your ladder?",
    "remove": "Remove",
    "cancel": "Cancel",
    "errorTitle": "Couldn't remove item",
    "errorMessage": "Something went wrong. Please try again."
  }
  ```

- [ ] T8.3: Add identical English-placeholder keys to `apps/mobile/src/i18n/locales/hi.json` (follow existing pattern — Hindi keys are English placeholders at MVP; add under `"home"` and `"ladder"` objects at the same positions)

### T9 — CI verification (all ACs)

- [ ] T9.1: `pnpm turbo typecheck` — zero errors across all packages
- [ ] T9.2: `pnpm turbo lint` — zero errors; no `i18next/no-literal-string` violations in modified screens
- [ ] T9.3: `pnpm turbo test` — all suites green; `packages/core` Vitest suite includes ≥ 8 `resolveHomeScreenState` cases and tiebreaker case for `resolveLowestPendingItem`
- [ ] T9.4: ARC-011 boundary check: `packages/core/src/erp/home-screen-state.ts` has zero RN/Expo/Supabase imports; `packages/core/src/selectors/fearLadder.ts` same
- [ ] T9.5: `packages/sync` boundary check: `SupabasePowerSyncConnector` does NOT import from `@exposure-buddy/supabase`; the Supabase client is passed in as a constructor arg

---

## Dev Notes

### Architecture overview — what changes in this story

```
Before Story 6.2:
  getAdapter().enqueue() → PowerSyncSyncAdapter (in-memory no-op stub, lost on restart)
  useFearLadderItems() → EMPTY[] (stub, no data shown)
  resolveHomeScreenState() → 'default' (trivial stub)
  home screen → greeting + empty CourageLadderEntryCard + CalmMe

After Story 6.2:
  getAdapter().enqueue() → PowerSyncSyncAdapter(db) → db.execute() → PowerSync SQLite → uploadData() → Supabase
  useFearLadderItems() → usePowerSync().useQuery() against local SQLite fear_ladder_items
  resolveHomeScreenState(ctx) → 8-state machine per ADR-HOME-STATE-RESOLVE
  home screen (state 3) → CourageLadderEntryCard + "Start today's challenge" CTA → /session/technique
```

### Current state of files being modified

**`packages/core/src/erp/home-screen-state.ts` [lines 1–11]**: Trivial stub: `export type HomeDisplayState = 'default'` and `export function resolveHomeScreenState(): HomeDisplayState { return 'default' }`. **Delete entirely and replace** with the full HomeScreenContext / HomeScreenState / resolveHomeScreenState implementation (T2.2). The old `HomeDisplayState` type was exported from `packages/core/src/index.ts:24` — update that export (T2.3) to replace `HomeDisplayState` with the new types; no other file imports `HomeDisplayState` at this time.

**`packages/core/src/erp/home-screen-state.test.ts` [lines 1–8]**: Single test checking `resolveHomeScreenState()` returns `'default'`. Replace with 8 test cases (T2.4).

**`packages/core/src/selectors/fearLadder.ts` [lines 1–24]**: `FearLadderItem.status` is `string`; no `FearLadderItemStatus` type; no tiebreaker in sort. Add type and tiebreaker per T2.1.

**`packages/sync/src/schema.ts` [lines 7–13]**: `user_onboarding_metadata` table has no `id` column. Add `id: column.text` as first column per T3.1. No migration is needed for the local SQLite schema — only `schema.ts` needs updating; PowerSync will reset the local SQLite on schema version change (expected behavior).

**`packages/sync/src/client.ts` [lines 1–11]**: Creates fresh `PowerSyncDatabase` on every call. Change to lazy singleton `getPowerSyncDatabase()` per T3.3.

**`packages/sync/src/adapter.ts` [lines 1–37]**: `PowerSyncSyncAdapter` is a no-op stub; module-level singleton. Change to lazy init with `initAdapter()` and real `db.execute()` implementation per T3.4.

**`apps/mobile/app/_layout.tsx` [lines 1–96]**: No PowerSync wiring. Add `PowerSyncProvider`, db singleton, connector init per T5.1. The font loading null-return at line 69 must NOT be inside `PowerSyncProvider` — the provider needs React context; return null before provider renders is safe.

**`apps/mobile/src/sync/adapter.ts` [lines 1–9]**: Thin re-export of the packages/sync adapter. Change to re-export `getAdapter` and `initAdapter` from `@exposure-buddy/sync` per T5.2.

**`apps/mobile/src/hooks/useFearLadderItems.ts` [lines 1–10]**: No-op stub returning `EMPTY`. Replace with real `usePowerSync` + `db.useQuery` per T5.3.

**`apps/mobile/app/(app)/index.tsx` [lines 1–71]**: Current home screen renders greeting, empty `CourageLadderEntryCard`, CalmMe button. The comment on line 37–39 (`// PowerSync no-op stub...`) and the `resolveLowestPendingItem([])` call are replaced. Wire `resolveHomeScreenState` and real queries per T6.1.

**`apps/mobile/app/ladder.tsx` [lines 254–298]**: Edit modal visible when `formVisible && editingItem !== null`. Add Remove button below the Save/Cancel row per T7.1. Do NOT change `handleDragEnd`, `handleSubmit`, or any add-item logic.

### Session flow — state 3 CTA navigation

State 3 CTA generates a `sessionId` UUID and navigates:
```
/session/technique?fearItemId=<lowestPendingItem.id>&sessionId=<uuid>&description=<encoded>&predictedSuds=<n>
```
This is identical to the params that `ladder.tsx:229` generates when tapping "Start session" on a pending item. After T6.1 the user can start a session from EITHER the ladder screen OR the home screen state 3 CTA — both routes land on `technique.tsx` with the same param shape.

**Generate `sessionId` inside the `onPress` handler, not at render time.** A new UUID must be generated on each tap — not once during component render. Pattern:
```tsx
onPress={() => {
  if (!lowestPendingItem) return
  const sessionId = generateUUID()
  router.push(`/session/technique?fearItemId=${lowestPendingItem.id}&sessionId=${sessionId}&description=${encodeURIComponent(lowestPendingItem.description)}&predictedSuds=${lowestPendingItem.predictedSuds}`)
}}
```

### PowerSync connector — dependency injection to avoid circular imports

`packages/sync` must NOT import from `@exposure-buddy/supabase`. The Supabase client is injected into `SupabasePowerSyncConnector` constructor from `apps/mobile/_layout.tsx`:
```typescript
// In apps/mobile/app/_layout.tsx:
import { createSupabaseClient } from '@exposure-buddy/supabase'
import { SupabasePowerSyncConnector, getPowerSyncDatabase, initAdapter, PowerSyncSyncAdapter } from '@exposure-buddy/sync'

const powerSyncDb = getPowerSyncDatabase()  // module scope

// Inside RootLayout, after mmkv is ready:
useEffect(() => {
  if (mmkv === undefined) return  // still initializing
  if (connectedRef.current) return
  connectedRef.current = true
  const connector = new SupabasePowerSyncConnector(createSupabaseClient())
  initAdapter(new PowerSyncSyncAdapter(powerSyncDb))
  powerSyncDb.connect(connector)
}, [mmkv])
```

### PowerSyncDatabase.connect timing

`db.connect(connector)` starts background sync. It does NOT block rendering. `PowerSyncProvider` makes the db available via `usePowerSync()` even before sync starts — queries return `[]` until the first sync populates local SQLite. This matches the existing behavior (empty lists while offline or before first sync). No loading state needed per implementation patterns: "No loading skeleton for cached PowerSync data."

### fear_ladder_items migration 0021 — status constraint

The existing inline constraint in `0013_fear_ladder_items.sql` was created without an explicit name. PostgreSQL auto-names it `fear_ladder_items_status_check`. The migration uses `DROP CONSTRAINT IF EXISTS fear_ladder_items_status_check` to drop it safely (IF EXISTS prevents failure on a fresh DB where the constraint might have a different name in the pg default). If the constraint has a different auto-generated name, the migration will silently skip the drop — test against `supabase db reset`.

### `HomeScreenContext.activeThread` stub values for deferred states

State 5 (avoidance) is deferred. The `openCount`, `openDurationHours`, `userDeclaredIncomplete` fields in `activeThread` are not computed at this story — they are stubbed as `{ exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false }`. The `resolveHomeScreenState` function reads only `ctx.activeThread !== null` (not null = progressing), so the stub values have no effect on state resolution in this story. Story 6.3 or a future avoidance story will wire real values for these fields.

### `HomeScreenContext.gapDays` — always 0 at MVP

State 9 is deferred. `gapDays` computation requires querying `exposure_sessions.completed_at` to find the last completed session. At MVP, `gapDays` is hardcoded to `0` in the home screen context — the state machine skips state 9 regardless. Add a `// State 9 deferred: gapDays hardcoded to 0` comment at the context construction site.

### PowerSyncSyncAdapter.enqueue — sql injection guard

All table names and column names are derived from caller-supplied strings (`table` param, payload keys). The current call sites are fixed constants (`'fear_ladder_items'`, `'exposure_sessions'`, etc.) — not user-supplied values. SQL injection risk is acceptably low for internal use. If the adapter is ever exposed to untrusted callers, add a table allowlist.

### `ladder.tsx` statusLabel with in_progress

After the 0021 migration, DB-level `in_progress` values are forbidden. However, stale local data from pre-migration syncs could have `in_progress` items in the PowerSync local SQLite until a resync. The `statusLabel` function in `ladder.tsx` keeps the `in_progress` branch with a comment — this prevents a display bug if stale data is present. It does not prevent the DB constraint from rejecting new inserts.

### `initAdapter` call timing

`initAdapter()` MUST be called before any screen uses `getAdapter()`. The call is in `_layout.tsx`'s `useEffect` triggered by `mmkv !== undefined`. Since `mmkv` starts as `undefined` and screens don't render until at least `null` (degraded mode) or an MMKV instance is available, `initAdapter` will always fire before any screen's `handleSubmit` or enqueue path runs. The `getAdapter()` error guard (`throw new Error(...)`) catches any edge case during dev.

---

## Testing Requirements

### packages/core (Vitest)

**`packages/core/src/erp/home-screen-state.test.ts`** — 8+ test cases:
```
const base: HomeScreenContext = {
  hasAccount: true, hasLadder: true,
  activeThread: null, gapDays: 0, ladderComplete: false, nowMs: Date.now()
}
```
1. `!ctx.hasAccount` → `'first-use'`
2. `ctx.ladderComplete && !ctx.activeThread` → `'completed'`
3. `ctx.hasAccount && !ctx.hasLadder` → `'empty-ladder'`
4. `ctx.activeThread !== null` (openCount = 0) → `'progressing'`
5. `ctx.hasLadder && !ctx.activeThread && !ctx.ladderComplete` → `'morning'`
6. `gapDays = 15` but NOT ladderComplete → `'morning'` (state 9 deferred, falls through)
7. `ladderComplete = true` AND `gapDays = 15` → `'completed'` (completed outranks gap)
8. `nowMs` injected: change `nowMs` with same context → same result (pure function)

**`packages/core/src/__tests__/selectors/fearLadder.test.ts`** — add tiebreaker case:
```
it('uses id ASC as tiebreaker when position values are equal')
// items: [{id:'b', position:1}, {id:'a', position:1}] → result.id === 'a'
```

### apps/mobile (Jest + RNTL)

**`apps/mobile/app/(app)/index.test.tsx`** — additional cases on top of existing 7:
- Mock `resolveHomeScreenState` to return `'morning'` + non-null `lowestPendingItem` → assert `t('home.state3.cta')` is visible
- Mock `resolveHomeScreenState` to return `'morning'` and CTA is pressed → assert `mockPush` called with a URL containing `/session/technique` and `fearItemId=`, `sessionId=`, `description=`, `predictedSuds=`
- Mock `resolveHomeScreenState` to return `'completed'` → assert `t('home.state10.ladderComplete')` rendered; no CTA button
- Mock `resolveHomeScreenState` to return `'progressing'` → assert `t('home.state4.inProgress')` rendered

**Mock pattern for new hooks:**
```typescript
jest.mock('@powersync/react-native', () => ({
  usePowerSync: () => ({ useQuery: jest.fn(() => ({ data: [] })) }),
  PowerSyncProvider: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('../../../src/hooks/useFearLadderItems', () => ({
  useFearLadderItems: jest.fn(() => []),
}))
```

---

## i18n Keys Summary

**en.json additions:**

Under `"home"`:
```json
"state3": { "cta": "Start today's challenge" },
"state4": { "inProgress": "You have a session in progress." },
"state10": { "ladderComplete": "You've completed every challenge on your ladder." }
```

Under `"ladder"`:
```json
"removeItem": "Remove item",
"delete": {
  "title": "Remove item",
  "confirm": "Remove this item from your ladder?",
  "remove": "Remove",
  "cancel": "Cancel",
  "errorTitle": "Couldn't remove item",
  "errorMessage": "Something went wrong. Please try again."
}
```

**hi.json**: same keys, English placeholder values (established MVP pattern).

---

## Out of Scope — do NOT implement in this story

1. **State 4 full UI** — Story 6.3 owns the progressing state card; this story renders a one-sentence stub only
2. **State 9 re-engagement re-baseline** — deferred post-MVP (Story 6.4 was explicitly deferred); `gapDays` is hardcoded to 0
3. **State 5 avoidance detection** — deferred post-MVP; openCount/openDurationHours are stubbed
4. **MMKV tracking of openCount/openDurationHours** — required for avoidance detection; not this story
5. **PowerSync cloud URL / real sync test** — the connector is wired but `EXPO_PUBLIC_POWERSYNC_URL` env var may not be set in dev; writes enqueue locally and will flush when the URL is configured; no E2E sync test required in this story
6. **`pause.tsx` deletion** — Story 6.1 added a deprecation comment; leave as-is
7. **Peak SUDS writeback to `fear_ladder_items`** — `debrief.tsx` already handles this; no change needed
8. **`ladder.tsx` swipe-to-delete** — only the in-modal button is required (5-1-D6 specified swipe is not required here)
9. **SUDS-based nudge on technique screen** — Story 6.1 deferred this; no change in this story
10. **`exposure_sessions.expires_at` trigger removal** — deferred per deferred-work.md (2026-06-15)

---

## Anti-patterns to Avoid

- **Do not call `generateUUID()` at render time for `sessionId`.** Generate inside `onPress` handler — a new UUID per tap, not once per render cycle.
- **Do not query Supabase directly from the home screen for exposure_sessions.** Use `usePowerSyncQuery` against the local PowerSync SQLite replica.
- **Do not put `createPowerSyncDatabase()` inside a React component.** The db must be a module-level singleton or the `getPowerSyncDatabase()` singleton. Re-creating the db on each render would open multiple SQLite connections.
- **Do not import from `@exposure-buddy/supabase` inside `packages/sync`.** Inject the Supabase client as a constructor argument to break the potential circular dep.
- **Do not call `db.connect(connector)` more than once.** Use `connectedRef` guard. Calling `connect()` twice on the same db instance is undefined behavior in PowerSync.
- **Do not remove `ladder.statusLabel in_progress` branch.** Stale data protection — leave with a comment.
- **Do not change `_userId` param shape of `useFearLadderItems`.** Call sites pass `authState.userId` (nullable); the hook accepts `null` and queries unconditionally (PowerSync's sync-rules scope by user; the local SQLite only contains the current user's rows anyway).
- **Do not add `FearLadderItemStatus` to the ARC-011 boundary check list.** It's a pure TypeScript type with no RN/Expo/Supabase imports — it satisfies ARC-011 by default.
- **Do not wrap `PowerSyncProvider` outside `AuthProvider`.** Auth must be initialized before PowerSync connector calls `fetchCredentials()`.

---

## References

- `_bmad-output/planning-artifacts/epics.md:1298–1342` — Story 6.2 ACs (source of truth)
- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — 8-state machine canonical spec
- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — ADR-001 (core boundary), ADR-003 (MMKV), ADR-004 (startup sequence), ADR-008 (PowerSync API)
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — PowerSync derived-state pattern (Example 3), SyncAdapter boundary rule
- `_bmad-output/implementation-artifacts/6-1-technique-selection-and-pre-exposure-briefing.md` — Story 6.1 file list (technique.tsx, briefing.tsx, session flow)
- `_bmad-output/implementation-artifacts/5-6-remove-home-states-7-and-8.md` — context for why States 7/8 removed; explains the trivial home-screen-state.ts stub
- `apps/mobile/app/(app)/index.tsx` — current home screen (full file)
- `apps/mobile/app/_layout.tsx` — root layout (full file; T5.1 modifies)
- `packages/core/src/erp/home-screen-state.ts` — current stub (full file; T2.2 replaces)
- `packages/core/src/selectors/fearLadder.ts` — current selector (full file; T2.1 modifies)
- `packages/sync/src/client.ts` — current factory (full file; T3.3 changes to singleton)
- `packages/sync/src/adapter.ts` — current no-op stub (full file; T3.4 replaces)
- `packages/sync/src/schema.ts` — current schema (full file; T3.1 adds id column)
- `apps/mobile/src/hooks/useFearLadderItems.ts` — current stub (full file; T5.3 replaces)
- `apps/mobile/app/ladder.tsx` — current ladder screen (full file; T7.1 modifies)
- `apps/mobile/app/(app)/index.test.tsx` — current home test (full file; T6.2 extends)
- `supabase/migrations/0013_fear_ladder_items.sql` — source of old status constraint name
- `supabase/migrations/0016_exposure_sessions.sql` — exposure_sessions table definition

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

**Modified files:**
- `packages/core/src/selectors/fearLadder.ts` — `FearLadderItemStatus` type, tiebreaker sort
- `packages/core/src/erp/home-screen-state.ts` — full 8-state machine replaces trivial stub
- `packages/core/src/erp/home-screen-state.test.ts` — 8+ test cases
- `packages/core/src/__tests__/selectors/fearLadder.test.ts` — tiebreaker test
- `packages/core/src/index.ts` — export `HomeScreenContext`, `HomeScreenState`, `FearLadderItemStatus`
- `packages/sync/src/schema.ts` — `id: column.text` on `user_onboarding_metadata`
- `packages/sync/src/client.ts` — lazy singleton `getPowerSyncDatabase()`
- `packages/sync/src/adapter.ts` — real `PowerSyncSyncAdapter(db)` with lazy init pattern
- `packages/sync/src/index.ts` — export connector, singleton, `initAdapter`
- `packages/ui/src/components/CourageLadderEntryCard.tsx` — SUDS clamp
- `apps/mobile/app/_layout.tsx` — `PowerSyncProvider`, connector init, `initAdapter` call
- `apps/mobile/src/sync/adapter.ts` — re-export from `@exposure-buddy/sync`
- `apps/mobile/src/hooks/useFearLadderItems.ts` — real `usePowerSync` + `db.useQuery` hook
- `apps/mobile/app/(app)/index.tsx` — state machine wiring, state 3 + 10 UI
- `apps/mobile/app/(app)/index.test.tsx` — 4 new test cases
- `apps/mobile/app/ladder.tsx` — remove item destructive action
- `apps/mobile/src/i18n/locales/en.json` — state3/state4/state10 + ladder delete keys
- `apps/mobile/src/i18n/locales/hi.json` — same keys (English placeholders)

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-06-16 | Story drafted; status `ready-for-dev` | Claude Sonnet 4.6 (bmad-create-story) |
| 2026-06-16 | Pre-implementation spec review (bmad-code-review): 15 decision-needed, 26 patches, 15 deferred | Claude Opus 4.7 |
| 2026-06-16 | Spec REJECTED wholesale; status reverted to `backlog`; redraft required before dev | Cooper + Claude Opus 4.7 |
| 2026-06-16 | Party-mode roundtable resolved D12 (scope creep); 3-story split appended as Recommended Redraft Plan | John (PM) + Winston (Architect) + Amelia (Dev) via Claude Opus 4.7 |
| 2026-06-16 | Party-mode resolved remaining decisions D6/D7/D8/D13/D15; PowerSync `ps_crud` durability verified in installed source; resolutions appended to Recommended Redraft Plan | Sally (UX) + Winston + Amelia + John via Claude Opus 4.7 |

---

## Review Findings

_Pre-implementation spec review (bmad-code-review on 2026-06-16). Three parallel review layers: Blind Hunter (no project context), Edge Case Hunter (project read), Acceptance Auditor (epic + ADR cross-check). Findings deduplicated and triaged. Sources: `b`=Blind, `e`=Edge, `a`=Auditor._

### Decision-needed (resolve before implementation)

- [ ] [Review][Decision] **D1 — `@powersync/react-native` hook API surface is wrong** [b+e] Spec uses `db.useQuery<...>(QUERY)` on a `usePowerSync()`-returned db. `@powersync/react-native` exposes `useQuery` as a top-level hook, not a method on the database. `PowerSyncProvider` export name also unverified. T5.3 destructures `{ data }` but T6.1 reads array directly — inconsistent. → Verify installed version's actual API; unify all hook usage.
- [ ] [Review][Decision] **D2 — ARC-005 ESLint rule blocks direct `@powersync/react-native` imports** [e] `apps/mobile/.eslintrc.js` `no-restricted-imports` bans this package; T5.3 + T6.1 imports → lint failure at T9.2. → Pick (a) add lint override, (b) re-export through `@exposure-buddy/sync`, or (c) per-file disable.
- [ ] [Review][Decision] **D3 — `session/intent.tsx` actively writes `status='in_progress'` post-migration** [e+b] Live code at `apps/mobile/app/session/intent.tsx:107-115` enqueues `status: 'in_progress'`. After T1.1's narrowed CHECK constraint lands, every "Start session" tap silently fails Supabase upload. Also: `ladder.tsx:148-152` switch case on `'in_progress'` will not typecheck under narrowed `FearLadderItemStatus`. Not in task list. → Remove `'in_progress'` from the model (update intent.tsx + ladder.tsx + add backfill), OR keep three statuses and only constrain transitions.
- [ ] [Review][Decision] **D4 — Migration 0021 has no backfill for existing `'in_progress'` rows; constraint name is a guess** [e+b+a] Migration drops `fear_ladder_items_status_check` (auto-generated name, may differ across envs) then adds new CHECK that rejects `'in_progress'`. No `UPDATE … SET status='pending' WHERE status='in_progress'`. Will fail on any populated DB. → Define disposition of existing rows AND query `pg_constraint` to find name dynamically.
- [ ] [Review][Decision] **D5 — Migration 0022 fails on pre-existing duplicate `started` rows** [e+b] `CREATE UNIQUE INDEX uq_active_thread` aborts if any `(user_id, fear_item_id, status='started')` duplicates exist. No pre-cleanup. → Cleanup policy (most recent wins, others → `abandoned`, etc.).
- [ ] [Review][Decision] **D6 — Reorder is non-atomic on Supabase; `DEFERRABLE INITIALLY DEFERRED` provides no protection over the wire** [a+e+b] `uploadData` issues per-row UPDATEs to Supabase; each is its own transaction. Deferred constraint only helps within ONE server-side transaction. T3.4's `writeTransaction` is local SQLite only. Epic line 1332 mandates "PowerSync upload handler wraps reorder_positions in a single deferred transaction" — spec doesn't implement this. → Server-side RPC for atomic swap, Edge Function, or defer reorder server-sync to a follow-up story.
- [ ] [Review][Decision] **D7 — AC 7 optimistic delete + rollback is broken end-to-end** [e+b] (a) Local SQLite DELETE runs inside `enqueue` BEFORE the `catch` fires — rollback `setItems(prev)` restores React state but local DB is already gone; next `useQuery` re-render makes the item disappear again. (b) Existing `useEffect([remoteItems])` in `ladder.tsx:50` overwrites React state from `remoteItems`, clobbering optimistic delete or rollback. (c) `Alert.alert` is async; `editingItem` may be null on callback. (d) Stale closure on `items`. → Redesign rollback (enqueue compensating INSERT, or rely on PowerSync upload pipeline only + toast on failure).
- [ ] [Review][Decision] **D8 — State machine has two data-corruption paths** [e+b] (a) Priority 2 (`ladderComplete`) outranks priority 6 (`activeThread`). Race: last item completion finishes while session still `'started'` → home returns `'completed'`, user loses access to in-flight session. (b) AC 7 hard-delete with `exposure_sessions.ON DELETE SET NULL` on `fear_item_id` leaves `status='started'` + `fear_item_id=NULL` → `hasLadder=false, activeThread!==null` → `'progressing'` with no fear_item to resume. → Reorder priorities so `progressing` outranks `completed`; block delete-during-session; or both.
- [ ] [Review][Decision] **D9 — Auth lifecycle integration missing** [e+b] (a) `connectedRef.current=true` survives sign-out → new sign-in skips `db.connect()`, reuses old connector with new user's auth. (b) T5.1 waits only for `mmkv !== undefined`; Anti-patterns line 718 says "Auth must be initialized before PowerSync connector calls `fetchCredentials`" — direct contradiction with T5.1. (c) `mmkv === null` (degraded) shouldn't connect at all. → Bind connector lifecycle to auth state (re-bind on user change; guard with `authState.status === 'authenticated'`).
- [ ] [Review][Decision] **D10 — `hasAccount: true` hardcoded in T6.1; race during auth `isLoading`** [e] `(app)/_layout.tsx` gate is async (useEffect). Home can render before redirect. Hardcoding causes `'morning'` for unauth user → CTA generates sessionId → `/session/technique` → RLS rejection. → Derive `hasAccount` from `authState.status === 'authenticated'`, or block home render until auth settles.
- [ ] [Review][Decision] **D11 — Test case numbering contradicts itself; some tests are tautological** [b+e+a] T2.4 Case 6 says "ladder complete → 'completed'"; Testing Requirements line 634 Case 6 says "gapDays=15 → 'morning'". T2.4 Case 4 ≈ Testing Reqs Case 7 (duplicate assertion). Case 8 (nowMs injection) is a no-op since function ignores nowMs. ADR-required avoidance + gap-boundary tests dropped without replacement. → Settle one numbered list, drop tautological tests, document deferred-state placeholder coverage.
- [ ] [Review][Decision] **D12 — Scope creep: AC 5 (PowerSync infra) + AC 7 (ladder delete) don't trace to story title "Morning State"** [b] AC 5 is app-wide platform wiring (provider, db singleton, connector, adapter rewrite, schema migration). AC 7 is ladder-edit UX. Bundling makes rollback/regression risk unbounded. → Split into separate stories (platform / ladder-edit / home-morning) or accept bundle with explicit rationale.
- [ ] [Review][Decision] **D13 — DPDPA: hard delete with no audit trail on user-generated fear text** [e] AC 7 hard-deletes `fear_ladder_items` (user-entered fear descriptions = personal data). No `dpo_audit_log` entry, no soft-delete tombstone. CLAUDE.md: "DPDPA 2023 compliance is a hard requirement." → Confirm hard delete is permitted under DPDPA review, or switch to soft delete + scheduled purge.
- [ ] [Review][Decision] **D14 — PowerSync schema bump wipes pending outbox writes** [e] Adding `id: column.text` to `user_onboarding_metadata` bumps schema version → PowerSync resets local SQLite, INCLUDING `ps_crud`. Offline-first users with pending onboarding-ladder writes lose them. → Timing strategy (force online before deploy, or alternative schema-migration mechanism).
- [ ] [Review][Decision] **D15 — AC 3 + AC 5 untestable; no test step in T9** [b+a] AC 3 (partial unique index rejects duplicate started rows) and AC 5 (reorder convention equivalence; sync writes flush) have no verification in T9. → Add pgTAP / integration test scope, or explicitly accept the gap.

### Patches (unambiguous fixes)

- [ ] [Review][Patch] **P1 — `transaction.complete()` → `batch.complete()`** [T3.2:212]
- [ ] [Review][Patch] **P2 — `onConflict: 'id'` wrong for `user_onboarding_metadata` (must be `user_id` per migration 0012)** [T3.2:208]
- [ ] [Review][Patch] **P3 — `initAdapter` ordering: recovery modal calls `getAdapter()` before `useEffect` microtask fires; init synchronously at module scope OR lazy-init inside `getAdapter`** [T5.1; apps/mobile/app/(app)/_layout.tsx:67]
- [ ] [Review][Patch] **P4 — `updatedAt` outbound type mismatch: number vs ISO string; `_reorder` drops caller value; outbound writes need normalization + camelCase→snake_case mapping** [T3.4; T3.2]
- [ ] [Review][Patch] **P5 — AC 2 prose contradicts T6.1 logic for empty ladder (text says "no pending items → 'completed'" but `items.length===0` returns `'empty-ladder'`); fix wording** [AC 2; T6.1:395]
- [ ] [Review][Patch] **P6 — SUDS clamp doesn't guard NaN/null/undefined; no integer rounding (`Math.max(0, NaN) = NaN` renders "Anxiety: NaN/10")** [T4.1:310]
- [ ] [Review][Patch] **P7 — `a.id.localeCompare(b.id)` locale-sensitive across Hermes/V8; pass `'en'` or use `<`/`>`** [T2.1:130]
- [ ] [Review][Patch] **P8 — `OutboxOperation` reorder dispatch needs payload-shape guard (validate `itemAId`/`itemBId` are strings; throw on malformed envelope)** [T3.4:262-273]
- [ ] [Review][Patch] **P9 — `SupabaseClientLike` interface missing `error` field on `getSession` and proper return shapes on upsert/update** [T3.2:217-220]
- [ ] [Review][Patch] **P10 — `EXPO_PUBLIC_POWERSYNC_URL` empty string → silent failure; add guard `if (!endpoint) return null`** [T3.2:206]
- [ ] [Review][Patch] **P11 — `db.connect(connector)` is fire-and-forget; errors swallowed; add `.catch(log)`** [T5.1:325]
- [ ] [Review][Patch] **P12 — `expires_at` infinite extension via outbound write (trigger sets `now()+6h` on every UPDATE); filter from outbound updates for `exposure_sessions`**
- [ ] [Review][Patch] **P13 — Test mock infra: existing 7 home tests will hit new `db.useQuery` and crash; add global mock in `jest.setup.ts`; per-query mock variant needed to test `'morning'` state** [T6.2:412-420; Testing Requirements:654]
- [ ] [Review][Patch] **P14 — AC 1 "greeting and CalmMe button remain visible BELOW the card" is a positional assertion; no test verifies layout order. Drop assertion OR add layout-order test** [AC 1:21]
- [ ] [Review][Patch] **P15 — `ladderComplete` derivation `items.length > 0 && lowestPendingItem === null` includes stale `'in_progress'` items as "complete"; use `items.every(i => i.status === 'completed')`** [T6.1:395]
- [ ] [Review][Patch] **P16 — `HomeScreenContext.activeThread.exists` is a dead field (never read by resolver); drop from type OR enforce its semantics** [T2.2; ADR]
- [ ] [Review][Patch] **P17 — Migration 0021 `CREATE POLICY "fear_ladder_items_delete_own"` not idempotent (Postgres doesn't accept `IF NOT EXISTS` for policies); add `DROP POLICY IF EXISTS` first** [T1.1:112]
- [ ] [Review][Patch] **P18 — `peak_suds` nullability mismatch: schema declares non-nullable `column.integer` but hook expects `number | null`** [T5.3:354; packages/sync/src/schema.ts:21]
- [ ] [Review][Patch] **P19 — `ARC-001` (in existing core file headers) vs `ARC-011` (in spec) label drift; normalize to one tag** [T2.2:136; packages/core/src/erp/home-screen-state.ts:1]
- [ ] [Review][Patch] **P20 — SQL injection surface in `db.execute` (table + column names interpolated from caller-supplied strings); add table allowlist** [T3.4:260-274]
- [ ] [Review][Patch] **P21 — `ladder.removeItem` and `ladder.delete.title` are identical English strings — clarify intent in JSON comment or collapse keys; Hindi parity not CI-enforced** [T8.1-T8.3]
- [ ] [Review][Patch] **P22 — `generateUUID` is dangling ("inline or from shared util"); extract to `packages/core/src/util/uuid.ts` so both home + ladder share** [T6.1:373; references ladder.tsx]
- [ ] [Review][Patch] **P23 — T9.4 boundary check only names `home-screen-state.ts` and `fearLadder.ts`; extend to `packages/core/src/index.ts` re-exports (transitive RN/Expo imports risk)** [T9.4:503]
- [ ] [Review][Patch] **P24 — T2.3 removes `HomeDisplayState` but no grep verification step; add to T9** [T2.3:177]
- [ ] [Review][Patch] **P25 — `exposure_sessions` active-thread query lacks `user_id` filter (defense-in-depth — sync-rules scope is correct but multi-account boot wipe + race exposes prior user's session)** [T6.1:379]
- [ ] [Review][Patch] **P26 — Anti-pattern line 718 ("PowerSyncProvider inside AuthProvider") + T5.1 wait-on-mmkv-only are contradictory; harmonize the rule** [T5.1; Anti-patterns]

### Deferred (acknowledged out-of-scope or non-blocking)

- [x] [Review][Defer] **AC 5 sync URL untestable without `EXPO_PUBLIC_POWERSYNC_URL`** — explicitly OoS item 5
- [x] [Review][Defer] **`(onboarding)/ladder.tsx` keeps old reorder convention** — spec accepts long-tail
- [x] [Review][Defer] **`'mid-exposure'` state reserved but never returned** — per ADR
- [x] [Review][Defer] **`getCrudBatch(200)` hardcoded batch size** — non-blocking
- [x] [Review][Defer] **CTA `description` URL param length unbounded** — non-blocking; Android URL limit not hit by reasonable input
- [x] [Review][Defer] **HMR fragility on module-scope db singleton** — dev-only
- [x] [Review][Defer] **Hermes CJS redirect for `@powersync/react-native`** — investigate at impl time; may inherit from existing Supabase pattern
- [x] [Review][Defer] **`process.env.EXPO_PUBLIC_*` inlined at build time** — known Expo behavior; not a runtime configurability requirement at MVP
- [x] [Review][Defer] **`react-native-gesture-handler` swipe-to-delete backdoor possible** — not in story scope
- [x] [Review][Defer] **PowerSync DELETE-vs-UPDATE conflict resolution** — relies on PowerSync defaults
- [x] [Review][Defer] **Pre-auth screens get PowerSyncProvider wastefully** — acceptable retry behavior
- [x] [Review][Defer] **AC 7 error path doesn't log to telemetry** — non-blocking
- [x] [Review][Defer] **`gapDays: 0` hardcoded stub indistinguishable from real 0** — state 9 deferred
- [x] [Review][Defer] **Greeting "ready to start" still renders in `'completed'`/`'progressing'` states** — minor UX, defer to state 4/10 polish
- [x] [Review][Defer] **`peak_suds` constraint regression risk on subsequent migrations** — non-blocking, observability question

### Dismissed (noise / false positive)

- AC 7 destructive button position iOS/Android — Alert.alert handles per-platform conventions
- `closeForm()` mid-animation race — minor UX
- AC 4 i18next-disable scope clarification — AC 4 implicitly scopes to user-facing strings
- `defaultAuthValue` test value minor differences
- Out-of-Scope item 10 cites another doc — meta reference, not a defect
- ADR not summarized inline — pointer in References is canonical
- `_userId` invariant trust — explicit anti-pattern callout covers it
- Reordering convention surfaced in code comments — already covered in spec rationale

---

## Recommended Redraft Plan

_Resolution of D12 (scope creep) via a party-mode roundtable on 2026-06-16 between John (PM), Winston (Architect), Amelia (Dev). All three converged on the structure below. This section is forward-looking guidance for the next `bmad-create-story` run — it does not redraft the story itself._

### Resolution of D12 — split into 3 stories

Original Story 6.2 is too broad: title names "Morning State" but the spec bundles (a) home-screen UI + state machine, (b) app-wide PowerSync platform wiring + status type narrowing, (c) ladder-edit destructive Remove action. Roundtable agreed to split as follows, in this merge order:

**Story 6.2-A — PowerSync Foundation** _(new platform story, ships first)_

- Wire `PowerSyncProvider` into `apps/mobile/app/_layout.tsx` root
- Promote PowerSync db to a real singleton (`packages/sync/src/client.ts`)
- Implement live `SupabasePowerSyncConnector` with auth lifecycle (re-bind on sign-out → sign-in; guard on `authState.status === 'authenticated'`)
- Replace no-op `PowerSyncSyncAdapter` with the durable adapter
- Schema bump: add `id: column.text` to `user_onboarding_metadata` (4-2-D5)
- Resolve ARC-005 ESLint conflict for `@powersync/react-native` imports (re-export from `@exposure-buddy/sync` recommended)
- Re-ground all PowerSync hook usage against the actually-installed `@powersync/react-native` version (verify `useQuery` API surface; the original spec invented `db.useQuery`)
- Status-narrowing migration `0021` co-located here (safe per finding: current `intent.tsx` write goes to no-op stub, never reaches Supabase — no production breakage window)
- **Migration `0022` partial unique index `uq_active_thread` MUST land here** (non-negotiable per John's call — FR-HOME-03 gate must close before real writes flow). Includes pre-cleanup step for any pre-existing duplicate `'started'` rows (D5).
- Status type narrowing: `FearLadderItemStatus = 'pending' | 'completed'` in `packages/core` (provider is the natural owner). Update `apps/mobile/app/session/intent.tsx:107-115` and `apps/mobile/app/ladder.tsx:148-152` atomically.
- `useFearLadderItems` returns real rows; `exposure_sessions` active-thread check uses local SQLite query
- AC: ladder screen renders real items; `getAdapter().enqueue()` flushes through PowerSync's outbox; CI boundary check passes

_Resolves these decision-needed items from the rejected 6.2 spec: D1, D2, D3, D4, D5, D9, D14. Parts of D11 (test infra). P1, P2, P3, P4, P9, P10, P11, P13 patches also belong here._

**Story 6.2-B — Home Screen Morning State (the slimmed original)**

- Depends on 6.2-A merged
- Implement `resolveHomeScreenState` per ADR-HOME-STATE-RESOLVE (AC 8 from original spec)
- Pure core selector `resolveLowestPendingItem` with `id ASC` tiebreaker (AC 2)
- Morning state UI + State 10 ladder-complete stub (AC 1)
- SUDS clamp in `CourageLadderEntryCard` (AC 6 partial)
- i18n keys for `home.state3/4/10`
- AC: home renders state 3 card + CTA; navigation to `/session/technique` matches `ladder.tsx:229` URL contract

_Resolves D8 (state-machine priority ordering — needs decision on `progressing` vs `completed` ordering), D10 (hardcoded `hasAccount` race with auth isLoading), parts of D11 (test renumbering). D15 (AC 3 testability) folded into Story 6.2-A's pgTAP scope decision._

**Story 6.2-C — Ladder Item Delete (AC 7)**

- Entirely inside `apps/mobile/app/ladder.tsx`
- Optimistic delete + rollback redesign (the original AC 7 rollback is broken — see D7)
- DELETE RLS policy migration (`fear_ladder_items_delete_own`) — idempotent (DROP POLICY IF EXISTS)
- DPDPA decision needed (D13) — soft-delete + scheduled purge vs hard delete with audit log entry
- Can be developed in parallel with 6.2-B, merges after 6.2-A
- AC: in-modal "Remove item" destructive action; confirmation alert; sync hard-deletes from Supabase

_Resolves D7 (delete rollback redesign), D13 (DPDPA disposition)._

### Resolutions for the five remaining decision-needed items

_Settled via party-mode rounds on 2026-06-16 (Sally, Winston, Amelia, John). PowerSync durability verified by direct source inspection of installed `@powersync/common@1.53.1`._

- **D6 RESOLVED — Postgres RPC `swap_ladder_positions`.** SECURITY INVOKER, `auth.uid()` ownership check, both UPDATEs in the function's implicit transaction (deferred uniqueness constraint becomes irrelevant — atomic swap). `packages/sync/src/adapter.ts uploadData` detects `operation === 'reorder_positions'` and calls `supabase.rpc('swap_ladder_positions', {...})` instead of two REST UPDATEs. Migration lives in `supabase/migrations/`. **Owner: Story 6.2-C.** pgTAP test asserts: (1) function rejects when `auth.uid()` doesn't own either item, (2) both positions swap atomically, (3) malformed args error cleanly. Rationale: Deno Edge Function rejected (cold-start latency unjustified for 2-row UPDATE); local-only defer rejected (server stale → next sync clobbers).
- **D7 RESOLVED — PowerSync-native pipeline, no optimistic React state.** `handleRemoveItem` calls `db.execute('DELETE FROM fear_ladder_items WHERE id = ?', [id])` synchronously. PowerSync's native SQLite extension registers triggers on synced tables that atomically write a corresponding entry into `ps_crud` in the same SQLite transaction. Both writes commit to disk together; durability across Android app-kill is guaranteed (verified in `@powersync/common@1.53.1` source: `SqliteBucketStorage.ts:114,121,152` — `ps_crud` is queried on startup; entries only `DELETE`d after upload ack). `useQuery` reflects the deletion instantly. No optimistic React-state flag, no Alert on happy path. On rare server rejection (e.g., trigger or RLS failure), PowerSync retries forever — observability is a separate concern. **Owner: Story 6.2-C.** Test: Vitest mock asserts no direct `supabase.from(...).delete()` call from React; boundary test, zero DB.
- **D8 RESOLVED — Priority flip + UI guard, BEFORE DELETE trigger declined.** (a) State machine: when `activeThread !== null`, `progressing` outranks `ladderComplete`. One-line conditional in `resolveHomeScreenState` (`packages/core`). Pure-TS, fully unit-testable. **Owner: Story 6.2-B; update ADR-HOME-STATE-RESOLVE priority table.** (b) UI delete-guard: Remove button disabled when current user has an `exposure_sessions` row with `status='started'`. Copy: "Finish your current session first." Uses the same active-session query already in T6.1. **Owner: Story 6.2-C.** (c) BEFORE DELETE trigger on `fear_ladder_items` **rejected** — Sally's silent-resurrection argument vetoed Winston's defense-in-depth proposal. A trigger that rejects the upload causes PowerSync's `ps_crud` to retry forever, and the next pull re-materializes the "deleted" row to the user's local DB. That failure mode (item resurrects on the user's screen with no error explanation) is strictly worse than the bypass risk it would prevent. Bypass risk noted in `deferred-work.md` for future API-layer review.
- **D13 RESOLVED — Hard delete + `dpo_audit_log` entry.** Sally and John independently converged. DPDPA § 8(7) satisfied by the audit log entry (operation, timestamp, user_id, item_id — no fear text). Soft delete rejected: no schema column + RLS filter + scheduled purge + BEFORE UPDATE guard cost is unjustified pre-MVP; no user research signals deletion regret; "30-day grace" requires a separate legal basis (legitimate interest / consent) that is harder to defend to the DPO than "purpose ended, data gone." **Owner: Story 6.2-C.** Sally's UX add: confirmation copy carries the gravity — _"This fear and all your progress on it will be permanently removed."_ The grace window happens before the tap, in the copy, not after.
- **D15 RESOLVED — Split test scope by layer.** AC 3 (partial unique index rejects duplicate `'started'` rows): pgTAP in `packages/supabase/__tests__/rls/fear_ladder_sessions.test.ts` (follows existing `dpo_audit_log.test.ts` pattern). Existing `supabase:test` CI job already runs the pgTAP layer — marginal cost is low. AC 5 (reorder convention equivalence — both calling shapes produce same write): Vitest in `packages/sync/__tests__/adapter.test.ts`. Pure logic, no DB, cheap. **Owner: Story 6.2-A.** Principle (Winston): "Untestable acceptance criteria in a story spec is a code smell at the planning layer — it means the AC was written for the author, not for CI."

### Summary of where decisions land in the redraft

| Story | New scope from these resolutions |
|---|---|
| **6.2-A Foundation** | D15 test scope (pgTAP + Vitest gates). Plus everything previously assigned. |
| **6.2-B Home Morning** | D8(a) priority flip in resolver + ADR update. |
| **6.2-C Ladder Delete** | D6 RPC, D7 PowerSync-native delete, D8(b) UI guard, D13 hard delete + audit + gravity copy. |

### Key empirical finding from the roundtable

The "production breakage window" Amelia initially worried about (CHECK constraint landing while `intent.tsx` still writes `'in_progress'`) **does not exist today**: `intent.tsx:107-115` enqueues to the no-op stub adapter; writes are lost on restart and never reach Supabase. This unlocks bundling the status migration with the PowerSync foundation story. Sequencing concerns therefore reduce to FR-HOME-03 enforcement (partial unique index must close the gate before real writes flow), which is addressed by including migration 0022 in Story 6.2-A.

### Epic-level implication

Per John: the epic structure that produced this oversized spec is itself the planning debt. Epic 6 ACs paragraphs should be re-cut so future stories don't recreate this bundling pattern. Recommend touching `_bmad-output/planning-artifacts/epics.md` lines 1298–1342 alongside the redraft so the split is reflected upstream.
