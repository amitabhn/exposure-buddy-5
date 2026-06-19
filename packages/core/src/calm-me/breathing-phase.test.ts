import { describe, it, expect } from 'vitest'
import { advancePhase, PHASE_ORDER } from './breathing-phase'
import { BREATHING_PATTERN } from '../config/breathingCoach'

describe('advancePhase', () => {
  // ── AC #2 contract: GIVEN phase index n WHEN elapsed ticks reach the duration THEN phase advances to n+1 ──

  it('stays on inhale (0) before its 4000ms duration elapses', () => {
    const result = advancePhase(0, 3999, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 0, cycleCompleted: false })
  })

  it('advances inhale (0) → holdIn (1) exactly when elapsed reaches 4000ms', () => {
    const result = advancePhase(0, 4000, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 1, cycleCompleted: false })
  })

  it('advances holdIn (1) → exhale (2) at its duration boundary', () => {
    const result = advancePhase(1, 4000, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 2, cycleCompleted: false })
  })

  it('advances exhale (2) → holdOut (3) at its duration boundary', () => {
    const result = advancePhase(2, 4000, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 3, cycleCompleted: false })
  })

  it('wraps holdOut (3) → inhale (0) at its duration boundary and reports cycleCompleted', () => {
    const result = advancePhase(3, 4000, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 0, cycleCompleted: true })
  })

  it('does not report cycleCompleted for non-wrapping advances', () => {
    expect(advancePhase(0, 4000, BREATHING_PATTERN).cycleCompleted).toBe(false)
    expect(advancePhase(1, 4000, BREATHING_PATTERN).cycleCompleted).toBe(false)
    expect(advancePhase(2, 4000, BREATHING_PATTERN).cycleCompleted).toBe(false)
  })

  it('advances when elapsed overshoots the duration, not just on exact match', () => {
    const result = advancePhase(0, 4500, BREATHING_PATTERN)
    expect(result).toEqual({ phaseIndex: 1, cycleCompleted: false })
  })

  it('PHASE_ORDER matches the documented inhale→holdIn→exhale→holdOut sequence', () => {
    expect(PHASE_ORDER).toEqual(['inhale', 'holdIn', 'exhale', 'holdOut'])
  })
})
