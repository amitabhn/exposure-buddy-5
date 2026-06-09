import { describe, it, expect } from 'vitest'
import {
  resolveHomeScreenState,
  formatTimeRemaining,
  POST_EXPOSURE_WINDOW_MS,
  type HomeDisplayState,
} from './home-screen-state'
import type { DebriefPendingData } from '../types/debrief-pending-data'

const BASE: DebriefPendingData = {
  sessionId: 'session-abc',
  fearItemId: 'item-xyz',
  completedAtMs: 1_000_000,
  preSuds: 6,
  debriefSuds: 4,
  peakSuds: 7,
  hasLetter: false,
  reflectionSubmitted: false,
}

const INSIDE_WINDOW = BASE.completedAtMs + 1_000                        // 1s after completion
const AT_BOUNDARY   = BASE.completedAtMs + POST_EXPOSURE_WINDOW_MS      // exactly at expiry
const OUTSIDE_WINDOW = BASE.completedAtMs + POST_EXPOSURE_WINDOW_MS + 1 // 1ms after expiry

describe('resolveHomeScreenState', () => {
  it('returns default when debriefPendingData is null', () => {
    expect(resolveHomeScreenState(null, INSIDE_WINDOW)).toBe<HomeDisplayState>('default')
  })

  it('returns post-exposure when window is open', () => {
    expect(resolveHomeScreenState(BASE, INSIDE_WINDOW)).toBe<HomeDisplayState>('post-exposure')
  })

  it('returns post-exposure at 1ms before window closes', () => {
    expect(resolveHomeScreenState(BASE, AT_BOUNDARY - 1)).toBe<HomeDisplayState>('post-exposure')
  })

  it('returns expired at exact window boundary when reflection not submitted', () => {
    expect(resolveHomeScreenState(BASE, AT_BOUNDARY)).toBe<HomeDisplayState>('expired')
  })

  it('returns expired when window closed and reflection not submitted', () => {
    expect(resolveHomeScreenState(BASE, OUTSIDE_WINDOW)).toBe<HomeDisplayState>('expired')
  })

  it('returns default when window closed and reflection submitted', () => {
    const data = { ...BASE, reflectionSubmitted: true }
    expect(resolveHomeScreenState(data, OUTSIDE_WINDOW)).toBe<HomeDisplayState>('default')
  })
})

describe('formatTimeRemaining', () => {
  it('returns empty string when window already expired', () => {
    expect(formatTimeRemaining(BASE.completedAtMs, OUTSIDE_WINDOW)).toBe('')
  })

  it('returns empty string at exact window boundary', () => {
    expect(formatTimeRemaining(BASE.completedAtMs, AT_BOUNDARY)).toBe('')
  })

  it('returns formatted hours and minutes within window', () => {
    // 2h 30m elapsed → 3h 30m remaining
    const elapsed = 2 * 60 * 60 * 1000 + 30 * 60 * 1000
    expect(formatTimeRemaining(0, elapsed)).toBe('3h 30m remaining')
  })

  it('returns 0h Nm remaining in the last hour', () => {
    const elapsed = POST_EXPOSURE_WINDOW_MS - 45 * 60 * 1000  // 45m left
    expect(formatTimeRemaining(0, elapsed)).toBe('0h 45m remaining')
  })

  it('returns 5h 59m remaining at 1 minute elapsed', () => {
    expect(formatTimeRemaining(0, 60 * 1000)).toBe('5h 59m remaining')
  })
})
