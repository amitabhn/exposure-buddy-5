import type { IDpoService } from '../services/IDpoService'
import type { PendingDeletionRecord } from '../services/IDpoService'

type StorageWriter = (key: string, value: string) => void

export class DpoServiceStub implements IDpoService {
  constructor(private write: StorageWriter) {}

  async requestErasure(userId: string): Promise<void> {
    const record: PendingDeletionRecord = {
      userId,
      requestedAt: new Date().toISOString(),
      // eslint-disable-next-line i18next/no-literal-string
      status: 'pending',
    }
    // eslint-disable-next-line i18next/no-literal-string
    this.write('pending_deletion_request', JSON.stringify(record))
    if (__DEV__) {
      console.log('[DpoServiceStub] requestErasure', userId)
    }
  }
}
