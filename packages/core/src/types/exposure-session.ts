// ARC-001: zero imports from react-native, expo-*, or @supabase/*
export interface ExposureSession {
  id: string
  userId: string
  fearItemId: string | null
  sessionType: 'erp'
  status: 'started' | 'completed' | 'abandoned'
  preSessionIntention: string | null
  postSessionReflection: string | null
  startedAt: string        // ISO 8601 UTC
  endedAt: string | null   // ISO 8601 UTC; always in enqueue on end
  expiresAt: number | null // epoch ms; server-set only
  createdAt: string
}
