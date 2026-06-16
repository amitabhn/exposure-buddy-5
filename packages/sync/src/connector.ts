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
