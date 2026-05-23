import { buildOutboxEntry } from './utils/outbox'
import type { OutboxOperation } from './utils/outbox-schema'

// ARC-005: All durable writes go through this interface.
// Direct PowerSyncDatabase.execute() calls in apps/mobile are blocked by ESLint (ARC-005).
export interface SyncAdapter {
  enqueue(table: string, operation: OutboxOperation, payload: unknown): Promise<void>
  flush(): Promise<void>
  getPendingCount(): Promise<number>
}

export enum SyncMode {
  NORMAL = 'NORMAL',
  // Writes are held while a crisis protocol is active (Epic 7)
  CRISIS_PAUSED = 'CRISIS_PAUSED',
  // Short write window allowed during crisis cooldown (Epic 7)
  CRISIS_WRITE_WINDOW = 'CRISIS_WRITE_WINDOW',
}

// No-op implementation — real sync relay wired in Epic 6
export class PowerSyncSyncAdapter implements SyncAdapter {
  private readonly _pending: ReturnType<typeof buildOutboxEntry>[] = []

  async enqueue(table: string, operation: OutboxOperation, payload: unknown): Promise<void> {
    const entry = buildOutboxEntry(table, operation, payload)
    this._pending.push(entry)
  }

  async flush(): Promise<void> {
    // No-op: real flush implementation deferred to Epic 6
    this._pending.length = 0
  }

  async getPendingCount(): Promise<number> {
    return this._pending.length
  }
}
