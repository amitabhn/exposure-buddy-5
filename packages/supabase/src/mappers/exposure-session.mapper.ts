import type { ExposureSession } from '@exposure-buddy/core'

// Row shape from database (snake_case) — mirrors the exposure_sessions table columns
export interface ExposureSessionRow {
  id: string
  user_id: string
  fear_item_id: string | null
  session_type: string
  status: string
  pre_session_intention: string | null
  post_session_reflection: string | null
  started_at: string
  ended_at: string | null
  expires_at: number | null
  created_at: string | null
}

export function toExposureSession(row: ExposureSessionRow): ExposureSession {
  return {
    id: row.id,
    userId: row.user_id,
    fearItemId: row.fear_item_id,
    sessionType: row.session_type as ExposureSession['sessionType'],
    status: row.status as ExposureSession['status'],
    preSessionIntention: row.pre_session_intention,
    postSessionReflection: row.post_session_reflection,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  }
}

export function fromExposureSession(session: ExposureSession): ExposureSessionRow {
  return {
    id: session.id,
    user_id: session.userId,
    fear_item_id: session.fearItemId,
    session_type: session.sessionType,
    status: session.status,
    pre_session_intention: session.preSessionIntention,
    post_session_reflection: session.postSessionReflection,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  }
}
