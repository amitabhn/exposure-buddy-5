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

// True no-op stub — durable outbox and PowerSync relay wired in Epic 6.
// Outbox types (OutboxEntry, buildOutboxEntry) live in ./utils for Epic 6 to import directly.
export class PowerSyncSyncAdapter implements SyncAdapter {
  async enqueue(
    _table: string,
    _operation: OutboxOperation,
    _payload: unknown,
  ): Promise<void> {
    return Promise.resolve()
  }

  async flush(): Promise<void> {
    return Promise.resolve()
  }

  async getPendingCount(): Promise<number> {
    return Promise.resolve(0)
  }
}
