import { useContext } from 'react'
import { AuthContext } from './AuthProvider'
import { OnboardingContext } from './OnboardingProvider'
import type { AuthState } from './session'
import type { PendingDeletionRecord, SessionRecoveryData, TechniqueType } from '@exposure-buddy/core'

// Merged view of AuthContext + OnboardingContext. All existing callers continue to work
// without change — the split is an internal implementation detail.
interface UseAuthResult {
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  requestAccountDeletion: () => Promise<void>
  pendingDeletion: PendingDeletionRecord | null
  hasAuthedBefore: boolean
  isStorageDegraded: boolean
  userId: string | null
  // Onboarding state — served from OnboardingContext
  isOnboardingComplete: boolean
  markOnboardingComplete: () => void
  onboardingProgressStep: number | null
  setOnboardingProgressStep: (step: number) => void
  onboardingProgressReadFailed: boolean
  setSudsCalibration: (value: number) => void
  setCrisisFlaggedInOnboarding: () => void
  crisisFlaggedInOnboarding: boolean
  firstHomeVisitSeen: boolean
  markFirstHomeVisitSeen: () => void
  // Session state — served from AuthContext
  sessionRecoveryData: SessionRecoveryData | null
  setSessionInProgress: (data: SessionRecoveryData) => void
  clearSessionInProgress: () => void
  setSessionIntention: (sessionId: string, text: string) => void
  clearSessionIntention: (sessionId: string) => void
  hasSessionIntention: (sessionId: string) => boolean
  getSessionIntention: (sessionId: string) => string | null
  setGroundingActive: () => void
  clearGroundingActive: () => void
  // Technique preference helpers (Story 6.1+)
  getLastUsedTechnique: (fearItemId: string) => TechniqueType | null
  setLastUsedTechnique: (fearItemId: string, technique: TechniqueType) => void
  // Session reminder helpers (Story 8.2)
  getReminderTime: () => string | null
  setReminderTime: (time: string) => void
  getReminderNotificationId: () => string | null
  setReminderNotificationId: (id: string) => void
  clearReminderNotificationId: () => void
  getReminderEnabled: () => boolean
  setReminderEnabled: (enabled: boolean) => void
}

export function useAuth(): UseAuthResult {
  const auth = useContext(AuthContext)
  const onboarding = useContext(OnboardingContext)
  return {
    authState: auth.authState,
    isLoading: auth.isLoading,
    isAuthenticated: auth.authState.session !== null,
    signOut: auth.signOut,
    requestAccountDeletion: auth.requestAccountDeletion,
    pendingDeletion: auth.pendingDeletion,
    hasAuthedBefore: auth.hasAuthedBefore,
    isStorageDegraded: auth.isStorageDegraded,
    userId: auth.authState.userId,
    // Onboarding (OnboardingContext)
    isOnboardingComplete: onboarding.isOnboardingComplete,
    markOnboardingComplete: onboarding.markOnboardingComplete,
    onboardingProgressStep: onboarding.onboardingProgressStep,
    setOnboardingProgressStep: onboarding.setOnboardingProgressStep,
    onboardingProgressReadFailed: onboarding.onboardingProgressReadFailed,
    setSudsCalibration: onboarding.setSudsCalibration,
    setCrisisFlaggedInOnboarding: onboarding.setCrisisFlaggedInOnboarding,
    crisisFlaggedInOnboarding: onboarding.crisisFlaggedInOnboarding,
    firstHomeVisitSeen: onboarding.firstHomeVisitSeen,
    markFirstHomeVisitSeen: onboarding.markFirstHomeVisitSeen,
    // ERP session (AuthContext)
    sessionRecoveryData: auth.sessionRecoveryData,
    setSessionInProgress: auth.setSessionInProgress,
    clearSessionInProgress: auth.clearSessionInProgress,
    setSessionIntention: auth.setSessionIntention,
    clearSessionIntention: auth.clearSessionIntention,
    hasSessionIntention: auth.hasSessionIntention,
    getSessionIntention: auth.getSessionIntention,
    setGroundingActive: auth.setGroundingActive,
    clearGroundingActive: auth.clearGroundingActive,
    // Technique preference (AuthContext)
    getLastUsedTechnique: auth.getLastUsedTechnique,
    setLastUsedTechnique: auth.setLastUsedTechnique,
    // Session reminder (AuthContext)
    getReminderTime: auth.getReminderTime,
    setReminderTime: auth.setReminderTime,
    getReminderNotificationId: auth.getReminderNotificationId,
    setReminderNotificationId: auth.setReminderNotificationId,
    clearReminderNotificationId: auth.clearReminderNotificationId,
    getReminderEnabled: auth.getReminderEnabled,
    setReminderEnabled: auth.setReminderEnabled,
  }
}
