import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — matches the subset used by AuthProvider helpers
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

// Inline replica of AuthProvider.tsx's setGroundingActive/clearGroundingActive —
// exercises the exact MMKV read/write contract those handlers rely on (Story 9.2).
function setGroundingActive(mmkv: ReturnType<typeof makeMockMmkv>, userId: string, now: number): void {
  mmkv.set(KV_KEYS.GROUNDING_ACTIVE(userId), now)
}

function clearGroundingActive(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): void {
  mmkv.delete(KV_KEYS.GROUNDING_ACTIVE(userId))
}

const USER_ID = 'user-abc-123'

describe('setGroundingActive / clearGroundingActive (Story 9.2)', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('writes a timestamp to KV_KEYS.GROUNDING_ACTIVE on setGroundingActive', () => {
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(false)
    setGroundingActive(mmkv, USER_ID, 1_750_000_000_000)
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(true)
  })

  it('deletes the key on clearGroundingActive', () => {
    setGroundingActive(mmkv, USER_ID, 1_750_000_000_000)
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(true)
    clearGroundingActive(mmkv, USER_ID)
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(false)
  })

  it('clearGroundingActive is a safe no-op when the key was never set', () => {
    expect(() => clearGroundingActive(mmkv, USER_ID)).not.toThrow()
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(false)
  })

  it('scopes the key by userId — setting for one user does not affect another', () => {
    setGroundingActive(mmkv, USER_ID, 1_750_000_000_000)
    setGroundingActive(mmkv, 'other-user', 1_750_000_000_000)
    clearGroundingActive(mmkv, USER_ID)
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE(USER_ID))).toBe(false)
    expect(mmkv.has(KV_KEYS.GROUNDING_ACTIVE('other-user'))).toBe(true)
  })
})
