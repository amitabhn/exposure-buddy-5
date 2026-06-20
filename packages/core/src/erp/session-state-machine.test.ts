import { describe, it, expect } from 'vitest'
import { transition } from './session-state-machine'
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
