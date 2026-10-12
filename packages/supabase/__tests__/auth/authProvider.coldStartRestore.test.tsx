import React, { useContext } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MMKV } from 'react-native-mmkv'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Mock fidelity (Story 19.8, spec Implementation Notes "Device repro"): supabase-js 2.117.2 /
// auth-js 2.117.2 with persistSession:false.
//  - onAuthStateChange immediately emits INITIAL_SESSION with session=null, whatever MMKV holds.
//  - setSession() RESOLVES with { error } (never rejects); offline the error is an
//    AuthRetryableFetchError with status 0 and NO event is emitted. On success it emits
//    SIGNED_IN after the /user round trip.
let listener: ((event: string, session: unknown) => void) | null = null
const setSession = vi.fn()
const refreshSession = vi.fn()
let appStateHandler: ((s: string) => void) | null = null

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_: string, h: (s: string) => void) => {
      appStateHandler = h
      return { remove: () => { appStateHandler = null } }
    },
  },
}))
vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))
vi.mock('expo-secure-store', () => ({ deleteItemAsync: async () => {} }))
vi.mock('../../src/functions', () => ({ UserErasureRequestService: class {} }))
vi.mock('../../src/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      setSession,
      refreshSession,
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        listener = cb
        return { data: { subscription: { unsubscribe: () => { listener = null } } } }
      },
    },
  }),
}))

import { AuthProvider, AuthContext } from '../../src/auth/AuthProvider'
import { MMKV_KEYS } from '../../src/auth/session'

function b64url(o: object): string {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function jwt(expSeconds: number): string {
  return `${b64url({ alg: 'HS256' })}.${b64url({ exp: expSeconds })}.sig`
}
const NOW = 1_800_000_000_000
function makeSession(expOffsetSeconds: number) {
  return {
    access_token: jwt(NOW / 1000 + expOffsetSeconds),
    refresh_token: 'refresh-1',
    expires_at: NOW / 1000 + expOffsetSeconds,
    user: { id: 'user-1', email: 'a@b.c' },
  }
}

function makeMmkv(initial?: unknown): MMKV & { _store: Map<string, unknown> } {
  const store = new Map<string, unknown>()
  if (initial) {
    const s = initial as { user: { id: string; email: string } }
    store.set(MMKV_KEYS.AUTH_STATE, JSON.stringify({ session: initial, userId: s.user.id, email: s.user.email }))
  }
  return {
    _store: store,
    getString: (k: string) => store.get(k) as string | undefined,
    getBoolean: (k: string) => store.get(k) as boolean | undefined,
    getNumber: (k: string) => store.get(k) as number | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    delete: (k: string) => { store.delete(k) },
  } as unknown as MMKV & { _store: Map<string, unknown> }
}

type Ctx = React.ContextType<typeof AuthContext>
let ctx: Ctx
function Probe() {
  ctx = useContext(AuthContext)
  return null
}
function mount(mmkv: MMKV | null | undefined) {
  let r!: ReturnType<typeof create>
  act(() => {
    r = create(<AuthProvider mmkv={mmkv}><Probe /></AuthProvider>)
  })
  return {
    rerender: (m: MMKV | null | undefined) => act(() => { r.update(<AuthProvider mmkv={m}><Probe /></AuthProvider>) }),
    unmount: () => act(() => { r.unmount() }),
  }
}
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
const emit = (e: string, s: unknown) => act(() => { listener?.(e, s) })
const authError = (name: string, status: number, code?: string) => Object.assign(new Error(name), { name, status, code })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  setSession.mockReset()
  refreshSession.mockReset()
  listener = null
})
afterEach(() => { vi.useRealTimers() })

describe('AuthProvider cold-start restore (Story 19.8)', () => {
  it('no stored session: isLoading false at once, signed out', async () => {
    mount(makeMmkv())
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.session).toBeNull()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('degraded storage (mmkv null): unchanged — loading ends, signed out', () => {
    mount(null)
    expect(ctx.isLoading).toBe(false)
    expect(ctx.isStorageDegraded).toBe(true)
  })

  it('valid token (>60 s left): fast path releases at once from the stored session, then confirms', async () => {
    const s = makeSession(3000)
    const mmkv = makeMmkv(s)
    setSession.mockReturnValue(new Promise(() => {})) // /user round trip still in flight
    mount(mmkv)
    emit('INITIAL_SESSION', null) // supabase-js's own empty-client event
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeDefined() // not wiped by INITIAL_SESSION(null)

    emit('SIGNED_IN', s)
    expect(ctx.isSessionConfirmed).toBe(true)
  })

  it('token inside the 60 s margin is not fast-pathed', () => {
    setSession.mockReturnValue(new Promise(() => {}))
    mount(makeMmkv(makeSession(30)))
    expect(ctx.isLoading).toBe(true)
  })

  it('expired token + slow refresh: stays loading, INITIAL_SESSION(null) never selects sign-in, then lands signed in', async () => {
    const s = makeSession(-100)
    const mmkv = makeMmkv(s)
    setSession.mockReturnValue(new Promise(() => {}))
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    expect(ctx.isLoading).toBe(true)
    expect(ctx.authState.session).toBeNull()
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeDefined()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(ctx.isLoading).toBe(true)

    emit('SIGNED_IN', makeSession(3600))
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(true)
  })

  it('offline (AuthRetryableFetchError, status 0): home from the stored session as soon as the error returns, not after 5 s', async () => {
    const s = makeSession(-100)
    const mmkv = makeMmkv(s)
    const before = mmkv._store.get(MMKV_KEYS.AUTH_STATE)
    setSession.mockResolvedValue({ data: { session: null, user: null }, error: authError('AuthRetryableFetchError', 0) })
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBe(before) // fallback never writes MMKV
  })

  it.each([[500], [429], [503]])('refresh error %i is unconfirmed, never sign-out', async (status) => {
    const mmkv = makeMmkv(makeSession(-100))
    setSession.mockResolvedValue({ data: {}, error: authError('AuthApiError', status) })
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeDefined()
  })

  it('non-JSON / captive-portal error (AuthUnknownError) is unconfirmed', async () => {
    setSession.mockResolvedValue({ data: {}, error: authError('AuthUnknownError', 200) })
    mount(makeMmkv(makeSession(-100)))
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.authState.userId).toBe('user-1')
  })

  it('a rejected promise from setSession is unconfirmed, not sign-out', async () => {
    setSession.mockRejectedValue(new Error('boom'))
    mount(makeMmkv(makeSession(-100)))
    await flush()
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
  })

  it.each([[400], [401]])('rejected refresh token (%i): ends signed out and clears stored auth state', async (status) => {
    const mmkv = makeMmkv(makeSession(-100))
    setSession.mockResolvedValue({ data: {}, error: authError('AuthApiError', status) })
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.session).toBeNull()
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeUndefined()
  })

  it('hung refresh: after the 5 s bound falls back to the stored session, not sign-in', async () => {
    const mmkv = makeMmkv(makeSession(-100))
    setSession.mockReturnValue(new Promise(() => {}))
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    act(() => { vi.advanceTimersByTime(4999) })
    expect(ctx.isLoading).toBe(true)
    act(() => { vi.advanceTimersByTime(2) })
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
  })

  it('late rejection after the fallback: SIGNED_OUT still wins and clears stored state', async () => {
    const mmkv = makeMmkv(makeSession(-100))
    setSession.mockReturnValue(new Promise(() => {}))
    mount(mmkv)
    act(() => { vi.advanceTimersByTime(5100) })
    expect(ctx.authState.userId).toBe('user-1')
    emit('SIGNED_OUT', null)
    expect(ctx.authState.session).toBeNull()
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeUndefined()
  })

  it('a definite answer cancels the bound', async () => {
    setSession.mockReturnValue(new Promise(() => {}))
    mount(makeMmkv(makeSession(-100)))
    emit('SIGNED_OUT', null)
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.session).toBeNull()
    act(() => { vi.advanceTimersByTime(6000) })
    expect(ctx.authState.session).toBeNull() // the timer did not resurrect the stored session
  })

  it('mmkv never resolves: the bound (started at mount) ends loading, signed out', () => {
    mount(undefined)
    expect(ctx.isLoading).toBe(true)
    act(() => { vi.advanceTimersByTime(5100) })
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.session).toBeNull()
  })

  describe('retry of an unconfirmed stored session', () => {
    async function mountUnconfirmed() {
      const mmkv = makeMmkv(makeSession(-100))
      setSession.mockResolvedValue({ data: {}, error: authError('AuthRetryableFetchError', 0) })
      mount(mmkv)
      emit('INITIAL_SESSION', null)
      await flush()
      expect(ctx.isSessionConfirmed).toBe(false)
      return mmkv
    }

    it('on app foreground goes through refreshSession with only the refresh token, never setSession again', async () => {
      await mountUnconfirmed()
      refreshSession.mockResolvedValue({ data: {}, error: null })
      act(() => { appStateHandler?.('active') })
      await flush()
      expect(refreshSession).toHaveBeenCalledWith({ refresh_token: 'refresh-1' })
      expect(setSession).toHaveBeenCalledTimes(1)
    })

    it('retries on a slow interval too', async () => {
      await mountUnconfirmed()
      refreshSession.mockResolvedValue({ data: {}, error: null })
      act(() => { vi.advanceTimersByTime(30_000) })
      await flush()
      expect(refreshSession).toHaveBeenCalledTimes(1)
    })

    it('a confirmed session from the listener sets isSessionConfirmed and stops retrying', async () => {
      await mountUnconfirmed()
      emit('TOKEN_REFRESHED', makeSession(3600))
      expect(ctx.isSessionConfirmed).toBe(true)
      act(() => { appStateHandler?.('active'); vi.advanceTimersByTime(60_000) })
      expect(refreshSession).not.toHaveBeenCalled()
    })

    it('a rejected retry signs the user out', async () => {
      const mmkv = await mountUnconfirmed()
      refreshSession.mockResolvedValue({ data: {}, error: authError('AuthApiError', 400) })
      act(() => { appStateHandler?.('active') })
      await flush()
      expect(ctx.authState.session).toBeNull()
      expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeUndefined()
    })

    it('does not overlap the initial setSession', async () => {
      setSession.mockReturnValue(new Promise(() => {}))
      mount(makeMmkv(makeSession(3000))) // fast path: loaded + unconfirmed, setSession in flight
      act(() => { appStateHandler?.('active'); vi.advanceTimersByTime(30_000) })
      expect(refreshSession).not.toHaveBeenCalled()
    })
  })

  // Review patches (Story 19.8 code review)
  it('fast path then a rejected setSession (401): signs out and clears stored state', async () => {
    const mmkv = makeMmkv(makeSession(3000))
    setSession.mockResolvedValue({ data: {}, error: authError('AuthApiError', 401) })
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.isLoading).toBe(false)
    expect(ctx.authState.session).toBeNull()
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeUndefined()
  })

  it('fast path then 403 session_not_found (revoked session, observed on hosted): signs out at once', async () => {
    const mmkv = makeMmkv(makeSession(3000))
    setSession.mockResolvedValue({ data: {}, error: authError('AuthApiError', 403, 'session_not_found') })
    mount(mmkv)
    emit('INITIAL_SESSION', null)
    await flush()
    expect(ctx.authState.session).toBeNull()
    expect(mmkv._store.get(MMKV_KEYS.AUTH_STATE)).toBeUndefined()
  })

  it('MMKV resolving after the 5 s bound seeds the stored session instead of leaving signed-out', async () => {
    const mmkv = makeMmkv(makeSession(-100))
    setSession.mockReturnValue(new Promise(() => {}))
    const m = mount(undefined)
    act(() => { vi.advanceTimersByTime(5100) })
    expect(ctx.isLoading).toBe(false)
    m.rerender(mmkv)
    emit('INITIAL_SESSION', null)
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(false)
  })

  it('a late network error after SIGNED_OUT does not resurrect the ended session', async () => {
    let resolve!: (v: unknown) => void
    setSession.mockReturnValue(new Promise((r) => { resolve = r }))
    mount(makeMmkv(makeSession(-100)))
    emit('SIGNED_OUT', null)
    resolve({ data: {}, error: authError('AuthRetryableFetchError', 0) })
    await flush()
    expect(ctx.authState.session).toBeNull()
  })

  it('a stale rejection after another path confirmed a session is ignored', async () => {
    let resolve!: (v: unknown) => void
    setSession.mockReturnValue(new Promise((r) => { resolve = r }))
    const mmkv = makeMmkv(makeSession(-100))
    mount(mmkv)
    emit('SIGNED_IN', makeSession(3600))
    resolve({ data: {}, error: authError('AuthApiError', 400) })
    await flush()
    expect(ctx.authState.userId).toBe('user-1')
    expect(ctx.isSessionConfirmed).toBe(true)
  })
})
