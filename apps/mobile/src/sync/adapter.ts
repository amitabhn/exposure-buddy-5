import { PowerSyncSyncAdapter, type SyncAdapter } from '@exposure-buddy/sync'

// No-op stub — Epic 6 replaces PowerSyncSyncAdapter with the real durable outbox.
// Consumers call getAdapter() rather than instantiating directly so Epic 6 can
// swap the implementation without touching each call site.
const _adapter: SyncAdapter = new PowerSyncSyncAdapter()

export function getAdapter(): SyncAdapter {
  return _adapter
}
