// Deno-safe type definitions — DO NOT import from monorepo packages.
// These are intentional duplicates of packages/core types for the Deno runtime.

export interface ConsentRecordPayload {
  timestampUtc: string
  purposeId: string
  consentVersion: string
  withdrawalStatus: boolean
}
