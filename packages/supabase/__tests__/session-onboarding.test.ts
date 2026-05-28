import { describe, it, expect, beforeEach, vi } from 'vitest'

// react-native-mmkv and expo-secure-store use native bindings that Vitest
// cannot parse (Flow `import typeof`, native modules). Mock them before any
// imports that transitively require them.
vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))
vi.mock('expo-secure-store', () => ({}))
vi.mock('../src/client', () => ({ createSupabaseClient: () => ({}) }))

import {
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingProgress,
  setOnboardingProgress,
} from '../src/auth/session'
import { KV_KEYS } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — matches the subset of the MMKV API used by the helpers
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
    set: (key: string, value: string | boolean | number) => store.set(key, value),
    delete: (key: string) => store.delete(key),
  }
}

const USER_ID = 'user-abc-123'

describe('getOnboardingComplete / setOnboardingComplete', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => {
    mmkv = makeMockMmkv()
  })

  it('returns false when key is absent', () => {
    expect(getOnboardingComplete(mmkv as never, USER_ID)).toBe(false)
  })

  it('returns true after setOnboardingComplete is called', () => {
    setOnboardingComplete(mmkv as never, USER_ID)
    expect(getOnboardingComplete(mmkv as never, USER_ID)).toBe(true)
  })

  it('uses the user-scoped key from KV_KEYS', () => {
    setOnboardingComplete(mmkv as never, USER_ID)
    // Value must be stored under the typed key, not a raw string
    expect(mmkv.getBoolean(KV_KEYS.ONBOARDING_COMPLETE(USER_ID))).toBe(true)
    // Different userId → isolated key
    expect(mmkv.getBoolean(KV_KEYS.ONBOARDING_COMPLETE('other-user'))).toBeUndefined()
  })
})

describe('getOnboardingProgress / setOnboardingProgress', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => {
    mmkv = makeMockMmkv()
  })

  it('returns null when key is absent', () => {
    expect(getOnboardingProgress(mmkv as never, USER_ID)).toBeNull()
  })

  it('round-trips { step } through MMKV', () => {
    setOnboardingProgress(mmkv as never, USER_ID, { step: 3 })
    expect(getOnboardingProgress(mmkv as never, USER_ID)).toEqual({ step: 3 })
  })

  it('throws on corrupt JSON (caller must handle — AC5)', () => {
    mmkv.set(KV_KEYS.ONBOARDING_PROGRESS(USER_ID), '{not-json}')
    expect(() => getOnboardingProgress(mmkv as never, USER_ID)).toThrow()
  })
})
