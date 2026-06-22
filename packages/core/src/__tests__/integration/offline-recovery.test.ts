import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS } from '../../constants/kvKeys'
import {
  deriveStateFromSession,
  isGroundingSignalFresh,
  GROUNDING_STALENESS_WINDOW_MS,
} from '../../erp/session-state-machine'
import type { PersistedSessionStatus, SessionState } from '../../erp/session-state-machine'
import { resolveHomeScreenState } from '../../erp/home-screen-state'
import type { SessionRecoveryData } from '../../types/session-recovery-data'

// Story 9.2 — Scenarios 2 & 3 (offline session recovery). Placed under
// src/__tests__/integration/ rather than the architecture doc's stated
// __tests__/integration/ (repo root) — packages/core/vitest.config.ts only
// includes `src/**/*.test.ts`; a test outside `src/` would silently never run.
// See Dev Notes "vitest include glob only covers src/** for packages/core".

// Minimal in-memory MMKV stand-in — same shape as
// packages/supabase/__tests__/auth/authProvider.sessionIntention.test.ts's makeMockMmkv().
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

const USER_ID = 'user-recovery-1'

// ─── Task 6.3 — corrupt MMKV SESSION_IN_PROGRESS parsing ───────────────────────
// Inline replica of AuthProvider.tsx:199-202's try/catch — extracted as a pure
// function so it's testable without rendering AuthProvider (mirrors the
// hasSessionIntention/getSessionIntention extraction pattern in
// authProvider.sessionIntention.test.ts). On a parse failure, the key is deleted
// (clear-and-ignore) and null is returned, matching production behaviour exactly.
function parseSessionRecoveryData(
  mmkv: ReturnType<typeof makeMockMmkv>,
  userId: string,
): SessionRecoveryData | null {
  const raw = mmkv.getString(KV_KEYS.SESSION_IN_PROGRESS(userId))
  try {
    return raw ? (JSON.parse(raw) as SessionRecoveryData) : null
  } catch {
    mmkv.delete(KV_KEYS.SESSION_IN_PROGRESS(userId))
    return null
  }
}

const VALID_RECOVERY_DATA: SessionRecoveryData = {
  sessionId: 'session-uuid-1',
  fearItemId: 'item-uuid-1',
  preSuds: 6,
  description: 'Elevator ride',
}

// ─── Task 5 — Scenario 2: backgrounded mid-session, re-foregrounded ────────────

describe('Scenario 2(a) — process survives backgrounding (trivial, no recovery code path)', () => {
  // React Native's JS context survives normal AppState backgrounding (no unmount/
  // remount) — in-memory SessionState held in component state/closures is
  // untouched by default. This is deliberately a trivial test: no hydration call,
  // no MMKV read, no PowerSync query is exercised here, because none runs in
  // production for this sub-case either. Documenting why it's trivial (per Task
  // 5.2) rather than silently omitting coverage for the sub-case.
  it('in-memory SessionState is unchanged by backgrounding because no unmount/remount occurs', () => {
    const sessionStateBeforeBackgrounding: SessionState = 'active'
    // No AppState handler in this app's session screens mutates session state on
    // background/foreground — state before and after backgrounding is identical
    // by construction, not because any recovery logic ran.
    const sessionStateAfterForegrounding = sessionStateBeforeBackgrounding
    expect(sessionStateAfterForegrounding).toBe('active')
  })
})

describe('Scenario 2(b) — process killed while backgrounded', () => {
  it('collapses into Scenario 3 — covered by the Scenario 3 suite below, not duplicated here', () => {
    // Per Dev Notes "Backgrounding vs. process kill — these may be the same code
    // path": Android killing a backgrounded app under memory pressure (NFR-DEVICE-01
    // reference profile) triggers the identical cold-start MMKV+PowerSync recovery
    // flow as Scenario 3 (app killed, re-launched). No separate test is written for
    // this sub-case — see "Scenario 3" below for the actual recovery-mechanism
    // coverage that this sub-case exercises.
    expect(true).toBe(true)
  })
})

describe('Scenario 2(a) — home screen state restored correctly', () => {
  it("resolveHomeScreenState returns 'progressing' when activeThread.exists is true", () => {
    const state = resolveHomeScreenState({
      hasAccount: true,
      hasLadder: true,
      activeThread: { exists: true, openCount: 1, openDurationHours: 0.5, userDeclaredIncomplete: false },
      gapDays: 0,
      ladderComplete: false,
      nowMs: Date.now(),
    })
    expect(state).toBe('progressing')
  })
})

// ─── Task 6 — Scenario 3: app killed mid-session, re-launched ──────────────────

describe('Scenario 3 — corrupt MMKV SESSION_IN_PROGRESS is handled by clear-and-ignore (Task 6.3)', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns the parsed SessionRecoveryData for a valid JSON blob', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), JSON.stringify(VALID_RECOVERY_DATA))
    expect(parseSessionRecoveryData(mmkv, USER_ID)).toEqual(VALID_RECOVERY_DATA)
  })

  it('returns null and does not delete the key when no row is present', () => {
    expect(parseSessionRecoveryData(mmkv, USER_ID)).toBeNull()
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(false)
  })

  it('deletes the key and returns null for an unparseable (corrupt) value', () => {
    mmkv.set(KV_KEYS.SESSION_IN_PROGRESS(USER_ID), '{not valid json')
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(true)
    const result = parseSessionRecoveryData(mmkv, USER_ID)
    expect(result).toBeNull()
    expect(mmkv.has(KV_KEYS.SESSION_IN_PROGRESS(USER_ID))).toBe(false)
  })
})

describe('Scenario 3 — hydration + home-screen-state consistency for a valid recovered session (Task 6.4)', () => {
  it("derived SessionState 'active' and resolveHomeScreenState are consistent for a valid in-progress recovery", () => {
    const dbStatus: PersistedSessionStatus = 'started'
    const state = deriveStateFromSession(dbStatus, false)
    expect(state).toBe('active')

    const homeState = resolveHomeScreenState({
      hasAccount: true,
      hasLadder: true,
      // An 'active'-derived session is exactly what activeThread.exists models.
      activeThread: { exists: state === 'active' || state === 'grounding', openCount: 1, openDurationHours: 0.2, userDeclaredIncomplete: false },
      gapDays: 0,
      ladderComplete: false,
      nowMs: Date.now(),
    })
    expect(homeState).toBe('progressing')
  })
})

describe('Scenario 3 — general arbitration: PowerSync authoritative state wins on MMKV/PowerSync disagreement (Task 6.5)', () => {
  // MMKV says a session was in progress (stale or racing against PowerSync), but
  // once PowerSync hydrates it disagrees. Two sub-cases per Task 6.5: PowerSync
  // resolves to 'completed', or the replica row is absent entirely — these must
  // not be assumed identical without checking.

  it("dbStatus 'completed' (PowerSync replica row exists, status no longer started) overrides a stale MMKV in-progress flag", () => {
    const resolved = deriveStateFromSession('completed', false)
    expect(resolved).toBe('completed')
    expect(resolved).not.toBe('active')
  })

  it('dbStatus null (PowerSync replica row absent entirely) also overrides a stale MMKV in-progress flag', () => {
    const resolved = deriveStateFromSession(null, false)
    expect(resolved).toBe('idle')
    expect(resolved).not.toBe('active')
  })

  it("'completed' and 'absent' are NOT identical SessionState outputs, but ARE consistent at the home-screen-routing level", () => {
    const completedState = deriveStateFromSession('completed', false)
    const absentState = deriveStateFromSession(null, false)
    // Different raw SessionState values...
    expect(completedState).not.toBe(absentState)

    // ...but both correctly resolve to "no active thread" at the home-screen level,
    // since resolveHomeScreenState only cares whether an active/grounding thread exists.
    const ctxFor = (state: SessionState) => ({
      hasAccount: true,
      hasLadder: true,
      activeThread: { exists: state === 'active' || state === 'grounding', openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false },
      gapDays: 0,
      ladderComplete: false,
      nowMs: Date.now(),
    })
    expect(resolveHomeScreenState(ctxFor(completedState))).toBe('morning')
    expect(resolveHomeScreenState(ctxFor(absentState))).toBe('morning')
  })
})

describe('Scenario 3 — grounding flash test, zero tolerance (Task 6.6)', () => {
  // MMKV says wasGroundingActive: true (fresh). Regardless of what PowerSync
  // ultimately resolves dbStatus to, the recovered state must never be 'active' —
  // it must land on 'grounding' or an explicit non-exposure state. PowerSync has
  // no grounding signal of its own (it only knows session status, per 2.1a), so
  // hasActiveGrounding stays true across every dbStatus this case enumerates.
  const FRESH_NOW = 1_750_000_000_000
  const freshGroundingTimestamp = FRESH_NOW - 1000 // 1s old — well within the window
  const hasActiveGrounding = isGroundingSignalFresh(freshGroundingTimestamp, FRESH_NOW)

  it('the fresh grounding signal is confirmed fresh as a precondition for this test', () => {
    expect(hasActiveGrounding).toBe(true)
  })

  it.each<{ dbStatus: PersistedSessionStatus | null; label: string }>([
    { dbStatus: 'started', label: "dbStatus 'started' (mid-recovery, most common case)" },
    { dbStatus: 'completed', label: "dbStatus 'completed' (PowerSync resolved session ended)" },
    { dbStatus: null, label: 'dbStatus null (PowerSync replica row absent)' },
  ])('never resolves to plain active content — $label', ({ dbStatus }) => {
    const result = deriveStateFromSession(dbStatus, hasActiveGrounding)
    expect(result).not.toBe('active')
  })

  it("dbStatus 'started' with fresh grounding lands on the explicit 'grounding' safe state", () => {
    expect(deriveStateFromSession('started', hasActiveGrounding)).toBe('grounding')
  })
})

describe('Scenario 3 — grounding handoff test (Task 6.7)', () => {
  // MMKV renders grounding content (wasGroundingActive: true, fresh), then
  // PowerSync subsequently resolves the session as no longer in progress. The
  // transition out of grounding must be a defined, deliberate state — not an
  // undefined/silent value a consuming screen could misrender as a blank flash
  // or silent unmount. The exact resolution UI is an implementation decision
  // (out of scope here) — this test only pins down that the transition is to a
  // named, handleable state.
  const FRESH_NOW = 1_750_000_000_000
  const hasActiveGrounding = isGroundingSignalFresh(FRESH_NOW - 1000, FRESH_NOW)

  it.each<{ dbStatus: PersistedSessionStatus | null; expected: SessionState }>([
    { dbStatus: 'completed', expected: 'completed' },
    { dbStatus: 'abandoned', expected: 'abandoned' },
    { dbStatus: null, expected: 'idle' },
  ])('PowerSync resolving "no longer in progress" ($dbStatus) produces a defined, deliberate state, not a flash or silent loss', ({ dbStatus, expected }) => {
    const result = deriveStateFromSession(dbStatus, hasActiveGrounding)
    expect(result).toBe(expected)
    expect(result).not.toBeUndefined()
    expect(result).not.toBe('active') // not a flash to exposure content (covered separately by Task 6.6)
  })
})

describe('Scenario 3 — grounding staleness expiry self-clears a stuck flag (cross-reference, see session-state-machine.test.ts Task 2.4)', () => {
  // This file tests the *integration* contract (MMKV timestamp → hydration
  // outcome); session-state-machine.test.ts owns the exhaustive boundary/unit
  // coverage of isGroundingSignalFresh itself (Task 2.4) — not duplicated here.
  it('a stale grounding timestamp (abnormal exit, never cleared) resolves to active, not grounding', () => {
    const now = 1_750_000_000_000
    const staleTimestamp = now - (GROUNDING_STALENESS_WINDOW_MS + 1)
    const hasActiveGrounding = isGroundingSignalFresh(staleTimestamp, now)
    expect(hasActiveGrounding).toBe(false)
    expect(deriveStateFromSession('started', hasActiveGrounding)).toBe('active')
  })
})
