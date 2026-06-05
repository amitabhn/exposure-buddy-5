import { describe, it, expect } from 'vitest'
import { toExposureSession, fromExposureSession, type ExposureSessionRow } from '../../src/mappers/exposure-session.mapper'

const ROW: ExposureSessionRow = {
  id: 'session-uuid-1',
  user_id: 'user-uuid-1',
  fear_item_id: 'item-uuid-1',
  session_type: 'erp',
  status: 'started',
  pre_session_intention: 'I will try my best',
  post_session_reflection: null,
  started_at: '2026-01-01T10:00:00.000Z',
  ended_at: null,
  expires_at: null,
  created_at: '2026-01-01T10:00:00.000Z',
}

describe('exposure-session mapper', () => {
  it('toExposureSession maps snake_case row to camelCase domain type', () => {
    const session = toExposureSession(ROW)
    expect(session.id).toBe(ROW.id)
    expect(session.userId).toBe(ROW.user_id)
    expect(session.fearItemId).toBe(ROW.fear_item_id)
    expect(session.sessionType).toBe(ROW.session_type)
    expect(session.status).toBe(ROW.status)
    expect(session.preSessionIntention).toBe(ROW.pre_session_intention)
    expect(session.postSessionReflection).toBeNull()
    expect(session.startedAt).toBe(ROW.started_at)
    expect(session.endedAt).toBeNull()
    expect(session.expiresAt).toBeNull()
    expect(session.createdAt).toBe(ROW.created_at)
  })

  it('fromExposureSession maps camelCase domain type to snake_case row', () => {
    const session = toExposureSession(ROW)
    const row = fromExposureSession(session)
    expect(row.id).toBe(session.id)
    expect(row.user_id).toBe(session.userId)
    expect(row.fear_item_id).toBe(session.fearItemId)
    expect(row.session_type).toBe(session.sessionType)
    expect(row.status).toBe(session.status)
  })

  it('round-trip is lossless', () => {
    const session = toExposureSession(ROW)
    const row = fromExposureSession(session)
    const back = toExposureSession(row)
    expect(back).toEqual(session)
  })

  it('handles null optional fields', () => {
    const nullRow: ExposureSessionRow = { ...ROW, fear_item_id: null, pre_session_intention: null, ended_at: null, expires_at: null }
    const session = toExposureSession(nullRow)
    expect(session.fearItemId).toBeNull()
    expect(session.preSessionIntention).toBeNull()
    expect(session.endedAt).toBeNull()
    expect(session.expiresAt).toBeNull()
  })
})
