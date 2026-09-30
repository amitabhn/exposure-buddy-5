import React from 'react'
import { act, create } from 'react-test-renderer'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { KV_KEYS } from '@exposure-buddy/core'

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

// Imported after the mocks above so AuthProvider picks up the mocked modules.
import { AuthProvider, AuthContext } from '../../src/auth/AuthProvider'
import type { MMKV } from 'react-native-mmkv'
import type { IDpoService } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — matches the subset used by AuthProvider helpers
function makeMockMmkv() {
  const store = new Map<string, string | boolean | number>()
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
    set: (key: string, value: string | boolean | number) => store.set(key, value),
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
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
// mutable holder, updated on every render — exercises the actual getLastAffirmation/
// setLastAffirmation implementations rather than a hand-copied replica (code-review
// correction: a reimplementation can stay green while the real component regresses).
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

describe('getLastAffirmation / setLastAffirmation via the real AuthProvider (Story 18.3)', () => {
  beforeEach(() => {
    authChangeCallback = null
    mockSetSession.mockClear()
    mockSignOut.mockClear()
  })

  it('round-trips a set value through get, using the real KV_KEYS.LAST_AFFIRMATION key', async () => {
    const mmkv = makeMockMmkv()
    const { holder, Tree } = renderAuthProvider(mmkv)

    await act(async () => {
      create(React.createElement(Tree))
    })
    await act(async () => {
      authChangeCallback?.('SIGNED_IN', makeSession('user-a'))
    })

    expect(holder.value?.getLastAffirmation()).toBeNull()

    await act(async () => {
      holder.value?.setLastAffirmation('calmMe.affirmation.5')
    })

    expect(holder.value?.getLastAffirmation()).toBe('calmMe.affirmation.5')
    expect(mmkv.getString(KV_KEYS.LAST_AFFIRMATION('user-a'))).toBe('calmMe.affirmation.5')
  })
})

// Below: a hand-copied replica of AuthProvider's MMKV read/write contract, kept for its
// extra key-shape/scoping assertions (not currently covered above). The describe block
// above is the source of truth for behavioral correctness of the real implementation.
function replicaGetLastAffirmation(mmkv: MockMmkv, userId: string): string | null {
  return mmkv.getString(KV_KEYS.LAST_AFFIRMATION(userId)) ?? null
}

function replicaSetLastAffirmation(mmkv: MockMmkv, userId: string, key: string): void {
  mmkv.set(KV_KEYS.LAST_AFFIRMATION(userId), key)
}

const USER_ID = 'user-abc-123'

describe('getLastAffirmation / setLastAffirmation replica (key-shape/scoping coverage)', () => {
  let mmkv: MockMmkv

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns null when nothing has been persisted yet', () => {
    expect(replicaGetLastAffirmation(mmkv, USER_ID)).toBeNull()
  })

  it('overwrites the previous value on a subsequent set', () => {
    replicaSetLastAffirmation(mmkv, USER_ID, 'calmMe.affirmation.5')
    replicaSetLastAffirmation(mmkv, USER_ID, 'calmMe.affirmation.9')
    expect(replicaGetLastAffirmation(mmkv, USER_ID)).toBe('calmMe.affirmation.9')
  })

  it('scopes the key by userId — setting for one user does not affect another', () => {
    replicaSetLastAffirmation(mmkv, USER_ID, 'calmMe.affirmation.5')
    expect(replicaGetLastAffirmation(mmkv, 'other-user')).toBeNull()
  })
})
