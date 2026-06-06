// ARC-001: zero imports from react-native, expo-*, or @supabase/*
export interface SudsReading {
  id: string
  sessionId: string
  sudsValue: number  // 0–10 integer
  recordedAt: string // ISO 8601 UTC
}
