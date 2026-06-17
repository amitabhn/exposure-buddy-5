import { useQuery } from '@exposure-buddy/sync'
import { useMemo } from 'react'

const QUERY = `
  SELECT id, fear_item_id, started_at
  FROM exposure_sessions
  WHERE status = 'started'
  ORDER BY started_at DESC
  LIMIT 1
`

type ExposureSessionRow = {
  id: string
  fear_item_id: string
  started_at: string
}

export type ActiveExposureSession = {
  id: string
  fearItemId: string
  startedAt: string
}

export function useActiveExposureSession(
  _userId: string | null,
): { activeSession: ActiveExposureSession | null; isLoading: boolean } {
  const { data, isLoading } = useQuery<ExposureSessionRow>(QUERY)
  const activeSession = useMemo<ActiveExposureSession | null>(() => {
    const row = data?.[0]
    if (!row) return null
    return { id: row.id, fearItemId: row.fear_item_id, startedAt: row.started_at }
  }, [data])
  return { activeSession, isLoading }
}
