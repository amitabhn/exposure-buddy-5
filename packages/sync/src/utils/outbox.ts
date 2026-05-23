import { OutboxEntrySchema, type OutboxEntry, type OutboxOperation } from './outbox-schema'

export function buildOutboxEntry(
  table: string,
  operation: OutboxOperation,
  payload: unknown,
): OutboxEntry {
  const entry = {
    id: crypto.randomUUID(),
    table,
    operation,
    payload,
    enqueuedAt: new Date().toISOString(),
  }
  // Zod validates before any write — rejects malformed entries at the boundary
  return OutboxEntrySchema.parse(entry)
}
