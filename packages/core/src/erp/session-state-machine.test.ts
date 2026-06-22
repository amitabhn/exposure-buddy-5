import { describe, it, expect } from 'vitest'
import {
  transition,
  deriveStateFromSession,
  isGroundingSignalFresh,
  GROUNDING_STALENESS_WINDOW_MS,
} from './session-state-machine'
import type { SessionState } from './session-state-machine'

describe('SessionStateMachine', () => {
  // ── Legal transitions ───────────────────────────────────────────────────────

  it('idle → pre_session on session.started', () => {
    const result = transition('idle', { type: 'session.started' })
    expect(result).toEqual({ ok: true, value: 'pre_session' })
  })

  it('pre_session → active on exposure.begun', () => {
    const result = transition('pre_session', { type: 'exposure.begun' })
    expect(result).toEqual({ ok: true, value: 'active' })
  })

  it('active → grounding on exposure.stopped', () => {
    const result = transition('active', { type: 'exposure.stopped' })
    expect(result).toEqual({ ok: true, value: 'grounding' })
  })

  it('active → completed on session.completed with sudsReadingsCount >= 1', () => {
    const result = transition('active', { type: 'session.completed', sudsReadingsCount: 1 })
    expect(result).toEqual({ ok: true, value: 'completed' })
  })

  it('active → completed on session.completed with sudsReadingsCount = 5', () => {
    const result = transition('active', { type: 'session.completed', sudsReadingsCount: 5 })
    expect(result).toEqual({ ok: true, value: 'completed' })
  })

  it('grounding → active on grounding.resumed', () => {
    const result = transition('grounding', { type: 'grounding.resumed' })
    expect(result).toEqual({ ok: true, value: 'active' })
  })

  it('grounding → abandoned on grounding.stopped', () => {
    const result = transition('grounding', { type: 'grounding.stopped' })
    expect(result).toEqual({ ok: true, value: 'abandoned' })
  })

  // ── Guard failure ───────────────────────────────────────────────────────────

  it('active → completed fails guard when sudsReadingsCount = 0', () => {
    const result = transition('active', { type: 'session.completed', sudsReadingsCount: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('TRANSITION_GUARD_FAILED')
    }
  })

  // ── Illegal transitions ─────────────────────────────────────────────────────

  it('idle → active is illegal (missing pre_session step)', () => {
    const result = transition('idle', { type: 'exposure.begun' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('idle → grounding is illegal', () => {
    const result = transition('idle', { type: 'exposure.stopped' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('pre_session → grounding is illegal', () => {
    const result = transition('pre_session', { type: 'exposure.stopped' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('active → idle is illegal', () => {
    const result = transition('active', { type: 'session.started' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('completed → any event is illegal', () => {
    const states: SessionState[] = ['completed']
    for (const state of states) {
      expect(transition(state, { type: 'session.started' }).ok).toBe(false)
      expect(transition(state, { type: 'exposure.begun' }).ok).toBe(false)
      expect(transition(state, { type: 'grounding.resumed' }).ok).toBe(false)
    }
  })

  it('abandoned → any event is illegal', () => {
    const states: SessionState[] = ['abandoned']
    for (const state of states) {
      expect(transition(state, { type: 'session.started' }).ok).toBe(false)
      expect(transition(state, { type: 'exposure.stopped' }).ok).toBe(false)
      expect(transition(state, { type: 'grounding.resumed' }).ok).toBe(false)
    }
  })

  it('grounding → pre_session is illegal (no valid event leads there)', () => {
    const result = transition('grounding', { type: 'session.started' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('grounding.resumed from active is illegal', () => {
    const result = transition('active', { type: 'grounding.resumed' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('grounding.stopped from active is illegal', () => {
    const result = transition('active', { type: 'grounding.stopped' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('grounding.resumed from pre_session is illegal', () => {
    const result = transition('pre_session', { type: 'grounding.resumed' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('grounding.stopped from pre_session is illegal', () => {
    const result = transition('pre_session', { type: 'grounding.stopped' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TRANSITION')
    }
  })

  it('error message includes current state and event type', () => {
    const result = transition('idle', { type: 'grounding.stopped' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('idle')
      expect(result.error.message).toContain('grounding.stopped')
    }
  })
})

// ── deriveStateFromSession (Story 9.2, Task 2.2) ────────────────────────────────

describe('deriveStateFromSession', () => {
  it('no row (null dbStatus) → idle', () => {
    expect(deriveStateFromSession(null, false)).toBe('idle')
    expect(deriveStateFromSession(null, true)).toBe('idle')
  })

  it("dbStatus 'started' with no active grounding → active", () => {
    expect(deriveStateFromSession('started', false)).toBe('active')
  })

  it("dbStatus 'started' with active grounding → grounding", () => {
    expect(deriveStateFromSession('started', true)).toBe('grounding')
  })

  it("dbStatus 'completed' → completed, regardless of grounding flag", () => {
    expect(deriveStateFromSession('completed', false)).toBe('completed')
    expect(deriveStateFromSession('completed', true)).toBe('completed')
  })

  it("dbStatus 'abandoned' → abandoned, regardless of grounding flag", () => {
    expect(deriveStateFromSession('abandoned', false)).toBe('abandoned')
    expect(deriveStateFromSession('abandoned', true)).toBe('abandoned')
  })
})

// ── isGroundingSignalFresh (Story 9.2, Task 2.4) ─────────────────────────────────

describe('isGroundingSignalFresh', () => {
  const NOW = 1_750_000_000_000 // arbitrary fixed epoch-ms instant

  it('returns false when groundingActiveAt is null (no signal at all)', () => {
    expect(isGroundingSignalFresh(null, NOW)).toBe(false)
  })

  it('returns true for a fresh timestamp (just now)', () => {
    expect(isGroundingSignalFresh(NOW, NOW)).toBe(true)
  })

  it('returns true for a timestamp inside the staleness window', () => {
    const groundingActiveAt = NOW - (GROUNDING_STALENESS_WINDOW_MS - 1)
    expect(isGroundingSignalFresh(groundingActiveAt, NOW)).toBe(true)
  })

  it('returns false for a timestamp exactly at the staleness window boundary', () => {
    const groundingActiveAt = NOW - GROUNDING_STALENESS_WINDOW_MS
    expect(isGroundingSignalFresh(groundingActiveAt, NOW)).toBe(false)
  })

  it('returns false for a timestamp past the staleness window (stale)', () => {
    const groundingActiveAt = NOW - (GROUNDING_STALENESS_WINDOW_MS + 1)
    expect(isGroundingSignalFresh(groundingActiveAt, NOW)).toBe(false)
  })
})
