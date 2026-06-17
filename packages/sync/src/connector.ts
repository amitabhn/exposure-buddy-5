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

function groupReorderPairs(crud: CrudEntry[]): { pairs: [CrudEntry, CrudEntry][]; remaining: CrudEntry[] } {
  const byTransaction = new Map<number, CrudEntry[]>()
  const remaining: CrudEntry[] = []

  for (const entry of crud) {
    if (entry.transactionId == null) {
      remaining.push(entry)
      continue
    }
    const group = byTransaction.get(entry.transactionId)
    if (group) {
      group.push(entry)
    } else {
      byTransaction.set(entry.transactionId, [entry])
    }
  }

  const pairs: [CrudEntry, CrudEntry][] = []
  for (const group of byTransaction.values()) {
    if (isReorderPair(group)) {
      pairs.push(group)
    } else {
      remaining.push(...group)
    }
  }

  return { pairs, remaining }
}

let _urlValidationWarned = false

export class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  constructor(private readonly supabase: SupabaseClient) {}

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

    const { pairs, remaining } = groupReorderPairs(batch.crud)

    for (const [entryA, entryB] of pairs) {
      const { error } = await this.supabase.rpc('swap_ladder_positions', {
        p_item_a_id: entryA.id,
        p_item_a_new_position: entryA.opData!['position'] as number,
        p_item_b_id: entryB.id,
        p_item_b_new_position: entryB.opData!['position'] as number,
      })
      // Non-retryable application errors (e.g. one of the paired items was deleted
      // before this batch uploaded — see AC 2/AC 3's error-type discrimination note)
      // must not propagate as a bare throw, or PowerSync retries the whole batch
      // forever. Only retryable network-level failures should throw.
      if (error && isRetryableError(error)) throw error
      if (error) console.error('[PowerSync] swap_ladder_positions non-retryable error:', error)
    }

    for (const entry of remaining) {
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
