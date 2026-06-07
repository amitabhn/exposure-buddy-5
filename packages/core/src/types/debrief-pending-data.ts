// ARC-001: zero imports from react-native, expo-*, or @supabase/*
export interface DebriefPendingData {
  sessionId: string
  fearItemId: string | null
  completedAtMs: number        // Date.now() at session completion (client-computed window start)
  preSuds: number              // pre-exposure SUDS (from intent.tsx)
  debriefSuds: number          // exit/debrief SUDS collected in active.tsx completion modal
  peakSuds: number             // max(preSuds, all mid-session logs, debriefSuds) — computed in active.tsx
  hasLetter: boolean           // true if SESSION_INTENTION(sessionId) was set in intent.tsx
  reflectionSubmitted: boolean // true after debrief.tsx submits post_session_reflection
}
