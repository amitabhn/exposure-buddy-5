// ARC-001: zero imports from react-native, expo-*, or @supabase/*
import type { DebriefPendingData } from '../types/debrief-pending-data'

// 6-hour post-exposure window. Client-side proxy until Epic 6 wires server expires_at via PowerSync.
// Also used in apps/mobile/app/session/debrief.tsx — import from here to avoid duplication.
export const POST_EXPOSURE_WINDOW_MS = 6 * 60 * 60 * 1000

export type HomeDisplayState = 'default' | 'post-exposure' | 'expired'

/**
 * Resolves home screen display state for the post-exposure window (states 7 and 8).
 * nowMs is injectable for deterministic testing; defaults to Date.now().
 * Epic 6: replace completedAtMs+window proxy with PowerSync expires_at and extract
 * full 10-state resolveHomeScreenState() including states 3 and 4.
 */
export function resolveHomeScreenState(
  debriefPendingData: DebriefPendingData | null,
  nowMs: number = Date.now(),
): HomeDisplayState {
  if (!debriefPendingData) return 'default'
  const windowExpiry = debriefPendingData.completedAtMs + POST_EXPOSURE_WINDOW_MS
  if (nowMs < windowExpiry) return 'post-exposure'           // state 7: window open
  if (!debriefPendingData.reflectionSubmitted) return 'expired'  // state 8: late debrief
  return 'default'  // reflection done + window expired → fall through to state 3
}

/**
 * Formats the remaining time in the post-exposure window as a human-readable string.
 * Returns '' when the window has already closed.
 * nowMs is injectable for deterministic testing; defaults to Date.now().
 * Epic 6: replace with Intl.DateTimeFormat for locale-aware formatting.
 */
export function formatTimeRemaining(
  completedAtMs: number,
  nowMs: number = Date.now(),
): string {
  const remaining = completedAtMs + POST_EXPOSURE_WINDOW_MS - nowMs
  if (remaining <= 0) return ''
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000)
  return `${hours}h ${minutes}m remaining`  // Display only — server expires_at is authoritative
}
