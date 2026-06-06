import type { SudsReading } from '@exposure-buddy/core'

// Row shape from database (snake_case) — mirrors the suds_readings table columns
export interface SudsReadingRow {
  id: string
  session_id: string
  suds_value: number
  recorded_at: string | null
}

export function toSudsReading(row: SudsReadingRow): SudsReading {
  return {
    id: row.id,
    sessionId: row.session_id,
    sudsValue: row.suds_value,
    recordedAt: row.recorded_at ?? new Date(0).toISOString(),
  }
}

export function fromSudsReading(reading: SudsReading): SudsReadingRow {
  return {
    id: reading.id,
    session_id: reading.sessionId,
    suds_value: reading.sudsValue,
    recorded_at: reading.recordedAt,
  }
}
