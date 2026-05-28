// DPO_EMAIL is the canonical value for all DPO contact references.
// Used for t() interpolation at:
//   settings.deletion.dpoContact → DeleteAccountModal.tsx
//   auth.deletion.accountPendingDeletion → otp-verification.tsx
// Displayed directly (not via t()) in: PrivacyNoticeScreen (T4)
// eslint-disable-next-line i18next/no-literal-string
export const DPO_EMAIL = 'privacy@exposure-buddy.com'

// Update whenever Privacy Notice content changes — DPDPA §7 compliance obligation.
// eslint-disable-next-line i18next/no-literal-string
export const PRIVACY_NOTICE_LAST_UPDATED = '2026-05-28'
