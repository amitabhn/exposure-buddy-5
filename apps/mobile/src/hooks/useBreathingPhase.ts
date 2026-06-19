import { useCallback, useEffect, useReducer, useRef } from 'react'
import { advancePhase, BREATHING_GUIDED_CYCLES, BREATHING_PATTERN, BREATHING_TIMER_SECONDS } from '@exposure-buddy/core'

const TICK_MS = 1000

type EndReason = 'timer' | 'early-exit' | null

interface BreathingState {
  phaseIndex: number
  cycleCount: number
  remainingSeconds: number
  phaseStartedAt: number
  phaseElapsedMs: number
  status: 'active' | 'ended'
  endReason: EndReason
}

type BreathingAction = { type: 'tick'; now: number; mountedAt: number } | { type: 'ready-press' }

// Both the per-second tick and the "I'm ready" tap go through this single reducer so the
// AC #7 tie-break (tap wins over a same-instant timer expiry) is a property of dispatch
// ordering rather than two independently-drifting code paths racing each other.
function reducer(state: BreathingState, action: BreathingAction): BreathingState {
  if (state.status === 'ended') return state

  switch (action.type) {
    case 'tick': {
      const elapsedSinceMount = action.now - action.mountedAt
      const remainingSeconds = Math.max(0, BREATHING_TIMER_SECONDS - Math.floor(elapsedSinceMount / 1000))
      const timerExpired = remainingSeconds <= 0

      const elapsedMsInPhase = action.now - state.phaseStartedAt
      const { phaseIndex: nextPhaseIndex, cycleCompleted } = advancePhase(state.phaseIndex, elapsedMsInPhase, BREATHING_PATTERN)
      const reachedBoundary = nextPhaseIndex !== state.phaseIndex

      // AC #6: timer hitting 0 mid-phase doesn't cut the ring — it only ends the session
      // at the next natural phase boundary, leaving the just-completed phase as the final frame.
      if (reachedBoundary && timerExpired) {
        // eslint-disable-next-line i18next/no-literal-string -- internal state machine values, not user-visible text
        return { ...state, remainingSeconds: 0, status: 'ended', endReason: 'timer' }
      }

      if (reachedBoundary) {
        return {
          ...state,
          phaseIndex: nextPhaseIndex,
          cycleCount: cycleCompleted ? state.cycleCount + 1 : state.cycleCount,
          remainingSeconds,
          phaseStartedAt: action.now,
          phaseElapsedMs: 0,
        }
      }

      return { ...state, remainingSeconds, phaseElapsedMs: elapsedMsInPhase }
    }
    case 'ready-press':
      // eslint-disable-next-line i18next/no-literal-string -- internal state machine values, not user-visible text
      return { ...state, status: 'ended', endReason: 'early-exit' }
    default:
      return state
  }
}

function createInitialState(mountedAt: number): BreathingState {
  return {
    phaseIndex: 0,
    cycleCount: 0,
    remainingSeconds: BREATHING_TIMER_SECONDS,
    phaseStartedAt: mountedAt,
    phaseElapsedMs: 0,
    // eslint-disable-next-line i18next/no-literal-string -- internal state machine value, not user-visible text
    status: 'active',
    endReason: null,
  }
}

export interface UseBreathingPhaseResult {
  phaseIndex: number
  isGuided: boolean
  remainingSeconds: number
  phaseElapsedMs: number
  sessionEnded: boolean
  endReason: EndReason
  onReadyPress: () => void
}

export function useBreathingPhase(): UseBreathingPhaseResult {
  const mountedAtRef = useRef(Date.now())
  const [state, dispatch] = useReducer(reducer, mountedAtRef.current, createInitialState)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const mountedAt = mountedAtRef.current
    const intervalId = setInterval(() => {
      dispatch({ type: 'tick', now: Date.now(), mountedAt })
    }, TICK_MS)
    return () => clearInterval(intervalId)
  }, [])

  // AC #7 tie-break guard: a tap arriving after expiry has already ended the session is a no-op,
  // not a second exit path.
  const onReadyPress = useCallback(() => {
    if (stateRef.current.status === 'ended') return
    dispatch({ type: 'ready-press' })
  }, [])

  return {
    phaseIndex: state.phaseIndex,
    isGuided: state.cycleCount < BREATHING_GUIDED_CYCLES,
    remainingSeconds: state.remainingSeconds,
    phaseElapsedMs: state.phaseElapsedMs,
    sessionEnded: state.status === 'ended',
    endReason: state.endReason,
    onReadyPress,
  }
}
