import { useMemo } from 'react'
import { useQuery } from '@exposure-buddy/sync'
import type { SessionRecoveryData } from '@exposure-buddy/core'
import { SESSION_RECOVERY_STALENESS_WINDOW_MS } from '@exposure-buddy/core'

// Story 18.2 — cross-device / reinstall session-recovery fallback. Closes the gap where
// session-recovery detection reads only device-local MMKV: a reinstall, device switch, or
// cleared storage silently strands an in-progress exposure_sessions row the backend still
// considers 'started'. Mirrors useActiveExposureSession.ts's query pattern (ARC-005 boundary
// — @exposure-buddy/sync only, never @powersync/react-native directly from apps/mobile).
//
// `enabled` gates the query at the WHERE-clause level via a bound parameter, not by
// conditionally calling useQuery — hooks must be called unconditionally. Callers pass
// `!isLoading && isAuthenticated && sessionRecoveryData === null` (per AuthProvider state).
//
// The 24h staleness cutoff is recomputed from Date.now() on every call — no useMemo/empty-deps
// caching — because this hook's host, (app)/_layout.tsx, stays mounted for the app's whole
// foreground lifetime rather than remounting per cold start; a mount-time-only cutoff would
// silently drift further into the past the longer the app session runs.
const QUERY = `
  SELECT
    es.id as id,
    es.fear_item_id as fear_item_id,
    es.started_at as started_at,
    fli.description as description,
    (
      SELECT sr.suds_value
      FROM suds_readings sr
      WHERE sr.session_id = es.id
      ORDER BY sr.recorded_at ASC, sr.id ASC
      LIMIT 1
    ) as pre_suds
  FROM exposure_sessions es
  LEFT JOIN fear_ladder_items fli ON fli.id = es.fear_item_id
  WHERE es.status = 'started'
    AND es.started_at > ?
    AND ? = 1
  ORDER BY es.started_at DESC, es.id DESC
  LIMIT 1
`

type FallbackRow = {
  id: string
  fear_item_id: string | null
  started_at: string
  description: string | null
  pre_suds: number | null
}

export function useActiveSessionRecoveryFallback(enabled: boolean): {
  fallbackRecovery: SessionRecoveryData | null
  isLoading: boolean
} {
  const cutoffIso = new Date(Date.now() - SESSION_RECOVERY_STALENESS_WINDOW_MS).toISOString()
  const { data, isLoading } = useQuery<FallbackRow>(QUERY, [cutoffIso, enabled ? 1 : 0])

  const fallbackRecovery = useMemo<SessionRecoveryData | null>(() => {
    const row = data?.[0]
    if (!row) return null
    return {
      sessionId: row.id,
      fearItemId: row.fear_item_id,
      preSuds: row.pre_suds ?? 0,
      description: row.description ?? '',
      startedAt: row.started_at,
    }
  }, [data])

  return { fallbackRecovery, isLoading }
}
