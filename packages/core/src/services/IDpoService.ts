export type PendingDeletionRecord = {
  userId: string
  requestedAt: string
  status: 'pending' | 'completed'
}

export interface IDpoService {
  requestErasure(userId: string): Promise<void>
}
