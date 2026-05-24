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
}

export function useAuth(): UseAuthResult {
  const { authState, isLoading, signOut, requestAccountDeletion, pendingDeletion } = useContext(AuthContext)
  return {
    authState,
    isLoading,
    isAuthenticated: authState.session !== null,
    signOut,
    requestAccountDeletion,
    pendingDeletion,
  }
}
