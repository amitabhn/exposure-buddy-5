import { useContext } from 'react'
import { AuthContext } from './AuthProvider'
import type { AuthState } from './session'
import type { PendingDeletionRecord } from '@exposure-buddy/core'

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
  onboardingProgressReadFailed: boolean
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
    onboardingProgressReadFailed,
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
    onboardingProgressReadFailed,
  }
}
