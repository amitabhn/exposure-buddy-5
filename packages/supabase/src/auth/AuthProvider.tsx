import React, { createContext, useEffect, useRef, useState } from 'react'
import type { MMKV } from 'react-native-mmkv'
import type { IDpoService, PendingDeletionRecord } from '@exposure-buddy/core'
import { UserErasureRequestService } from '../functions'
import { createSupabaseClient } from '../client'
import { clearAuthState, getAuthState, getHasAuthedBefore, setAuthState, signOut as sessionSignOut, type AuthState } from './session'

interface AuthContextValue {
  authState: AuthState
  isLoading: boolean
  signOut: () => Promise<void>
  requestAccountDeletion: () => Promise<void>
  pendingDeletion: PendingDeletionRecord | null
  // True once the device has had at least one successful sign-in (persisted via
  // MMKV, survives sign-out, cleared on reinstall). The sign-in screen uses
  // this to pick between "Create account" and "Sign in" as the default tab.
  hasAuthedBefore: boolean
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
  hasAuthedBefore: false,
})

interface AuthProviderProps {
  children: React.ReactNode
  // undefined = initSession still pending; null = init failed (degraded mode, no persistence);
  // MMKV = ready. The tri-state lets the auth gate distinguish "still loading" from
  // "loaded but no persistence" so it can redirect to sign-in instead of hanging.
  mmkv: MMKV | null | undefined
  dpoService?: IDpoService
}

export function AuthProvider({ children, mmkv, dpoService }: AuthProviderProps): React.ReactElement {
  const [authState, setAuthStateLocal] = useState<AuthState>(DEFAULT_AUTH_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletionRecord | null>(null)
  const [hasAuthedBefore, setHasAuthedBeforeLocal] = useState(false)
  const mmkvRef = useRef<MMKV | null>(mmkv ?? null)
  const dpoServiceRef = useRef<IDpoService>(
    dpoService ?? new UserErasureRequestService()
  )
  // Flips to true once MMKV is available and the stored session has been bootstrapped
  // into the Supabase in-memory client. The auth listener ignores events until this fires
  // to prevent a flash of signed-out state during the initSession() async window.
  const mmkvReadyRef = useRef(false)

  // Bootstrap Supabase in-memory session from MMKV on first availability (ARC-004).
  // Calling setSession() here re-arms autoRefreshToken for the stored token.
  useEffect(() => {
    // Pending — keep loading until initSession resolves one way or the other.
    if (mmkv === undefined) return

    mmkvRef.current = mmkv

    // Init failed (null) — proceed in degraded mode without persistence so the auth
    // gate can render sign-in instead of hanging on isLoading=true.
    if (mmkv === null) {
      if (!mmkvReadyRef.current) {
        mmkvReadyRef.current = true
        setIsLoading(false)
      }
      return
    }

    if (mmkvReadyRef.current) return
    mmkvReadyRef.current = true

    // Bootstrap "has authed before" flag (persisted across sign-out)
    setHasAuthedBeforeLocal(getHasAuthedBefore(mmkv))

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
        // setAuthState already wrote the flag to MMKV; mirror it into local state
        // so consumers (via context) see it immediately without another MMKV read.
        setHasAuthedBeforeLocal(true)
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
    // mmkvRef.current may be null in degraded mode (initSession failed) — still
    // sign out: the supabase listener flips local state and the auth gate redirects.
    await sessionSignOut(mmkvRef.current)
  }

  async function requestAccountDeletion(): Promise<void> {
    if (!authState.userId) throw new Error('Cannot request erasure: no authenticated user')
    if (!mmkvRef.current) throw new Error('Cannot request erasure: storage not initialised')

    // Step A — Write 'pending' BEFORE the try-catch, before calling requestErasure()
    // (F2: write evidence of submission regardless of network outcome.
    //  Replaces the write DpoServiceStub previously did — now invariant across all IDpoService implementations.)
    if (mmkvRef.current) {
      // eslint-disable-next-line i18next/no-literal-string
      const pendingRecord: PendingDeletionRecord = { userId: authState.userId!, requestedAt: new Date().toISOString(), status: 'pending' }
      mmkvRef.current.set('pending_deletion_request', JSON.stringify(pendingRecord))
      setPendingDeletion(pendingRecord)
    }

    // Model B (DPDPA §13): UserErasureRequestService calls /dpo/request-deletion (user-authenticated)
    // to persist the deletion request server-side. DPO operator processes it via the Story 3.4 panel.
    try {
      await dpoServiceRef.current.requestErasure(authState.userId)
    } catch (erasureError) {
      // Log and continue — the session is always cleared regardless (sign-out proceeds below).
      console.error('[AuthProvider] requestErasure failed — proceeding with sign-out:', erasureError)
    }

    // Step B — Update to 'completed' AFTER the try-catch, before sessionSignOut
    // (Resolves deferred W1: update MMKV record to 'completed' now that server-side request is submitted.
    //  The if (raw) guard reliably finds the record written in Step A above.)
    if (mmkvRef.current) {
      try {
        // eslint-disable-next-line i18next/no-literal-string
        const raw = mmkvRef.current.getString('pending_deletion_request')
        if (raw) {
          const record = JSON.parse(raw) as PendingDeletionRecord
          mmkvRef.current.set('pending_deletion_request', JSON.stringify({ ...record, status: 'completed' }))
          setPendingDeletion({ ...record, status: 'completed' })
        }
      } catch {
        // Ignore parse error — status update is best-effort
      }
    }

    await sessionSignOut(mmkvRef.current)
  }

  return (
    <AuthContext.Provider value={{ authState, isLoading, signOut, requestAccountDeletion, pendingDeletion, hasAuthedBefore }}>
      {children}
    </AuthContext.Provider>
  )
}
