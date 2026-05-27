import type { IDpoService } from '@exposure-buddy/core'
import { callEdgeFn } from './call-edge-fn'

export class DpoService implements IDpoService {
  async requestErasure(userId: string): Promise<void> {
    await callEdgeFn('dpo-erase-user', { targetUserId: userId })
  }
}
