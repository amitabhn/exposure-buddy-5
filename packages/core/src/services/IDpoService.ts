export type PendingDeletionRecord = {
  userId: string
  requestedAt: string
  status: 'pending'
}

export interface IDpoService {
  requestErasure(userId: string): Promise<void>
}
