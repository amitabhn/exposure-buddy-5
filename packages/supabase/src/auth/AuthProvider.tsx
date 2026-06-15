import React, { createContext, useEffect, useRef, useState } from 'react'
import type { MMKV } from 'react-native-mmkv'
import type { IDpoService, PendingDeletionRecord, SessionRecoveryData } from '@exposure-buddy/core'
import { KV_KEYS } from '@exposure-buddy/core'
import { UserErasureRequestService } from '../functions'
import { createSupabaseClient } from '../client'
import {
  clearAuthState,
  getAuthState,
  getHasAuthedBefore,
  setAuthState,
  signOut as sessionSignOut,
  type AuthState,
} from './session'

// Onboarding state (isOnboardingComplete, onboardingProgressStep, etc.) lives in
// OnboardingProvider — a separate context nested inside AuthProvider. useAuth() merges both.
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
  // True when MMKV initialisation failed (keystore unavailable). Auth state is
  // in-memory only; onboarding flags cannot be read or written. App routes
  // authenticated users directly to home in this state rather than onboarding.
  isStorageDegraded: boolean
  // Session MMKV helpers (Story 5.2+)
  sessionRecoveryData: SessionRecoveryData | null
  setSessionInProgress: (data: SessionRecoveryData) => void
  clearSessionInProgress: () => void
  setSessionIntention: (sessionId: string, text: string) => void
  clearSessionIntention: (sessionId: string) => void
  hasSessionIntention: (sessionId: string) => boolean
  getSessionIntention: (sessionId: string) => string | null
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
  isStorageDegraded: false,
  sessionRecoveryData: null,
  setSessionInProgress: () => {},
  clearSessionInProgress: () => {},
  setSessionIntention: () => {},
  clearSessionIntention: () => {},
  hasSessionIntention: () => false,
  getSessionIntention: () => null,
})

interface AuthProviderProps {
  children: React.ReactNode
  // undefined = initSession still pending; null = init failed (degraded mode, no persistence);
  // MMKV = ready. The tri-state lets the auth gate distinguish "still loading" from
  // "loaded but no persistence" so it can redirect to sign-in instead of hanging.
  mmkv: MMKV | null | undefined
  dpoService?: IDpoService
}

// ─── AuthProvider state invariants ───────────────────────────────────────────
// isLoading:       true until mmkvReadyRef flips AND onAuthStateChange fires once.
//                  Exception: also set false if mmkv===null (degraded mode) or if
//                  stored token setSession() fails (fallback when listener won't fire).
// mmkvReadyRef:    Guards the onAuthStateChange listener from firing before the stored
//                  session is bootstrapped. Set in the mmkv useEffect; never reset.
// hasAuthedBefore: Written true on any SIGNED_IN event; NEVER cleared by sign-out
//                  (by design — persists across sign-out for sign-in screen defaulting).
// pendingDeletion: Written in requestAccountDeletion() Step A (before requestErasure call),
//                  updated to 'completed' in Step B (only if requestErasure succeeded),
//                  and cleared to null after sessionSignOut. Never carries over to a
//                  subsequent user session on the same device.
// authState:       Driven exclusively by onAuthStateChange. Callers must not infer auth
//                  identity from any other source — only from useAuth() → authState.userId.
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children, mmkv, dpoService }: AuthProviderProps): React.ReactElement {
  const [authState, setAuthStateLocal] = useState<AuthState>(DEFAULT_AUTH_STATE)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletionRecord | null>(null)
  const [hasAuthedBefore, setHasAuthedBeforeLocal] = useState(false)
  const [isStorageDegraded, setIsStorageDegraded] = useState(false)
  const [sessionRecoveryData, setSessionRecoveryDataLocal] = useState<SessionRecoveryData | null>(null)
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
        setIsStorageDegraded(true)
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
        // Read onboarding state from MMKV now that userId is known (ARC-004).
        // Guard by userId — token refreshes must not re-read and overwrite in-flight state.
        if (store) {
          // Read in-progress session recovery data (Story 5.2+). Gated on auth per ADR-004.
          // Guard by userId change to avoid re-reading on token refreshes.
          try {
            const raw = store.getString(KV_KEYS.SESSION_IN_PROGRESS(session.user.id))
            setSessionRecoveryDataLocal(raw ? (JSON.parse(raw) as SessionRecoveryData) : null)
          } catch {
            store.delete(KV_KEYS.SESSION_IN_PROGRESS(session.user.id))
            setSessionRecoveryDataLocal(null)
          }
          // Option A (Story 5.6 / Issue #36): defensively wipe any stale SESSION_DEBRIEF_PENDING
          // left over from the State 7/8 era. Safe no-op when the key is absent.
          store.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(session.user.id))
        }
      } else {
        if (store) clearAuthState(store)
        setAuthStateLocal(DEFAULT_AUTH_STATE)
        setSessionRecoveryDataLocal(null)
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
    // Capture once — eliminates redundant guards below and prevents silent-skip if ref races.
    const mmkv = mmkvRef.current
    if (!mmkv) throw new Error('Cannot request erasure: storage not initialised')

    // Step A — Write 'pending' BEFORE the try-catch, before calling requestErasure()
    // (F2: write evidence of submission regardless of network outcome.
    //  Replaces the write DpoServiceStub previously did — now invariant across all IDpoService implementations.)
    // eslint-disable-next-line i18next/no-literal-string
    const pendingRecord: PendingDeletionRecord = { userId: authState.userId!, requestedAt: new Date().toISOString(), status: 'pending' }
    mmkv.set('pending_deletion_request', JSON.stringify(pendingRecord))
    setPendingDeletion(pendingRecord)

    // Model B (DPDPA §13): UserErasureRequestService calls /dpo/request-deletion (user-authenticated)
    // to persist the deletion request server-side. DPO operator processes it via the Story 3.4 panel.
    let erasureSucceeded = false
    try {
      await dpoServiceRef.current.requestErasure(authState.userId)
      erasureSucceeded = true
    } catch (erasureError) {
      // Log and continue — the session is always cleared regardless (sign-out proceeds below).
      console.error('[AuthProvider] requestErasure failed — proceeding with sign-out:', erasureError)
    }

    // Step B — Update to 'completed' AFTER the try-catch, before sessionSignOut.
    // Only written when server confirmed receipt (erasureSucceeded = true).
    // On failure the record stays 'pending' — not falsely marked completed.
    if (erasureSucceeded) {
      try {
        // eslint-disable-next-line i18next/no-literal-string
        const raw = mmkv.getString('pending_deletion_request')
        if (raw) {
          const record = JSON.parse(raw) as PendingDeletionRecord
          mmkv.set('pending_deletion_request', JSON.stringify({ ...record, status: 'completed' }))
          setPendingDeletion({ ...record, status: 'completed' })
        }
      } catch {
        // Ignore parse error — status update is best-effort
      }
    }

    await sessionSignOut(mmkv)

    // Clear the local pending deletion record after sign-out.
    // Server-side deletion_requested_at is the authoritative state.
    // Leaving the key intact would show a ghost record on next app launch with a different user.
    try {
      // eslint-disable-next-line i18next/no-literal-string
      mmkv.delete('pending_deletion_request')
      // Mirror MMKV deletion into React state — AuthProvider is not unmounted on sign-out,
      // so without this the context would still expose a stale 'completed' record.
      setPendingDeletion(null)
    } catch {
      // Best-effort — if MMKV is unavailable, nothing to clear
    }
  }

  function setSessionInProgress(data: SessionRecoveryData): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.SESSION_IN_PROGRESS(userId), JSON.stringify(data))
    setSessionRecoveryDataLocal(data)
  }

  function clearSessionInProgress(): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.delete(KV_KEYS.SESSION_IN_PROGRESS(userId))
    setSessionRecoveryDataLocal(null)
  }

  function setSessionIntention(sessionId: string, text: string): void {
    const store = mmkvRef.current
    if (!store) return
    store.set(KV_KEYS.SESSION_INTENTION(sessionId), text)
  }

  function clearSessionIntention(sessionId: string): void {
    const store = mmkvRef.current
    if (!store) return
    store.delete(KV_KEYS.SESSION_INTENTION(sessionId))
  }

  function hasSessionIntention(sessionId: string): boolean {
    const store = mmkvRef.current
    if (!store) return false
    const text = store.getString(KV_KEYS.SESSION_INTENTION(sessionId))
    return !!(text && text.trim().length > 0)
  }

  function getSessionIntention(sessionId: string): string | null {
    const store = mmkvRef.current
    if (!store) return null
    return store.getString(KV_KEYS.SESSION_INTENTION(sessionId)) ?? null
  }

  return (
    <AuthContext.Provider value={{
      authState,
      isLoading,
      signOut,
      requestAccountDeletion,
      pendingDeletion,
      hasAuthedBefore,
      isStorageDegraded,
      sessionRecoveryData,
      setSessionInProgress,
      clearSessionInProgress,
      setSessionIntention,
      clearSessionIntention,
      hasSessionIntention,
      getSessionIntention,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
