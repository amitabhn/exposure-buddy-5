import { useEffect, useMemo, useState } from 'react'
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
// on-device: hasSynced flipped true while the watched query still showed zero rows), or after
// SYNC_WAIT_TIMEOUT_MS (offline / unreachable service — never trap the user).
// The caller must not route to onboarding until it is true: the host layout unmounts on that
// redirect, which would tear this query down before it could ever self-correct.
export const SYNC_WAIT_TIMEOUT_MS = 10_000

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
} {
  const { data, isLoading } = useQuery<FallbackRow>(QUERY, [enabled ? 1 : 0])
  const status = useStatus()
  const db = usePowerSync()
  const hasSynced = status?.hasSynced === true
  const [timedOut, setTimedOut] = useState(false)
  // null = not answered yet; a failed read stays null so the timeout still releases the hold.
  const [syncedHit, setSyncedHit] = useState<boolean | null>(null)

  useEffect(() => {
    if (!enabled || !hasSynced) {
      setSyncedHit(null)
      return
    }
    let cancelled = false
    db.getAll<FallbackRow>(SYNCED_CHECK_QUERY).then(
      (rows) => {
        if (!cancelled) setSyncedHit(rows.length > 0)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [enabled, hasSynced, db])

  useEffect(() => {
    if (!enabled) {
      setTimedOut(false)
      return
    }
    const id = setTimeout(() => setTimedOut(true), SYNC_WAIT_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [enabled])

  const hasExistingAccountData = useMemo(() => (data?.length ?? 0) > 0 || syncedHit === true, [data, syncedHit])
  const isDecided = hasExistingAccountData || timedOut || (hasSynced && syncedHit !== null)

  return { hasExistingAccountData, isLoading, isDecided }
}
