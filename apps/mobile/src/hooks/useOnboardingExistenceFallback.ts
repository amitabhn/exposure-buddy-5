import { useMemo } from 'react'
import { useQuery } from '@exposure-buddy/sync'

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
const QUERY = `
  SELECT id
  FROM fear_ladder_items
  WHERE ? = 1
  LIMIT 1
`

type FallbackRow = {
  id: string
}

export function useOnboardingExistenceFallback(enabled: boolean): {
  hasExistingAccountData: boolean
  isLoading: boolean
} {
  const { data, isLoading } = useQuery<FallbackRow>(QUERY, [enabled ? 1 : 0])

  const hasExistingAccountData = useMemo(() => (data?.length ?? 0) > 0, [data])

  return { hasExistingAccountData, isLoading }
}
