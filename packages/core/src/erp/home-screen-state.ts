// ARC-001: zero imports from react-native, expo-*, or @supabase/*
//
// Home screen state resolver (Story 5.6 — Issue #36).
// States 7 (post-exposure) and 8 (expired) were removed 2026-06-15.
// Epic 6 Story 6.2 will expand this function with the full HomeScreenContext
// signature and the 8-state machine defined in ADR-HOME-STATE-RESOLVE.
export type HomeDisplayState = 'default'

export function resolveHomeScreenState(): HomeDisplayState {
  return 'default'
}
