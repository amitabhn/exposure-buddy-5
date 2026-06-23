import React from 'react'
import { act, create } from 'react-test-renderer'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { KV_KEYS, type IDpoService, type PendingDeletionRecord } from '@exposure-buddy/core'

// react-test-renderer's act() only batches/flushes updates when this global is set —
// without it, act() silently no-ops and effects may not be flushed before assertions run.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// react-native-mmkv ships native bindings that don't load under plain Node — AuthProvider
// only needs the named export to exist for its (type-only-in-practice) import to resolve.
vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))

// expo-secure-store also has native bindings; requestAccountDeletion()'s sessionSignOut()
// calls SecureStore.deleteItemAsync defensively — stub it out so it resolves under Node.
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}))

// Controllable Supabase client stand-in — lets the test fire onAuthStateChange events
// manually instead of driving a real network sign-in.
let authChangeCallback: ((event: string, session: Session | null) => void) | null = null
const mockSetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null })
const mockSignOut = vi.fn().mockResolvedValue({ error: null })

vi.mock('../../src/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) => {
        authChangeCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      setSession: mockSetSession,
      signOut: mockSignOut,
    },
  }),
}))

// Imported after the mocks above so AuthProvider picks up the mocked modules. session.ts
// (getAuthState/setAuthState/etc.) is imported for real — only its react-native-mmkv and
// expo-secure-store dependencies are stubbed.
import { AuthProvider, AuthContext } from '../../src/auth/AuthProvider'
import { setAuthState } from '../../src/auth/session'
import type { MMKV } from 'react-native-mmkv'

// In-memory MMKV stand-in implementing the full subset AuthProvider's bootstrap path
// needs (getBoolean/getNumber included — getHasAuthedBefore() reads via getBoolean).
function makeMockMmkv() {
  const store = new Map<string, string | boolean | number>()
  const setCalls: Array<[string, string | boolean | number]> = []
  return {
    getString: (key: string) => {
      const v = store.get(key)
      return typeof v === 'string' ? v : undefined
    },
    getBoolean: (key: string) => {
      const v = store.get(key)
      return typeof v === 'boolean' ? v : undefined
    },
    getNumber: (key: string) => {
      const v = store.get(key)
      return typeof v === 'number' ? v : undefined
    },
    set: (key: string, value: string | boolean | number) => {
      setCalls.push([key, value])
      store.set(key, value)
    },
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
    setCalls,
  }
}

type MockMmkv = ReturnType<typeof makeMockMmkv>

function makeSession(userId: string): Session {
  return {
    access_token: `access-${userId}`,
    refresh_token: `refresh-${userId}`,
    user: { id: userId, email: `${userId}@test.com` },
  } as unknown as Session
}

const dpoServiceStub: IDpoService = {
  requestErasure: vi.fn().mockResolvedValue(undefined),
}

// Renders the real AuthProvider and exposes its latest context value to the test via a
// mutable holder, updated on every render — exercises the actual useEffect/onAuthStateChange
// logic rather than reimplementing it (code-review correction: a hand-copied replica can
// stay green while the real component regresses).
function renderAuthProvider(mmkv: MockMmkv) {
  const holder: { value: React.ContextType<typeof AuthContext> | null } = { value: null }

  function ContextReader() {
    holder.value = React.useContext(AuthContext)
    return null
  }

  function Tree() {
    return React.createElement(
      AuthProvider,
      { mmkv: mmkv as unknown as MMKV, dpoService: dpoServiceStub },
      React.createElement(ContextReader),
    )
  }

  return { holder, Tree }
}

describe('AuthProvider pending-deletion userId scoping (Story 9.4)', () => {
  beforeEach(() => {
    authChangeCallback = null
    mockSetSession.mockClear()
    mockSignOut.mockClear()
    ;(dpoServiceStub.requestErasure as ReturnType<typeof vi.fn>).mockClear()
  })

  it('requestAccountDeletion writes/updates/clears the record under the scoped key, never a flat key', async () => {
    const mmkv = makeMockMmkv()
    const { holder, Tree } = renderAuthProvider(mmkv)

    await act(async () => {
      create(React.createElement(Tree))
    })

    await act(async () => {
      authChangeCallback?.('SIGNED_IN', makeSession('user-a'))
    })

    expect(holder.value?.authState.userId).toBe('user-a')

    await act(async () => {
      await holder.value?.requestAccountDeletion()
    })

    const scopedKey = KV_KEYS.PENDING_DELETION_REQUEST('user-a')
    const writtenKeys = mmkv.setCalls.map(([key]) => key)

    expect(writtenKeys).toContain(scopedKey)
    expect(writtenKeys).not.toContain('pending_deletion_request')
    // Cleared after sign-out completes.
    expect(mmkv.has(scopedKey)).toBe(false)
    expect(holder.value?.pendingDeletion).toBeNull()
  })

  it('cold-start: a record written under user A is not returned when bootstrap resolves user B', async () => {
    const mmkv = makeMockMmkv()

    // Simulate a stale record left by a previous account on this device.
    const staleRecord: PendingDeletionRecord = {
      userId: 'user-a',
      requestedAt: new Date().toISOString(),
      status: 'pending',
    }
    mmkv.set(KV_KEYS.PENDING_DELETION_REQUEST('user-a'), JSON.stringify(staleRecord))

    // Simulate a stored session for a *different* user (user-b) already on this device —
    // this is what getAuthState(mmkv) resolves during the cold-start bootstrap effect.
    setAuthState(mmkv as unknown as MMKV, makeSession('user-b'))

    const { holder, Tree } = renderAuthProvider(mmkv)

    await act(async () => {
      create(React.createElement(Tree))
    })

    expect(holder.value?.pendingDeletion).toBeNull()
    // The stale record itself is untouched — proves no cross-account read occurred.
    expect(mmkv.has(KV_KEYS.PENDING_DELETION_REQUEST('user-a'))).toBe(true)
  })

  it('warm-switch: a record written under user A is not returned when SIGNED_IN fires for user B in the same instance', async () => {
    const mmkv = makeMockMmkv()
    const { holder, Tree } = renderAuthProvider(mmkv)

    await act(async () => {
      create(React.createElement(Tree))
    })

    // User A signs in and has a pending-deletion record.
    await act(async () => {
      authChangeCallback?.('SIGNED_IN', makeSession('user-a'))
    })
    mmkv.set(
      KV_KEYS.PENDING_DELETION_REQUEST('user-a'),
      JSON.stringify({ userId: 'user-a', requestedAt: new Date().toISOString(), status: 'pending' }),
    )
    await act(async () => {
      authChangeCallback?.('SIGNED_IN', makeSession('user-a'))
    })
    expect(holder.value?.pendingDeletion?.userId).toBe('user-a')

    // User A signs out, user B signs in within the same running app session (no remount).
    await act(async () => {
      authChangeCallback?.('SIGNED_OUT', null)
    })
    await act(async () => {
      authChangeCallback?.('SIGNED_IN', makeSession('user-b'))
    })

    expect(holder.value?.authState.userId).toBe('user-b')
    expect(holder.value?.pendingDeletion).toBeNull()
  })
})
