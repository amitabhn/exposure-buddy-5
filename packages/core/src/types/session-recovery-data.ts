// ARC-001: zero imports from react-native, expo-*, or @supabase/*
// Serialised to MMKV under KV_KEYS.SESSION_IN_PROGRESS(userId) as JSON.
// Read via JSON.parse with try/catch; corrupt key = clear and ignore.
export interface SessionRecoveryData {
  sessionId: string
  fearItemId: string | null
  preSuds: number
  description: string
  // ISO timestamp matching exposure_sessions.started_at's shape. Optional — pre-Story-18.2
  // MMKV blobs written before this field existed won't have it. Checked against
  // isSessionRecoveryFresh's 24h staleness window (Story 18.2) by both the local MMKV
  // hydration path and the cross-device PowerSync fallback query.
  startedAt?: string
}
