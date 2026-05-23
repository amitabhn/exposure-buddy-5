import React, { createContext, useEffect, useRef, useState } from 'react'
import type { MMKV } from 'react-native-mmkv'
import { createSupabaseClient } from '../client'
import { clearAuthState, getAuthState, setAuthState, type AuthState } from './session'

interface AuthContextValue {
  authState: AuthState
  isLoading: boolean
}

const DEFAULT_AUTH_STATE: AuthState = {
  session: null,
  userId: null,
  email: null,
}

export const AuthContext = createContext<AuthContextValue>({
  authState: DEFAULT_AUTH_STATE,
  isLoading: true,
})

interface AuthProviderProps {
  children: React.ReactNode
  mmkv: MMKV | null
}

export function AuthProvider({ children, mmkv }: AuthProviderProps): React.ReactElement {
  const [authState, setAuthStateLocal] = useState<AuthState>(
    mmkv ? getAuthState(mmkv) : DEFAULT_AUTH_STATE,
  )
  const [isLoading, setIsLoading] = useState(true)
  const mmkvRef = useRef(mmkv)

  useEffect(() => {
    mmkvRef.current = mmkv
  }, [mmkv])

  useEffect(() => {
    const supabase = createSupabaseClient()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const store = mmkvRef.current
      if (!store) return

      if (session) {
        setAuthState(store, session)
        setAuthStateLocal(getAuthState(store))
      } else {
        clearAuthState(store)
        setAuthStateLocal(DEFAULT_AUTH_STATE)
      }
      setIsLoading(false)
    })

    // Hydrate immediately from MMKV so first render has cached state
    if (mmkvRef.current) {
      setAuthStateLocal(getAuthState(mmkvRef.current))
    }
    setIsLoading(false)

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ authState, isLoading }}>{children}</AuthContext.Provider>
}
