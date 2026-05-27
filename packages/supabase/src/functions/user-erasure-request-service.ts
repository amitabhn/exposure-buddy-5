// UserErasureRequestService — Production IDpoService implementation (Story 3.4)
// Calls /dpo/request-deletion (user-authenticated) to persist the deletion request server-side.
// userId is intentionally omitted from the request body (F1 — BOLA prevention).
// The Edge Function derives user identity exclusively from the verified Bearer JWT.

import type { IDpoService } from '@exposure-buddy/core'
import { callEdgeFn } from './call-edge-fn'

export class UserErasureRequestService implements IDpoService {
  async requestErasure(_userId: string): Promise<void> {
    // userId intentionally omitted from the request body (F1 — BOLA prevention).
    // The Edge Function derives user identity exclusively from the verified Bearer JWT.
    // Never pass user-supplied userId in the body of a user-authenticated endpoint.
    await callEdgeFn('dpo-request-deletion', {})
  }
}
