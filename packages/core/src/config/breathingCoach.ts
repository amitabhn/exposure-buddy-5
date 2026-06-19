// ARC-011: zero imports from react-native, expo-*, or @supabase/*
export const BREATHING_GUIDED_CYCLES = 2
export const BREATHING_TIMER_SECONDS = 300 // total session duration from first inhale, guided + passive
export const BREATHING_PATTERN = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } as const
// Post-MVP: technique selection (4-7-8, diaphragmatic) and user-configurable timer/cycles
