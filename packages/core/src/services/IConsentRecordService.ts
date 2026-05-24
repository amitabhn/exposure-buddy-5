import type { ConsentRecord } from './ConsentRecord'

export interface IConsentRecordService {
  recordConsent(payload: ConsentRecord): Promise<void>
}
