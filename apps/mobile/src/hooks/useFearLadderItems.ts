import type { FearLadderItem } from '@exposure-buddy/core'

// PowerSync no-op stub — Epic 6 replaces with usePowerSyncQuery against fear_ladder_items table.
// Returns items sorted by position ascending.
export function useFearLadderItems(_userId: string | null): FearLadderItem[] {
  return []
}
