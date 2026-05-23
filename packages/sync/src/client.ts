import { PowerSyncDatabase } from '@powersync/react-native'
import { AppSchema } from './schema'

// Factory returning a configured PowerSyncDatabase instance.
// Real cloud connector (Supabase backend connector) wired in Epic 6.
export function createPowerSyncDatabase(dbFilename = 'exposure-buddy.db'): PowerSyncDatabase {
  return new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename },
  })
}
