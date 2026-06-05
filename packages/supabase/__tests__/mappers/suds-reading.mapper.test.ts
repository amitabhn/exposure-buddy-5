import { describe, it, expect } from 'vitest'
import { toSudsReading, fromSudsReading, type SudsReadingRow } from '../../src/mappers/suds-reading.mapper'

const ROW: SudsReadingRow = {
  id: 'reading-uuid-1',
  session_id: 'session-uuid-1',
  suds_value: 7,
  recorded_at: '2026-01-01T10:05:00.000Z',
}

describe('suds-reading mapper', () => {
  it('toSudsReading maps snake_case row to camelCase domain type', () => {
    const reading = toSudsReading(ROW)
    expect(reading.id).toBe(ROW.id)
    expect(reading.sessionId).toBe(ROW.session_id)
    expect(reading.sudsValue).toBe(ROW.suds_value)
    expect(reading.recordedAt).toBe(ROW.recorded_at)
  })

  it('fromSudsReading maps camelCase domain type to snake_case row', () => {
    const reading = toSudsReading(ROW)
    const row = fromSudsReading(reading)
    expect(row.id).toBe(reading.id)
    expect(row.session_id).toBe(reading.sessionId)
    expect(row.suds_value).toBe(reading.sudsValue)
    expect(row.recorded_at).toBe(reading.recordedAt)
  })

  it('round-trip is lossless', () => {
    const reading = toSudsReading(ROW)
    const row = fromSudsReading(reading)
    const back = toSudsReading(row)
    expect(back).toEqual(reading)
  })

  it('handles null recorded_at with epoch fallback', () => {
    const nullRow: SudsReadingRow = { ...ROW, recorded_at: null }
    const reading = toSudsReading(nullRow)
    expect(reading.recordedAt).toBe(new Date(0).toISOString())
  })
})
