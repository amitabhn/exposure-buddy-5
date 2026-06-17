// @exposure-buddy/sync — PowerSync SyncAdapter scaffold (ARC-005)
export { PowerSyncSyncAdapter, SyncMode, initAdapter, getAdapter } from './adapter'
export type { SyncAdapter } from './adapter'

export { AppSchema } from './schema'
export type { Database } from './schema'

export { createPowerSyncDatabase, getPowerSyncDatabase } from './client'

export { SupabasePowerSyncConnector } from './connector'

export { buildOutboxEntry } from './utils/outbox'
export type { OutboxEntry, OutboxOperation } from './utils/outbox-schema'

export { resolveConflict } from './utils/conflict'

// ARC-005 re-exports: apps/mobile accesses all PowerSync APIs through @exposure-buddy/sync
// so the @powersync/* import ban in apps/mobile/.eslintrc.js is satisfied.
export { useQuery, usePowerSync, PowerSyncContext, UpdateType } from '@powersync/react-native'
export type { PowerSyncBackendConnector, AbstractPowerSyncDatabase } from '@powersync/react-native'
