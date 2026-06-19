// ARC-011: zero imports from react-native, expo-*, or @supabase/*
// Pure phase-advance reducer — no timers, no React, no animation. Mirrors erp/session-state-machine.ts.
import type { BREATHING_PATTERN } from '../config/breathingCoach'

export const PHASE_ORDER = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const
export type BreathingPhaseName = (typeof PHASE_ORDER)[number]

export interface AdvancePhaseResult {
  phaseIndex: number
  cycleCompleted: boolean
}

// GIVEN phase index n WHEN elapsed ticks reach pattern[n]'s duration THEN phase advances to n+1,
// looping back to inhale (0) and reporting cycleCompleted on that wrap.
export function advancePhase(
  phaseIndex: number,
  elapsedMsInPhase: number,
  pattern: typeof BREATHING_PATTERN,
): AdvancePhaseResult {
  const currentPhaseName = PHASE_ORDER[phaseIndex % PHASE_ORDER.length]!
  const durationMs = pattern[currentPhaseName] * 1000

  if (elapsedMsInPhase < durationMs) {
    return { phaseIndex, cycleCompleted: false }
  }

  const nextPhaseIndex = (phaseIndex + 1) % PHASE_ORDER.length
  return { phaseIndex: nextPhaseIndex, cycleCompleted: nextPhaseIndex === 0 }
}
