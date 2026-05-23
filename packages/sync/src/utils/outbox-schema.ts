import { z } from 'zod'

export const OutboxOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE'])
export type OutboxOperation = z.infer<typeof OutboxOperationSchema>

export const OutboxEntrySchema = z.object({
  id: z.string().uuid(),
  table: z.string().min(1),
  operation: OutboxOperationSchema,
  payload: z.unknown(),
  enqueuedAt: z.string().datetime(),
})

export type OutboxEntry = z.infer<typeof OutboxEntrySchema>
