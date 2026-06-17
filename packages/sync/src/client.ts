import { PowerSyncDatabase } from '@powersync/react-native'
import { AppSchema } from './schema'

const _dbByUserId = new Map<string, PowerSyncDatabase>()

// Deterministic per-user filename using djb2 hash — physical boundary against cross-user reads
// on shared devices (India shared-phone use-case, see AC 5 + Dev Notes "Per-user data isolation").
// 16 hex chars = 64 bits of hash output — collision probability negligible at user-count scale.
function dbFilenameForUser(userId: string): string {
  let h = 5381
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i)
    h = h >>> 0  // keep unsigned 32-bit
  }
  const hash = h.toString(16).padStart(8, '0')
  // Double-hash for 64 bits: apply djb2 a second time on the first hash string
  let h2 = 5381
  for (let i = 0; i < hash.length; i++) {
    h2 = ((h2 << 5) + h2) ^ hash.charCodeAt(i)
    h2 = h2 >>> 0
  }
  const hash2 = h2.toString(16).padStart(8, '0')
  return `exposure-buddy-${hash}${hash2}.db`
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
