import type { IConsentRecordService, ConsentRecord } from '@exposure-buddy/core'
import { callEdgeFn } from './call-edge-fn'

export class ConsentRecordService implements IConsentRecordService {
  async recordConsent(payload: ConsentRecord): Promise<void> {
    await callEdgeFn('consent-record', {
      timestampUtc: payload.timestampUtc,
      purposeId: payload.purposeId,
      consentVersion: payload.consentVersion,
      withdrawalStatus: payload.withdrawalStatus,
    })
  }
}
