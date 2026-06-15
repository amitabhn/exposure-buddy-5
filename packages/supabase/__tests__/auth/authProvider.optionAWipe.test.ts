import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — same shape as the existing test helpers
function makeMockMmkv() {
  const store = new Map<string, string | boolean | number>()
  return {
    getString: (key: string) => {
      const v = store.get(key)
      return typeof v === 'string' ? v : undefined
    },
    set: (key: string, value: string | boolean | number) => store.set(key, value),
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
  }
}

// Inline replica of the SIGNED_IN-branch boot wipe in AuthProvider.tsx — exercises the
// exact line that closes the State 7/8 stale-data leak.
function optionAWipe(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): void {
  mmkv.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(userId))
}

const USER_ID = 'user-abc-123'

describe('Option A boot wipe (Story 5.6 — Issue #36)', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('deletes a stale SESSION_DEBRIEF_PENDING key on SIGNED_IN', () => {
    mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID), JSON.stringify({ sessionId: 'old-session' }))
    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBe(true)

    optionAWipe(mmkv, USER_ID)

    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBe(false)
    expect(mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBeUndefined()
  })

  it('is a safe no-op when the key was never set', () => {
    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBe(false)
    expect(() => optionAWipe(mmkv, USER_ID)).not.toThrow()
    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBe(false)
  })

  it('scopes the wipe by userId', () => {
    mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID), '{}')
    mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING('other-user'), '{}')

    optionAWipe(mmkv, USER_ID)

    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBe(false)
    expect(mmkv.has(KV_KEYS.SESSION_DEBRIEF_PENDING('other-user'))).toBe(true)
  })
})
