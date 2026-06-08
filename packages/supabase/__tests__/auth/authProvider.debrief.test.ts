import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS } from '@exposure-buddy/core'
import type { DebriefPendingData } from '@exposure-buddy/core'

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

const USER_ID = 'user-abc-123'
const SESSION_ID = 'session-xyz-456'

const SAMPLE_DEBRIEF: DebriefPendingData = {
  sessionId: SESSION_ID,
  fearItemId: 'item-abc',
  completedAtMs: 1717776000000,
  preSuds: 7,
  debriefSuds: 4,
  peakSuds: 8,
  hasLetter: true,
  reflectionSubmitted: false,
}

// Inline implementations of the AuthProvider MMKV helper logic
// (mirrors the functions defined inside AuthProvider, tested without React)
function setDebriefPending(mmkv: ReturnType<typeof makeMockMmkv>, userId: string, data: DebriefPendingData) {
  mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING(userId), JSON.stringify(data))
}

function clearDebriefPending(mmkv: ReturnType<typeof makeMockMmkv>, userId: string) {
  mmkv.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(userId))
}

function updateDebriefReflectionSubmitted(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): boolean {
  const raw = mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(userId))
  if (!raw) return false
  try {
    const data = JSON.parse(raw) as DebriefPendingData
    const updated = { ...data, reflectionSubmitted: true }
    mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING(userId), JSON.stringify(updated))
    return true
  } catch {
    mmkv.delete(KV_KEYS.SESSION_DEBRIEF_PENDING(userId))
    return false
  }
}

function hasSessionIntention(mmkv: ReturnType<typeof makeMockMmkv>, sessionId: string): boolean {
  const text = mmkv.getString(KV_KEYS.SESSION_INTENTION(sessionId))
  return !!(text && text.trim().length > 0)
}

function getSessionIntention(mmkv: ReturnType<typeof makeMockMmkv>, sessionId: string): string | null {
  return mmkv.getString(KV_KEYS.SESSION_INTENTION(sessionId)) ?? null
}

describe('setDebriefPending / clearDebriefPending', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('setDebriefPending writes JSON to MMKV under the user-scoped key', () => {
    setDebriefPending(mmkv, USER_ID, SAMPLE_DEBRIEF)
    const raw = mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))
    expect(raw).toBeDefined()
    expect(JSON.parse(raw!)).toEqual(SAMPLE_DEBRIEF)
  })

  it('setDebriefPending scopes key by userId', () => {
    setDebriefPending(mmkv, USER_ID, SAMPLE_DEBRIEF)
    expect(mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING('other-user'))).toBeUndefined()
  })

  it('clearDebriefPending removes the MMKV key', () => {
    setDebriefPending(mmkv, USER_ID, SAMPLE_DEBRIEF)
    clearDebriefPending(mmkv, USER_ID)
    expect(mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBeUndefined()
  })
})

describe('updateDebriefReflectionSubmitted', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('sets reflectionSubmitted: true on existing data', () => {
    setDebriefPending(mmkv, USER_ID, SAMPLE_DEBRIEF)
    updateDebriefReflectionSubmitted(mmkv, USER_ID)
    const raw = mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))
    expect(JSON.parse(raw!).reflectionSubmitted).toBe(true)
  })

  it('preserves all other fields when updating reflectionSubmitted', () => {
    setDebriefPending(mmkv, USER_ID, SAMPLE_DEBRIEF)
    updateDebriefReflectionSubmitted(mmkv, USER_ID)
    const raw = mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))
    const updated = JSON.parse(raw!)
    expect(updated.sessionId).toBe(SAMPLE_DEBRIEF.sessionId)
    expect(updated.peakSuds).toBe(SAMPLE_DEBRIEF.peakSuds)
  })

  it('handles missing key gracefully (returns false, no throw)', () => {
    const result = updateDebriefReflectionSubmitted(mmkv, USER_ID)
    expect(result).toBe(false)
  })

  it('handles corrupt JSON gracefully — deletes key and returns false', () => {
    mmkv.set(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID), 'not-valid-json{')
    const result = updateDebriefReflectionSubmitted(mmkv, USER_ID)
    expect(result).toBe(false)
    expect(mmkv.getString(KV_KEYS.SESSION_DEBRIEF_PENDING(USER_ID))).toBeUndefined()
  })
})

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
