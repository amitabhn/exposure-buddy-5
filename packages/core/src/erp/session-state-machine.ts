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

// ─── Hydration: deriving SessionState from persisted data (Story 9.2) ───────────
// This section is a projection/reconciliation concern, not part of the transition
// graph above — it derives an *initial* state from persisted data at cold-start
// and is never invoked from transition() itself.

// Window within which a GROUNDING_ACTIVE MMKV timestamp is treated as live. Long
// enough that a genuinely slow grounding session isn't auto-expired; short enough
// that a flag stuck by an abnormal exit (kill mid-grounding, crash) self-clears.
export const GROUNDING_STALENESS_WINDOW_MS = 12 * 60 * 1000 // 12 minutes

// Pure freshness check — explicit `now` parameter (no internal Date.now() call)
// so it's testable without wall-clock mocking.
export function isGroundingSignalFresh(groundingActiveAt: number | null, now: number): boolean {
  if (groundingActiveAt === null) return false
  return now - groundingActiveAt < GROUNDING_STALENESS_WINDOW_MS
}

// DB enum (exposure_sessions.status) — see "Vocabulary: two session-state
// representations" in the Story 9.2 Dev Notes for why this differs from SessionState.
export type PersistedSessionStatus = 'started' | 'completed' | 'abandoned'

// Derives a SessionState from persisted data at cold-start. `hasActiveGrounding`
// must already be the staleness-resolved boolean (via isGroundingSignalFresh) —
// this function performs no I/O and does not itself read the raw timestamp.
// idle/pre_session are not reachable outputs other than the no-row case: no DB
// status maps to pre_session, and a 'started' row always resolves to active or
// grounding, never idle.
export function deriveStateFromSession(
  dbStatus: PersistedSessionStatus | null,
  hasActiveGrounding: boolean,
): SessionState {
  if (dbStatus === null) return 'idle'
  if (dbStatus === 'completed') return 'completed'
  if (dbStatus === 'abandoned') return 'abandoned'
  // dbStatus === 'started'
  return hasActiveGrounding ? 'grounding' : 'active'
}
