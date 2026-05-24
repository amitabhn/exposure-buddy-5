import type { IConsentRecordService } from '../services/IConsentRecordService'
import type { ConsentRecord } from '../services/ConsentRecord'

export class ConsentRecordServiceStub implements IConsentRecordService {
  async recordConsent(payload: ConsentRecord): Promise<void> {
    if (__DEV__) {
      console.log('[ConsentRecordServiceStub] recordConsent', payload)
    }
  }
}
