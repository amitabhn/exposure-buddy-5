// @exposure-buddy/core — pure TypeScript domain logic, zero framework dependencies
// ARC-011: No react-native, expo-*, or @supabase/* imports permitted in this package
export type { AuthTokenProvider } from './interfaces/AuthTokenProvider'
export { emitAccountCreated, onAccountCreated } from './events/accountCreated'
export type { IConsentRecordService } from './services/IConsentRecordService'
export type { ConsentRecord } from './services/ConsentRecord'
export { CONSENT_PURPOSE_ACCOUNT_CREATION, CONSENT_VERSION_CURRENT } from './services/ConsentRecord'
export { ConsentRecordServiceStub } from './stubs/ConsentRecordServiceStub'
export type { IDpoService, PendingDeletionRecord } from './services/IDpoService'
export { DpoServiceStub } from './stubs/DpoServiceStub'
export { detectCrisisKeywords } from './crisis/keywordDetector'
export { CRISIS_KEYWORDS } from './crisis/keywords'
