// ARC-001: zero imports from react-native, expo-*, or @supabase/*
//
// Home screen state resolver (Story 6.2-B).
// States 7 (post-exposure) and 8 (expired) were removed 2026-06-15 (Story 5.6).
// Full contract: ADR-HOME-STATE-RESOLVE.md. This story implements the MVP subset
// of the 8-state union — see the avoidance/return-after-gap notes below.
export type HomeScreenContext = {
  hasAccount: boolean
  hasLadder: boolean
  activeThread: {
    exists: boolean
    openCount: number
    openDurationHours: number
    userDeclaredIncomplete: boolean
  } | null
  gapDays: number
  ladderComplete: boolean
  nowMs: number
}

export type HomeScreenState =
  | 'first-use'
  | 'empty-ladder'
  | 'morning'
  | 'progressing'
  | 'avoidance'
  | 'mid-exposure'
  | 'return-after-gap'
  | 'completed'

export function resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState {
  if (!ctx.hasAccount) return 'first-use'
  if (ctx.ladderComplete) return 'completed'
  if (ctx.hasAccount && !ctx.hasLadder) return 'empty-ladder'
  // State 5 (avoidance detection) deferred post-MVP
  if (ctx.activeThread?.exists === true) return 'progressing'
  // State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3
  // mid-exposure (state 6) is never returned here — it is resolved by the
  // in-the-moment exposure session screen, not the home screen (ADR Consequences)
  return 'morning'
}
