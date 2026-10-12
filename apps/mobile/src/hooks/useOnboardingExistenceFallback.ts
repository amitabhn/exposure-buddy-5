import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useStatus, usePowerSync } from '@exposure-buddy/sync'

// Story 18.7 — reinstall onboarding-skip fallback. `isOnboardingComplete`
// (packages/supabase/src/auth/session.ts) lives only in on-device MMKV, so a reinstall wipes
// it and strands an existing account back in onboarding. This hook mirrors
// useActiveSessionRecoveryFallback.ts's pattern (ARC-005 boundary — @exposure-buddy/sync only,
// never @powersync/react-native directly from apps/mobile): a PowerSync-replica existence
// query for the user's fear_ladder_items rows. A hit means the account already completed
// onboarding elsewhere (the epic's own bar is "at least one courage-ladder item").
//
// `enabled` gates the query at the WHERE-clause level via a bound parameter, not by
// conditionally calling useQuery — hooks must be called unconditionally. Callers pass
// `!isLoading && isAuthenticated && !isOnboardingComplete && !isStorageDegraded`.
//
// No user_id filter — PowerSync sync-rule scoping already restricts the replica per-user
// (matches useActiveExposureSession.ts / useActiveSessionRecoveryFallback.ts precedent).
// No staleness cutoff — unlike 18.2's session recovery, there is no time dimension to
// "does this account have ladder data."
//
// `isDecided` tells the caller when "no rows" can be trusted. After a reinstall the replica is
// empty until PowerSync's first sync completes, so an empty result before that is NOT "new
// account". It becomes true on a hit, or once the first sync has completed AND an authoritative
// one-shot local read has answered (the reactive query lags the sync-complete signal — observed
// on-device: hasSynced flipped true while the watched query still showed zero rows).
// The caller must not route to onboarding until it is true: the host layout unmounts on that
// redirect, which would tear this query down before it could ever self-correct.
//
// Story 19.9: a timeout is NOT an answer. `isHoldExpired` turns true after SYNC_WAIT_TIMEOUT_MS
// so the caller can stop showing its spinner and release the user to Home, but `isDecided` stays
// false: only a hit, or a completed first sync with an authoritative local read, decides. A
// slow or dropped first sync therefore never sends an existing account through onboarding.
export const SYNC_WAIT_TIMEOUT_MS = 10_000

// Bounded retry for the post-sync local read. Exhaustion stays undecided (never falls back to
// the reactive query, which lags hasSynced). Each later sync checkpoint (lastSyncedAt change)
// re-arms up to this many attempts, so the worst case is READ_MAX_ATTEMPTS reads per checkpoint.
const READ_MAX_ATTEMPTS = 3
const READ_BACKOFF_MS = 250

const QUERY = `
  SELECT id
  FROM fear_ladder_items
  WHERE ? = 1
  LIMIT 1
`

// One-shot read run once the first sync completes; same table, no param needed.
const SYNCED_CHECK_QUERY = `
  SELECT id
  FROM fear_ladder_items
  LIMIT 1
`

type FallbackRow = {
  id: string
}

export function useOnboardingExistenceFallback(enabled: boolean): {
  hasExistingAccountData: boolean
  isLoading: boolean
  isDecided: boolean
  isHoldExpired: boolean
} {
  const { data, isLoading } = useQuery<FallbackRow>(QUERY, [enabled ? 1 : 0])
  const status = useStatus()
  const db = usePowerSync()
  const hasSynced = status?.hasSynced === true
  // Epoch ms of the latest completed sync checkpoint; a change re-arms the read retries.
  const lastSyncedAtMs = status?.lastSyncedAt instanceof Date ? status.lastSyncedAt.getTime() : null
  const [timedOut, setTimedOut] = useState(false)
  // null = not answered yet; a read that fails every attempt stays null (undecided).
  const [syncedHit, setSyncedHit] = useState<boolean | null>(null)
  const answeredRef = useRef(false)

  useEffect(() => {
    if (!enabled || !hasSynced) {
      answeredRef.current = false
      setSyncedHit(null)
      return
    }
    if (answeredRef.current) return
    let cancelled = false
    ;(async () => {
      for (let attempt = 0; attempt < READ_MAX_ATTEMPTS; attempt++) {
        try {
          const rows = await db.getAll<FallbackRow>(SYNCED_CHECK_QUERY)
          if (!cancelled) {
            answeredRef.current = true
            setSyncedHit(rows.length > 0)
          }
          return
        } catch {
          if (cancelled) return
          if (attempt < READ_MAX_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, READ_BACKOFF_MS * (attempt + 1)))
            if (cancelled) return
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, hasSynced, lastSyncedAtMs, db])

  useEffect(() => {
    if (!enabled) {
      setTimedOut(false)
      return
    }
    const id = setTimeout(() => setTimedOut(true), SYNC_WAIT_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [enabled])

  const hasExistingAccountData = useMemo(() => (data?.length ?? 0) > 0 || syncedHit === true, [data, syncedHit])
  const isDecided = hasExistingAccountData || (hasSynced && syncedHit !== null)

  return { hasExistingAccountData, isLoading, isDecided, isHoldExpired: timedOut }
}
