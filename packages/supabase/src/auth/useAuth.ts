import { useContext } from 'react'
import { AuthContext } from './AuthProvider'
import type { AuthState } from './session'

interface UseAuthResult {
  authState: AuthState
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): UseAuthResult {
  const { authState, isLoading } = useContext(AuthContext)
  return {
    authState,
    isLoading,
    isAuthenticated: authState.session !== null,
  }
}
