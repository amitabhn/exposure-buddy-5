import type { PowerSyncBackendConnector, AbstractPowerSyncDatabase, CrudEntry } from '@powersync/react-native'
import { UpdateType } from '@powersync/react-native'
import type { SupabaseClient } from '@exposure-buddy/supabase'

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

// AC 2's swap_ladder_positions RPC raises exactly these three application-level errors;
// all are terminal/non-retryable. Anything else (network timeout, connection drop,
// unexpected Postgres error) is treated as retryable, preserving today's throw-to-retry
// contract. 'must differ' is included even though isReorderPair's current callers can't
// produce a same-id pair today — if one ever reached the RPC uncaught, the omission
// would retry the same always-failing call forever and block all future sync uploads.
const NON_RETRYABLE_RPC_ERRORS = [
  'one or both items not found',
  'auth.uid() does not own both items',
  'item_a and item_b must differ',
]

function isRetryableError(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? ''
  return !NON_RETRYABLE_RPC_ERRORS.some(known => message.includes(known))
}

// Story 19.7: a write the server will never accept must not stall every write behind it.
// Only an enumerated set of Postgres codes is permanent; everything else (network errors, 5xx,
// 401 / PGRST301 expired token, 408, 429, 40001, 40P01, 57014, PGRST204/205, unknown 4xx and any
// unclassified error) is transient and keeps the throw-to-retry contract. Never drop on an unknown.
const MAX_PERMANENT_ATTEMPTS = 5
const FK_VIOLATION = '23503'
const RLS_DENIED = '42501'

type ErrorClass = 'transient' | 'permanent' | 'fk'

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code : ''
}

function classifyError(error: unknown): ErrorClass {
  const code = errorCode(error)
  if (code === FK_VIOLATION) return 'fk'
  if (code === RLS_DENIED || code.startsWith('22') || code.startsWith('23')) return 'permanent'
  return 'transient'
}

// PostgREST errors have no constraint field; the name only appears inside `message`
// (`... violates unique constraint "uq_user_position"`). Extract it with a strict pattern and
// never forward `message` or `details` themselves: they can echo row values (e.g. 22P02).
const CONSTRAINT_IN_MESSAGE = /constraint "([^"]*)"/
const SAFE_CONSTRAINT_NAME = /^[a-z0-9_]+$/

function constraintName(error: unknown, code: string): string | undefined {
  if (!code.startsWith('23')) return undefined
  const message = (error as { message?: unknown } | null)?.message
  if (typeof message !== 'string') return undefined
  const name = CONSTRAINT_IN_MESSAGE.exec(message)?.[1]
  return name !== undefined && SAFE_CONSTRAINT_NAME.test(name) ? name : undefined
}

// What a dropped write reports: no row values, no message, no details (DPDPA).
export interface DroppedWriteReport {
  table: string
  op: 'PUT' | 'PATCH' | 'DELETE' | 'swap'
  code: string
  constraint?: string
  // A dropped DELETE overrides the user's intent to remove data, so it is reported louder.
  level: 'error' | 'warning'
}

export type DroppedWriteReporter = (report: DroppedWriteReport) => void

// AC 3: `_reorder` (adapter.ts) writes both position UPDATEs in one SQLite
// writeTransaction, giving both ps_crud rows the same transactionId. A "reorder pair"
// is exactly two entries sharing a transactionId, both PATCH, both on
// fear_ladder_items, both with a finite numeric opData.position. Any other shape
// sharing a transactionId (3+ entries, mixed op-types, non-numeric position) falls
// through entirely to the per-entry upload path.
function isReorderPair(group: CrudEntry[]): group is [CrudEntry, CrudEntry] {
  if (group.length !== 2) return false
  return group.every(entry => {
    const position = entry.opData?.['position']
    return (
      entry.op === UpdateType.PATCH &&
      entry.table === 'fear_ladder_items' &&
      typeof position === 'number' &&
      Number.isFinite(position)
    )
  })
}

// One step of the upload: a reorder pair (sent as one swap RPC) or a single entry.
type UploadUnit =
  | { kind: 'swap'; a: CrudEntry; b: CrudEntry }
  | { kind: 'entry'; entry: CrudEntry }

// Story 19.6: batch.crud is the user's chronological order, so uploads must replay it. Only a
// reorder pair is lifted out of the plain order, and it is emitted where its FIRST entry sits (its
// second entry is skipped); every other entry, including members of a non-pair group, stays where
// it is. An insert therefore always reaches Supabase before a swap that mentions it. This does not
// rely on a transaction's rows being adjacent in batch.crud.
function toUploadUnits(crud: CrudEntry[]): UploadUnit[] {
  const byTransaction = new Map<number, CrudEntry[]>()
  for (const entry of crud) {
    if (entry.transactionId == null) continue
    const group = byTransaction.get(entry.transactionId)
    if (group) {
      group.push(entry)
    } else {
      byTransaction.set(entry.transactionId, [entry])
    }
  }

  const units: UploadUnit[] = []
  const pairSecondEntries = new Set<CrudEntry>()
  for (const entry of crud) {
    if (pairSecondEntries.has(entry)) continue
    const group = entry.transactionId == null ? undefined : byTransaction.get(entry.transactionId)
    if (group && isReorderPair(group)) {
      pairSecondEntries.add(group[1])
      units.push({ kind: 'swap', a: group[0], b: group[1] })
    } else {
      units.push({ kind: 'entry', entry })
    }
  }
  return units
}

function unitKey(unit: UploadUnit): string {
  return unit.kind === 'swap'
    ? `${unit.a.clientId}:${unit.b.clientId}`
    : String(unit.entry.clientId)
}

let _urlValidationWarned = false

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  // In memory, so the attempt bound is per app process, not lifetime. Keyed by the entry's
  // clientId (a swap unit uses `a.clientId:b.clientId`).
  private readonly attempts = new Map<string, number>()
  // Dropped keys stay skipped if the batch is replayed after a later transient throw, so a dropped
  // write is never re-attempted or re-reported. Cleared once the batch completes.
  private readonly dropped = new Set<string>()

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly reportDroppedWrite?: DroppedWriteReporter,
    private readonly onWritesDropped?: () => void,
  ) {}

  async fetchCredentials() {
    const endpoint = process.env['EXPO_PUBLIC_POWERSYNC_URL']
    if (!endpoint) return null  // not configured in this env — local/CI use

    // Validate URL — a typo'd EXPO_PUBLIC_POWERSYNC_URL would otherwise surface as a
    // fire-and-forget connect() error. Fail loud here instead.
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

    const units = toUploadUnits(batch.crud)
    for (const unit of units) {
      const key = unitKey(unit)
      if (this.dropped.has(key)) continue

      if (unit.kind === 'swap') {
        const { error } = await this.supabase.rpc('swap_ladder_positions', {
          p_item_a_id: unit.a.id,
          p_item_a_new_position: unit.a.opData!['position'] as number,
          p_item_b_id: unit.b.id,
          p_item_b_new_position: unit.b.opData!['position'] as number,
        })
        // The three NON_RETRYABLE_RPC_ERRORS are known application errors (e.g. one of the paired
        // items was deleted before this batch uploaded) that can never succeed, so they drop at
        // once; bounded retry would only add delay. Any other swap error follows the bounded path.
        if (error && !isRetryableError(error)) {
          this.drop(key, 'fear_ladder_items', 'swap', error)
        } else {
          await this.settle(key, 'fear_ladder_items', 'swap', error)
        }
      } else {
        const { error } = await this._uploadEntry(unit.entry)
        await this.settle(key, unit.entry.table, unit.entry.op, error)
      }
    }

    await batch.complete()
    const hadDrops = this.dropped.size > 0
    for (const unit of units) {
      const key = unitKey(unit)
      this.attempts.delete(key)
      this.dropped.delete(key)
    }
    if (hadDrops) this.onWritesDropped?.()
  }

  // Success clears the counter. A transient error throws (PowerSync retries after its configured
  // wait). A permanent one throws until its 5th attempt, then drops so the batch can complete.
  private async settle(key: string, table: string, op: DroppedWriteReport['op'], error: unknown) {
    if (!error) {
      this.attempts.delete(key)
      return
    }
    const errorClass = classifyError(error)
    if (errorClass === 'transient') throw error
    if (errorClass === 'fk') {
      // The parent was dropped or is absent; ps_crud order replay means it can never succeed later.
      this.drop(key, table, op, error)
      return
    }
    // 42501 with no valid session is the anon-key fallback after a token failure, not a real RLS
    // denial: retry it without counting.
    if (errorCode(error) === RLS_DENIED && !(await this.hasValidSession())) throw error
    const attempt = (this.attempts.get(key) ?? 0) + 1
    if (attempt < MAX_PERMANENT_ATTEMPTS) {
      this.attempts.set(key, attempt)
      throw error
    }
    this.drop(key, table, op, error)
  }

  private drop(key: string, table: string, op: DroppedWriteReport['op'], error: unknown) {
    this.attempts.delete(key)
    this.dropped.add(key)
    const code = errorCode(error)
    const report: DroppedWriteReport = {
      table,
      op,
      code,
      level: op === UpdateType.DELETE ? 'error' : 'warning',
    }
    const constraint = constraintName(error, code)
    if (constraint) report.constraint = constraint
    try {
      this.reportDroppedWrite?.(report)
    } catch {
      // Reporting must never stall the upload queue.
    }
  }

  private async hasValidSession(): Promise<boolean> {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session) return false
    // Unknown expiry is not a valid session (fetchCredentials agrees): stay transient, never drop.
    return typeof session.expires_at === 'number' && session.expires_at * 1000 > Date.now()
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
