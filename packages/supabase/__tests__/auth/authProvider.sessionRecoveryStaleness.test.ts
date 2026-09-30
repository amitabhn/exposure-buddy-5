import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS, isSessionRecoveryFresh } from '@exposure-buddy/core'
import type { SessionRecoveryData } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — matches the subset used by AuthProvider helpers,
// same pattern as authProvider.sessionIntention.test.ts / authProvider.groundingSignal.test.ts.
function makeMockMmkv() {
  const store = new Map<string, string>()
  return {
    getString: (key: string) => store.get(key),
    set: (key: string, value: string) => store.set(key, value),
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
  }
}

const USER_ID = 'user-story-18-2'

// Replica of AuthProvider.tsx's SIGNED_IN hydration read for SESSION_IN_PROGRESS (Story 18.2
// staleness addition) — same "inline replica" convention as the other AuthProvider read-path
// tests in this directory, exercising the real isSessionRecoveryFresh from @exposure-buddy/core.
function hydrateSessionRecovery(
  mmkv: ReturnType<typeof makeMockMmkv>,
  userId: string,
  now: number
): SessionRecoveryData | null {
  try {
    const raw = mmkv.getString(KV_KEYS.SESSION_IN_PROGRESS(userId))
    const parsed = raw ? (JSON.parse(raw) as SessionRecoveryData) : null
    if (parsed && !isSessionRecoveryFresh(parsed.startedAt, now)) {
      mmkv.delete(KV_KEYS.SESSION_IN_PROGRESS(userId))
      return null
    }
    return parsed
  } catch {
    mmkv.delete(KV_KEYS.SESSION_IN_PROGRESS(userId))
    return null
  }
}

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const FRESH_RECORD: SessionRecoveryData = {
  sessionId: 'session-1',
  fearItemId: 'item-1',
  preSuds: 5,
  description: 'Test situation',
  startedAt: new Date(NOW - 60 * 60 * 1000).toISOString(), // 1h ago
}
const STALE_RECORD: SessionRecoveryData = {
  ...FRESH_RECORD,
  sessionId: 'session-2',
  startedAt: new Date(NOW - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
}

describe('AuthProvider local-hydration — session recovery 24h staleness (Story 18.2)', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('hydrates a fresh (<24h) record normally', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), JSON.stringify(FRESH_RECORD))
    const result = hydrateSessionRecovery(mmkv, USER_ID, NOW)
    expect(result).toEqual(FRESH_RECORD)
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(true)
  })

  it('treats a stale (>=24h) record as absent — returns null', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), JSON.stringify(STALE_RECORD))
    const result = hydrateSessionRecovery(mmkv, USER_ID, NOW)
    expect(result).toBeNull()
  })

  it('clears the stale MMKV key (mirrors corrupt-JSON handling at the same site)', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), JSON.stringify(STALE_RECORD))
    hydrateSessionRecovery(mmkv, USER_ID, NOW)
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(false)
  })

  it('treats a pre-Story-18.2 record with no startedAt as fresh (nothing to judge staleness against)', () => {
    const legacyRecord = { sessionId: 's3', fearItemId: null, preSuds: 4, description: '' }
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), JSON.stringify(legacyRecord))
    const result = hydrateSessionRecovery(mmkv, USER_ID, NOW)
    expect(result).toEqual(legacyRecord)
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(true)
  })

  it('returns null when no record is stored at all', () => {
    expect(hydrateSessionRecovery(mmkv, USER_ID, NOW)).toBeNull()
  })

  it('still clears and ignores corrupt JSON (pre-existing behavior, unaffected by staleness addition)', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), '{not valid json')
    const result = hydrateSessionRecovery(mmkv, USER_ID, NOW)
    expect(result).toBeNull()
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(false)
  })
})
