import React, { createContext, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import type { MMKV } from 'react-native-mmkv'
import type { IDpoService, PendingDeletionRecord, SessionRecoveryData, TechniqueType } from '@exposure-buddy/core'
import { KV_KEYS, isSessionRecoveryFresh } from '@exposure-buddy/core'
import { UserErasureRequestService } from '../functions'
import { createSupabaseClient } from '../client'
import {
  clearAuthState,
  getAuthState,
  getHasAuthedBefore,
  isAccessTokenFresh,
  isRejectedRefreshError,
  setAuthState,
  signOut as sessionSignOut,
  type AuthState,
} from './session'

// Onboarding state (isOnboardingComplete, onboardingProgressStep, etc.) lives in
// OnboardingProvider — a separate context nested inside AuthProvider. useAuth() merges both.
interface AuthContextValue {
  authState: AuthState
  isLoading: boolean
  // False while the session in authState was restored from storage but not yet confirmed by
  // a successful refresh (offline, slow or failing refresh — Story 19.8). Such a session is
  // fine for local reads (MMKV, local replica) but must not drive network work needing a
  // valid token: PowerSync stays disconnected until this is true.
  isSessionConfirmed: boolean
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
  // Grounding-active signal (Story 9.2): written on entering session/grounding.tsx,
  // cleared on normal exit (resume or stop). Mirrors setSessionInProgress/
  // clearSessionInProgress — see KV_KEYS.GROUNDING_ACTIVE for the staleness contract.
  setGroundingActive: () => void
  clearGroundingActive: () => void
  // Raw epoch-ms timestamp, or null if never set/stale-cleared. Callers resolve
  // freshness via isGroundingSignalFresh() (packages/core) before using this for
  // cold-start recovery routing — see (app)/index.tsx.
  getGroundingActiveAt: () => number | null
  // Technique preference helpers (Story 6.1+)
  getLastUsedTechnique: (fearItemId: string) => TechniqueType | null
  setLastUsedTechnique: (fearItemId: string, technique: TechniqueType) => void
  // Insta Calm affirmation rotation "no immediate repeat" helpers (Story 18.3)
  getLastAffirmation: () => string | null
  setLastAffirmation: (key: string) => void
  // Session reminder helpers (Story 8.2)
  getReminderTime: () => string | null
  setReminderTime: (time: string) => void
  getReminderNotificationId: () => string | null
  setReminderNotificationId: (id: string) => void
  clearReminderNotificationId: () => void
  getReminderEnabled: () => boolean
  setReminderEnabled: (enabled: boolean) => void
}

const DEFAULT_AUTH_STATE: AuthState = {
  session: null,
  userId: null,
  email: null,
}

export const AuthContext = createContext<AuthContextValue>({
  authState: DEFAULT_AUTH_STATE,
  isLoading: true,
  isSessionConfirmed: true,
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
  setGroundingActive: () => {},
  clearGroundingActive: () => {},
  getGroundingActiveAt: () => null,
  getLastUsedTechnique: () => null,
  setLastUsedTechnique: () => {},
  getLastAffirmation: () => null,
  setLastAffirmation: () => {},
  getReminderTime: () => null,
  setReminderTime: () => {},
  getReminderNotificationId: () => null,
  setReminderNotificationId: () => {},
  clearReminderNotificationId: () => {},
  getReminderEnabled: () => false,
  setReminderEnabled: () => {},
})

// Upper bound on holding the splash while the stored session is restored (Story 19.8).
const AUTH_RESTORE_BOUND_MS = 5000
// How often an unconfirmed stored session retries its refresh while the app is foregrounded.
const AUTH_RETRY_INTERVAL_MS = 30000

interface AuthProviderProps {
  children: React.ReactNode
  // undefined = initSession still pending; null = init failed (degraded mode, no persistence);
  // MMKV = ready. The tri-state lets the auth gate distinguish "still loading" from
  // "loaded but no persistence" so it can redirect to sign-in instead of hanging.
  mmkv: MMKV | null | undefined
  dpoService?: IDpoService
}

// ─── AuthProvider state invariants ───────────────────────────────────────────
// isLoading:       true until a definite answer: no stored session, a session/sign-out event,
//                  a setSession() result, or the 5 s bound from mount (Story 19.8).
//                  A supabase-js INITIAL_SESSION event with a null session is NOT an answer
//                  while a stored session is being restored: the client is created with
//                  persistSession:false so it always emits it, whatever MMKV holds.
// isSessionConfirmed: false for a session restored from storage without a successful
//                  refresh yet; true once the listener delivers a session.
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
  const [isSessionConfirmed, setIsSessionConfirmed] = useState(false)
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
  // Story 19.8 restore bookkeeping.
  // restoringRef:  a stored session is being restored; INITIAL_SESSION(null) must be ignored.
  // settledRef:    a definite answer has arrived; cancels the 5 s bound.
  // seededRef:     authState already holds the stored session (fast path or fallback).
  // confirmedRef:  mirrors isSessionConfirmed for use in callbacks.
  // bootstrapInFlightRef: the initial setSession() has not returned yet.
  const restoringRef = useRef(false)
  const settledRef = useRef(false)
  const seededRef = useRef(false)
  const confirmedRef = useRef(false)
  const bootstrapInFlightRef = useRef(false)
  const retryInFlightRef = useRef(false)
  const storedSessionRef = useRef<Session | null>(null)
  const boundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function settle(): void {
    settledRef.current = true
    restoringRef.current = false
    if (boundTimerRef.current) {
      clearTimeout(boundTimerRef.current)
      boundTimerRef.current = null
    }
  }

  // Everything the app derives from a session. `confirmed` false = restored from storage
  // without a refresh: local reads only, and nothing is written back to MMKV.
  function applySession(session: Session, event: string, confirmed: boolean): void {
    const store = mmkvRef.current
    if (store && confirmed) setAuthState(store, session)
    confirmedRef.current = confirmed
    setIsSessionConfirmed(confirmed)
    setAuthStateLocal({ session, userId: session.user.id, email: session.user.email ?? null })
    // For a confirmed session setAuthState already wrote the flag to MMKV; for an unconfirmed
    // (stored) one the flag was persisted by the original sign-in. Either way mirror it into
    // local state so consumers see it immediately without another MMKV read.
    setHasAuthedBeforeLocal(true)
    // Read onboarding state from MMKV now that userId is known (ARC-004).
    // Guard by userId — token refreshes must not re-read and overwrite in-flight state.
    if (store) {
      // Read in-progress session recovery data (Story 5.2+). Gated on auth per ADR-004.
      // Story 18.2: a record whose startedAt is ≥24h old is treated as absent — same
      // clear-and-ignore handling as the corrupt-JSON case below, so a stale local
      // record doesn't block the cross-device PowerSync fallback query from finding a
      // different, fresher session server-side (sessionRecoveryData must end up null).
      // The staleness clear is gated to real sign-in events (not TOKEN_REFRESHED etc.,
      // which this listener also receives with no other event-type guard) — otherwise a
      // session still genuinely open on /session/active whose startedAt happens to cross
      // 24h would get its local recovery record silently deleted by a background token
      // refresh, making it permanently unresumable if the app were later killed.
      try {
        const raw = store.getString(KV_KEYS.SESSION_IN_PROGRESS(session.user.id))
        const parsed = raw ? (JSON.parse(raw) as SessionRecoveryData) : null
        const isSignInEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION'
        if (parsed && isSignInEvent && !isSessionRecoveryFresh(parsed.startedAt, Date.now())) {
          store.delete(KV_KEYS.SESSION_IN_PROGRESS(session.user.id))
          setSessionRecoveryDataLocal(null)
        } else {
          setSessionRecoveryDataLocal(parsed)
        }
      } catch {
        store.delete(KV_KEYS.SESSION_IN_PROGRESS(session.user.id))
        setSessionRecoveryDataLocal(null)
      }
      // Option A (Story 5.6 / Issue #36): defensively wipe any stale SESSION_DEBRIEF_PENDING
      // left over from the State 7/8 era. Safe no-op when the key is absent.
      store.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(session.user.id))
      console.log('[AuthProvider] Option A wipe: cleared stale SESSION_DEBRIEF_PENDING')
      // Read pending-deletion record scoped to this user (Story 9.4) — covers the warm
      // in-app account-switch case (a user signs out and a different user signs in
      // within the same running app session, no app restart). Setting to null when
      // absent/corrupt is required, not just a default — it clears any stale record
      // still held in React state from the previous signed-in user.
      try {
        const pendingRaw = store.getString(KV_KEYS.PENDING_DELETION_REQUEST(session.user.id))
        setPendingDeletion(pendingRaw ? (JSON.parse(pendingRaw) as PendingDeletionRecord) : null)
      } catch (error) {
        console.warn('[AuthProvider] Failed to parse pending deletion record on sign-in:', error)
        store.delete(KV_KEYS.PENDING_DELETION_REQUEST(session.user.id))
        setPendingDeletion(null)
      }
    }
  }

  function applySignedOut(): void {
    const store = mmkvRef.current
    if (store) clearAuthState(store)
    confirmedRef.current = false
    seededRef.current = false
    // A late fallback must not resurrect a session the user or the server has ended.
    storedSessionRef.current = null
    setIsSessionConfirmed(false)
    setAuthStateLocal(DEFAULT_AUTH_STATE)
    setSessionRecoveryDataLocal(null)
    setPendingDeletion(null)
  }

  // Stored session used without a confirmed refresh (offline, 5xx/429, hung refresh).
  function fallbackToStoredSession(): void {
    const session = storedSessionRef.current
    settle()
    if (session && !seededRef.current && !confirmedRef.current) {
      seededRef.current = true
      applySession(session, 'INITIAL_SESSION', false)
    }
    setIsLoading(false)
  }

  // Refresh token rejected by the server: the stored session is genuinely dead.
  function rejectStoredSession(): void {
    settle()
    applySignedOut()
    setIsLoading(false)
  }

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
        settle()
        setIsLoading(false)
      }
      return
    }

    if (mmkvReadyRef.current) return
    mmkvReadyRef.current = true

    // Bootstrap "has authed before" flag (persisted across sign-out)
    setHasAuthedBeforeLocal(getHasAuthedBefore(mmkv))

    const stored = getAuthState(mmkv)

    // Bootstrap pending deletion state — scoped by userId (Story 9.4) so a stale record
    // left by a previous account on this device can never surface for a different user.
    // Only safe to read once stored.userId is known; when absent, leave pendingDeletion
    // at its existing default (null) — there is no userId to scope the key by.
    if (stored.userId) {
      try {
        const raw = mmkv.getString(KV_KEYS.PENDING_DELETION_REQUEST(stored.userId))
        if (raw) setPendingDeletion(JSON.parse(raw) as PendingDeletionRecord)
      } catch {
        // Corrupt entry — ignore
      }
    }

    const session = stored.session
    if (!session) {
      settle()
      setIsLoading(false)
      return
    }

    storedSessionRef.current = session
    restoringRef.current = true
    // Fast path (Story 19.8): an access token with more than 60 s of life left is trusted
    // at once — setSession() makes a /user round trip even for an unexpired token, and
    // gating the splash on it would blow the cold-start budget. setSession still runs below
    // to confirm; a rejection is handled like any other (late SIGNED_OUT wins).
    // The same applies when the 5 s bound already fired before MMKV resolved (a slow init):
    // loading has ended, so seed from the stored session rather than let the gate see signed-out.
    if (settledRef.current || isAccessTokenFresh(session.access_token, Date.now())) {
      settledRef.current = true
      seededRef.current = true
      applySession(session, 'INITIAL_SESSION', false)
      setIsLoading(false)
    }

    // setSession re-arms autoRefreshToken for the stored token. It resolves with { error }
    // rather than rejecting (verified on device, Story 19.8 Implementation Notes); on success
    // it emits SIGNED_IN, which the listener turns into the confirmed session.
    bootstrapInFlightRef.current = true
    createSupabaseClient()
      .auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      .then(({ error }) => {
        if (!error) return
        // A rejection of the stored token is stale once another path confirmed a session.
        if (isRejectedRefreshError(error)) {
          if (!confirmedRef.current) rejectStoredSession()
        } else fallbackToStoredSession()
      })
      .catch(() => {
        // A rejection is never a server verdict — unconfirmed, not signed out.
        fallbackToStoredSession()
      })
      .finally(() => {
        bootstrapInFlightRef.current = false
      })
  }, [mmkv])

  // Bound on the loading state (Story 19.8): starts at mount, so a hung MMKV init or a hung
  // refresh cannot trap the user on the splash. Cancelled by the first definite answer.
  useEffect(() => {
    boundTimerRef.current = setTimeout(() => {
      boundTimerRef.current = null
      if (settledRef.current) return
      if (restoringRef.current) fallbackToStoredSession()
      else {
        settle()
        setIsLoading(false)
      }
    }, AUTH_RESTORE_BOUND_MS)
    return () => {
      if (boundTimerRef.current) clearTimeout(boundTimerRef.current)
    }
  }, [])

  // A stored session used without a confirmed refresh keeps trying to confirm: on app
  // foreground and on a slow interval (covers network return while foregrounded). The retry
  // goes through the client's refreshSession() with only the refresh token — never a replayed
  // setSession() with the stored pair — and never overlaps the initial setSession().
  useEffect(() => {
    if (isLoading || isSessionConfirmed || !authState.session) return
    function retry(): void {
      const store = mmkvRef.current
      if (!store || confirmedRef.current || bootstrapInFlightRef.current || retryInFlightRef.current) return
      if (AppState.currentState === 'background') return
      const refreshToken = getAuthState(store).session?.refresh_token ?? storedSessionRef.current?.refresh_token
      if (!refreshToken) return
      retryInFlightRef.current = true
      createSupabaseClient()
        .auth.refreshSession({ refresh_token: refreshToken })
        .then(({ error }) => {
          if (error && isRejectedRefreshError(error) && !confirmedRef.current) rejectStoredSession()
        })
        .catch(() => {})
        .finally(() => {
          retryInFlightRef.current = false
        })
    }
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry()
    })
    const timer = setInterval(retry, AUTH_RETRY_INTERVAL_MS)
    return () => {
      sub.remove()
      clearInterval(timer)
    }
  }, [isLoading, isSessionConfirmed, authState.session])

  // Register auth state listener once. Ignores events until mmkvReadyRef is set
  // so the app does not flash signed-out before initSession() resolves.
  useEffect(() => {
    const supabase = createSupabaseClient()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mmkvReadyRef.current) return
      // supabase-js emits INITIAL_SESSION with a null session on subscribe because this client
      // keeps no persistence (persistSession:false). While a stored session is being restored
      // that is not "signed out" — acting on it flashed sign-in and wiped the stored session.
      if (event === 'INITIAL_SESSION' && !session && restoringRef.current) return

      settle()
      seededRef.current = !!session
      if (session) {
        applySession(session, event, true)
      } else {
        applySignedOut()
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
    // With no client session (unconfirmed restore) supabase-js may emit no SIGNED_OUT, so end
    // the local session explicitly rather than rely on the listener.
    settle()
    applySignedOut()
  }

  async function requestAccountDeletion(): Promise<void> {
    if (!authState.userId) throw new Error('Cannot request erasure: no authenticated user')
    // Capture once — single source of truth for this call, eliminates redundant
    // non-null assertions below and prevents silent-skip if ref races.
    const userId = authState.userId
    const mmkv = mmkvRef.current
    if (!mmkv) throw new Error('Cannot request erasure: storage not initialised')

    // Step A — Write 'pending' BEFORE the try-catch, before calling requestErasure()
    // (F2: write evidence of submission regardless of network outcome.
    //  Replaces the write DpoServiceStub previously did — now invariant across all IDpoService implementations.)
    const pendingRecord: PendingDeletionRecord = { userId, requestedAt: new Date().toISOString(), status: 'pending' }
    mmkv.set(KV_KEYS.PENDING_DELETION_REQUEST(userId), JSON.stringify(pendingRecord))
    setPendingDeletion(pendingRecord)

    // Model B (DPDPA §13): UserErasureRequestService calls /dpo/request-deletion (user-authenticated)
    // to persist the deletion request server-side. DPO operator processes it via the Story 3.4 panel.
    let erasureSucceeded = false
    try {
      await dpoServiceRef.current.requestErasure(userId)
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
        const raw = mmkv.getString(KV_KEYS.PENDING_DELETION_REQUEST(userId))
        if (raw) {
          const record = JSON.parse(raw) as PendingDeletionRecord
          mmkv.set(KV_KEYS.PENDING_DELETION_REQUEST(userId), JSON.stringify({ ...record, status: 'completed' }))
          setPendingDeletion({ ...record, status: 'completed' })
        }
      } catch {
        // Ignore parse error — status update is best-effort
      }
    }

    await sessionSignOut(mmkv)
    settle()
    applySignedOut()

    // Clear the local pending deletion record after sign-out.
    // Server-side deletion_requested_at is the authoritative state.
    // Leaving the key intact would show a ghost record on next app launch with a different user.
    try {
      mmkv.delete(KV_KEYS.PENDING_DELETION_REQUEST(userId))
      // Mirror MMKV deletion into React state — AuthProvider is not unmounted on sign-out,
      // so without this the context would still expose a stale 'completed' record.
      setPendingDeletion(null)
    } catch (error) {
      // Best-effort — if MMKV is unavailable, nothing to clear, but log so a cleanup
      // failure is diagnosable instead of fully silent.
      console.warn('[AuthProvider] Failed to clear pending deletion record:', error)
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

  function setGroundingActive(): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.GROUNDING_ACTIVE(userId), Date.now())
  }

  function clearGroundingActive(): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.delete(KV_KEYS.GROUNDING_ACTIVE(userId))
  }

  function getGroundingActiveAt(): number | null {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return null
    // Stored as a number type (Date.now()) — must read via getNumber, not getString.
    return store.getNumber(KV_KEYS.GROUNDING_ACTIVE(userId)) ?? null
  }

  function getLastUsedTechnique(fearItemId: string): TechniqueType | null {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return null
    const val = store.getString(KV_KEYS.SESSION_LAST_TECHNIQUE(userId, fearItemId))
    const valid: string[] = ['somatic', 'breathing', 'cognitive']
    if (!val || !valid.includes(val)) return null
    return val as TechniqueType
  }

  function setLastUsedTechnique(fearItemId: string, technique: TechniqueType): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.SESSION_LAST_TECHNIQUE(userId, fearItemId), technique)
  }

  function getLastAffirmation(): string | null {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return null
    return store.getString(KV_KEYS.LAST_AFFIRMATION(userId)) ?? null
  }

  function setLastAffirmation(key: string): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.LAST_AFFIRMATION(userId), key)
  }

  function getReminderTime(): string | null {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return null
    return store.getString(KV_KEYS.SESSION_REMINDER_TIME(userId)) ?? null
  }

  function setReminderTime(time: string): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.SESSION_REMINDER_TIME(userId), time)
  }

  function getReminderNotificationId(): string | null {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return null
    return store.getString(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)) ?? null
  }

  function setReminderNotificationId(id: string): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId), id)
  }

  function clearReminderNotificationId(): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.delete(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId))
  }

  function getReminderEnabled(): boolean {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return false
    return store.getBoolean(KV_KEYS.SESSION_REMINDER_ENABLED(userId)) ?? false
  }

  function setReminderEnabled(enabled: boolean): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) return
    store.set(KV_KEYS.SESSION_REMINDER_ENABLED(userId), enabled)
  }

  return (
    <AuthContext.Provider value={{
      authState,
      isLoading,
      isSessionConfirmed,
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
      setGroundingActive,
      clearGroundingActive,
      getGroundingActiveAt,
      getLastUsedTechnique,
      setLastUsedTechnique,
      getLastAffirmation,
      setLastAffirmation,
      getReminderTime,
      setReminderTime,
      getReminderNotificationId,
      setReminderNotificationId,
      clearReminderNotificationId,
      getReminderEnabled,
      setReminderEnabled,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
