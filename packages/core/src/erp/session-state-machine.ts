// ARC-001: zero imports from react-native, expo-*, or @supabase/*
import type { Result } from '../types/result'

export type SessionState =
  | 'idle'
  | 'pre_session'
  | 'active'
  | 'grounding'
  | 'completed'
  | 'abandoned'

// Event types use domain.verb convention (architecture naming rule).
export type SessionEvent =
  | { type: 'session.started' }
  | { type: 'exposure.begun' }
  | { type: 'exposure.stopped' }
  | { type: 'session.completed'; sudsReadingsCount: number }  // guard: count ≥ 1
  | { type: 'grounding.resumed' }
  | { type: 'grounding.stopped' }

type HandlerFn = (event: SessionEvent) => SessionState | null
type TransitionMap = Record<SessionState, Partial<Record<SessionEvent['type'], SessionState | HandlerFn>>>

const TRANSITIONS: TransitionMap = {
  idle:        { 'session.started': 'pre_session' },
  pre_session: { 'exposure.begun': 'active' },
  active: {
    'exposure.stopped': 'grounding',
    'session.completed': (e) => {
      const ev = e as Extract<SessionEvent, { type: 'session.completed' }>
      return ev.sudsReadingsCount >= 1 ? 'completed' : null
    },
  },
  grounding:  { 'grounding.resumed': 'active', 'grounding.stopped': 'abandoned' },
  completed:  {},
  abandoned:  {},
}

export function transition(
  currentState: SessionState,
  event: SessionEvent,
): Result<SessionState> {
  const handler = TRANSITIONS[currentState]?.[event.type]
  if (!handler) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `No transition from '${currentState}' on '${event.type}'`,
      },
    }
  }
  const nextState = typeof handler === 'function' ? handler(event) : handler
  if (!nextState) {
    return {
      ok: false,
      error: {
        code: 'TRANSITION_GUARD_FAILED',
        message: `Transition from '${currentState}' on '${event.type}' failed guard`,
      },
    }
  }
  return { ok: true, value: nextState }
}
