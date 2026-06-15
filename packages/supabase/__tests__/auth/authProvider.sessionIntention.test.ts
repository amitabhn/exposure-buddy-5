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

const SESSION_ID = 'session-xyz-456'

function hasSessionIntention(mmkv: ReturnType<typeof makeMockMmkv>, sessionId: string): boolean {
  const text = mmkv.getString(KV_KEYS.SESSION_INTENTION(sessionId))
  return !!(text && text.trim().length > 0)
}

function getSessionIntention(mmkv: ReturnType<typeof makeMockMmkv>, sessionId: string): string | null {
  return mmkv.getString(KV_KEYS.SESSION_INTENTION(sessionId)) ?? null
}

describe('hasSessionIntention', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns true when MMKV has non-empty intention text', () => {
    mmkv.set(KV_KEYS.SESSION_INTENTION(SESSION_ID), 'I expect to feel nervous')
    expect(hasSessionIntention(mmkv, SESSION_ID)).toBe(true)
  })

  it('returns false when MMKV key is missing', () => {
    expect(hasSessionIntention(mmkv, SESSION_ID)).toBe(false)
  })

  it('returns false when MMKV key is an empty string', () => {
    mmkv.set(KV_KEYS.SESSION_INTENTION(SESSION_ID), '')
    expect(hasSessionIntention(mmkv, SESSION_ID)).toBe(false)
  })

  it('returns false when MMKV key is whitespace only', () => {
    mmkv.set(KV_KEYS.SESSION_INTENTION(SESSION_ID), '   ')
    expect(hasSessionIntention(mmkv, SESSION_ID)).toBe(false)
  })
})

describe('getSessionIntention', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns the stored string when key exists', () => {
    mmkv.set(KV_KEYS.SESSION_INTENTION(SESSION_ID), 'I am writing to future me')
    expect(getSessionIntention(mmkv, SESSION_ID)).toBe('I am writing to future me')
  })

  it('returns null when key is missing', () => {
    expect(getSessionIntention(mmkv, SESSION_ID)).toBeNull()
  })
})
