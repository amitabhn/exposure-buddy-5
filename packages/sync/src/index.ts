// @exposure-buddy/sync — PowerSync SyncAdapter scaffold (ARC-005)
export { PowerSyncSyncAdapter, SyncMode } from './adapter'
export type { SyncAdapter } from './adapter'

export { AppSchema } from './schema'
export type { Database } from './schema'

export { createPowerSyncDatabase } from './client'

export { buildOutboxEntry } from './utils/outbox'
export type { OutboxEntry, OutboxOperation } from './utils/outbox-schema'

export { resolveConflict } from './utils/conflict'
