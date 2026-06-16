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
    const idA = p['itemAId']
    const posA = p['itemANewPosition']
    const idB = p['itemBId']
    const posB = p['itemBNewPosition']
    if (typeof idA !== 'string' || typeof posA !== 'number' || typeof idB !== 'string' || typeof posB !== 'number') {
      throw new Error(`[sync] reorder_positions payload missing required fields for table ${table}: itemAId, itemANewPosition, itemBId, itemBNewPosition`)
    }
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
