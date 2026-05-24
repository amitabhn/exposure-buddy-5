import React, { createContext, useEffect, useRef, useState } from 'react'
import type { MMKV } from 'react-native-mmkv'
import { DpoServiceStub, type IDpoService, type PendingDeletionRecord } from '@exposure-buddy/core'
import { createSupabaseClient } from '../client'
import { clearAuthState, getAuthState, setAuthState, signOut as sessionSignOut, type AuthState } from './session'

interface AuthContextValue {
  authState: AuthState
  isLoading: boolean
  signOut: () => Promise<void>
  requestAccountDeletion: () => Promise<void>
  pendingDeletion: PendingDeletionRecord | null
}

const DEFAULT_AUTH_STATE: AuthState = {
  session: null,
  userId: null,
  email: null,
}

export const AuthContext = createContext<AuthContextValue>({
  authState: DEFAULT_AUTH_STATE,
  isLoading: true,
  signOut: async () => {},
  requestAccountDeletion: async () => {},
  pendingDeletion: null,
})

interface AuthProviderProps {
  children: React.ReactNode
  mmkv: MMKV | null
  dpoService?: IDpoService
}

export function AuthProvider({ children, mmkv, dpoService }: AuthProviderProps): React.ReactElement {
  const [authState, setAuthStateLocal] = useState<AuthState>(DEFAULT_AUTH_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletionRecord | null>(null)
  const mmkvRef = useRef(mmkv)
  const dpoServiceRef = useRef<IDpoService>(
    dpoService ?? new DpoServiceStub((key, val) => mmkvRef.current!.set(key, val))
  )
  // Flips to true once MMKV is available and the stored session has been bootstrapped
  // into the Supabase in-memory client. The auth listener ignores events until this fires
  // to prevent a flash of signed-out state during the initSession() async window.
  const mmkvReadyRef = useRef(false)

  // Bootstrap Supabase in-memory session from MMKV on first availability (ARC-004).
  // Calling setSession() here re-arms autoRefreshToken for the stored token.
  useEffect(() => {
    mmkvRef.current = mmkv
    if (!mmkv || mmkvReadyRef.current) return
    mmkvReadyRef.current = true

    // Bootstrap pending deletion state
    try {
      // eslint-disable-next-line i18next/no-literal-string
      const raw = mmkv.getString('pending_deletion_request')
      if (raw) setPendingDeletion(JSON.parse(raw) as PendingDeletionRecord)
    } catch {
      // Corrupt entry — ignore
    }

    const stored = getAuthState(mmkv)
    if (stored.session) {
      createSupabaseClient()
        .auth.setSession({
          access_token: stored.session.access_token,
          refresh_token: stored.session.refresh_token,
        })
        .catch(() => {
          // Stored token invalid/expired — onAuthStateChange fires SIGNED_OUT; fallback in
          // case the listener never fires (e.g. network offline with no local session).
          setIsLoading(false)
        })
      // isLoading stays true until onAuthStateChange confirms the session below
    } else {
      setIsLoading(false)
    }
  }, [mmkv])

  // Register auth state listener once. Ignores events until mmkvReadyRef is set
  // so the app does not flash signed-out before initSession() resolves.
  useEffect(() => {
    const supabase = createSupabaseClient()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mmkvReadyRef.current) return

      const store = mmkvRef.current
      if (session) {
        if (store) setAuthState(store, session)
        setAuthStateLocal({ session, userId: session.user.id, email: session.user.email ?? null })
      } else {
        if (store) clearAuthState(store)
        setAuthStateLocal(DEFAULT_AUTH_STATE)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function signOut(): Promise<void> {
    if (!mmkvRef.current) return
    await sessionSignOut(mmkvRef.current)
  }

  async function requestAccountDeletion(): Promise<void> {
    if (!authState.userId) throw new Error('Cannot request erasure: no authenticated user')
    if (!mmkvRef.current) throw new Error('Cannot request erasure: storage not initialised')
    await dpoServiceRef.current.requestErasure(authState.userId)
    try {
      // eslint-disable-next-line i18next/no-literal-string
      const raw = mmkvRef.current.getString('pending_deletion_request')
      if (raw) setPendingDeletion(JSON.parse(raw) as PendingDeletionRecord)
    } catch {
      // Ignore parse error
    }
    await sessionSignOut(mmkvRef.current)
  }

  return (
    <AuthContext.Provider value={{ authState, isLoading, signOut, requestAccountDeletion, pendingDeletion }}>
      {children}
    </AuthContext.Provider>
  )
}
