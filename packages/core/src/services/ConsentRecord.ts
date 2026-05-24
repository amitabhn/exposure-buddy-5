export type ConsentRecord = {
  timestampUtc: string
  purposeId: string
  consentVersion: string
  withdrawalStatus: boolean
}

export const CONSENT_PURPOSE_ACCOUNT_CREATION = 'account-creation-v1'
export const CONSENT_VERSION_CURRENT = '1.0'
