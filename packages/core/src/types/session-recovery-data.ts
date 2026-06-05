// ARC-001: zero imports from react-native, expo-*, or @supabase/*
// Serialised to MMKV under KV_KEYS.SESSION_IN_PROGRESS(userId) as JSON.
// Read via JSON.parse with try/catch; corrupt key = clear and ignore.
export interface SessionRecoveryData {
  sessionId: string
  fearItemId: string
  preSuds: number
  description: string
}
