import { useQuery } from '@exposure-buddy/sync'
import { useMemo } from 'react'
import type { FearLadderItem, FearLadderItemStatus } from '@exposure-buddy/core'

const QUERY = `
  SELECT id, description, predicted_suds, peak_suds, position, status
  FROM fear_ladder_items
  ORDER BY position ASC, id ASC
`

type FearLadderRow = {
  id: string
  description: string
  predicted_suds: number
  peak_suds: number | null   // PowerSync integer columns are nullable
  position: number
  status: string
}

const VALID_STATUSES = new Set<FearLadderItemStatus>(['pending', 'completed'])

function isFearLadderItemStatus(s: string): s is FearLadderItemStatus {
  return VALID_STATUSES.has(s as FearLadderItemStatus)
}

export function useFearLadderItems(
  _userId: string | null,
): { items: FearLadderItem[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<FearLadderRow>(QUERY)
  const items = useMemo<FearLadderItem[]>(
    () => (data ?? [])
      .filter(row => {
        if (!isFearLadderItemStatus(row.status)) {
          // Legacy 'in_progress' or any other unexpected value — filter out and warn.
          // AC 8 keeps the in_progress branch in ladder.tsx defensively; this hook
          // now refuses to surface such rows so downstream type narrowing is sound.
          console.warn('[useFearLadderItems] filtering row with unexpected status:', row.status, row.id)
          return false
        }
        return true
      })
      .map(row => ({
        id: row.id,
        description: row.description,
        predictedSuds: row.predicted_suds,
        peakSuds: row.peak_suds,
        position: row.position,
        status: row.status as FearLadderItemStatus,  // narrowed by the filter above
      })),
    [data],
  )
  return { items, isLoading }
}
