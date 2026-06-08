import { useContext } from 'react'
import { AuthContext } from './AuthProvider'
import type { AuthState } from './session'
import type { PendingDeletionRecord, SessionRecoveryData, DebriefPendingData } from '@exposure-buddy/core'

interface UseAuthResult {
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  requestAccountDeletion: () => Promise<void>
  pendingDeletion: PendingDeletionRecord | null
  hasAuthedBefore: boolean
  isOnboardingComplete: boolean
  markOnboardingComplete: () => void
  onboardingProgressStep: number | null
  setOnboardingProgressStep: (step: number) => void
  userId: string | null
  setSudsCalibration: (value: number) => void
  setCrisisFlaggedInOnboarding: () => void
  onboardingProgressReadFailed: boolean
  isStorageDegraded: boolean
  crisisFlaggedInOnboarding: boolean
  firstHomeVisitSeen: boolean
  markFirstHomeVisitSeen: () => void
  sessionRecoveryData: SessionRecoveryData | null
  setSessionInProgress: (data: SessionRecoveryData) => void
  clearSessionInProgress: () => void
  setSessionIntention: (sessionId: string, text: string) => void
  clearSessionIntention: (sessionId: string) => void
  // Debrief pending state (Story 5.3+)
  debriefPendingData: DebriefPendingData | null
  setDebriefPending: (data: DebriefPendingData) => void
  clearDebriefPending: () => void
  updateDebriefReflectionSubmitted: () => void
  hasSessionIntention: (sessionId: string) => boolean
  getSessionIntention: (sessionId: string) => string | null
}

export function useAuth(): UseAuthResult {
  const {
    authState,
    isLoading,
    signOut,
    requestAccountDeletion,
    pendingDeletion,
    hasAuthedBefore,
    isOnboardingComplete,
    markOnboardingComplete,
    onboardingProgressStep,
    setOnboardingProgressStep,
    setSudsCalibration,
    setCrisisFlaggedInOnboarding,
    onboardingProgressReadFailed,
    isStorageDegraded,
    crisisFlaggedInOnboarding,
    firstHomeVisitSeen,
    markFirstHomeVisitSeen,
    sessionRecoveryData,
    setSessionInProgress,
    clearSessionInProgress,
    setSessionIntention,
    clearSessionIntention,
    debriefPendingData,
    setDebriefPending,
    clearDebriefPending,
    updateDebriefReflectionSubmitted,
    hasSessionIntention,
    getSessionIntention,
  } = useContext(AuthContext)
  return {
    authState,
    isLoading,
    isAuthenticated: authState.session !== null,
    signOut,
    requestAccountDeletion,
    pendingDeletion,
    hasAuthedBefore,
    isOnboardingComplete,
    markOnboardingComplete,
    onboardingProgressStep,
    setOnboardingProgressStep,
    userId: authState.userId,
    setSudsCalibration,
    setCrisisFlaggedInOnboarding,
    onboardingProgressReadFailed,
    isStorageDegraded,
    crisisFlaggedInOnboarding,
    firstHomeVisitSeen,
    markFirstHomeVisitSeen,
    sessionRecoveryData,
    setSessionInProgress,
    clearSessionInProgress,
    setSessionIntention,
    clearSessionIntention,
    debriefPendingData,
    setDebriefPending,
    clearDebriefPending,
    updateDebriefReflectionSubmitted,
    hasSessionIntention,
    getSessionIntention,
  }
}
