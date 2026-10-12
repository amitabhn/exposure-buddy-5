import { describe, it, expect, vi } from 'vitest'

vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))
vi.mock('expo-secure-store', () => ({}))
vi.mock('../../src/client', () => ({ createSupabaseClient: () => ({}) }))

import { getJwtExpSeconds, isAccessTokenFresh, isRejectedRefreshError } from '../../src/auth/session'

const tok = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`

describe('JWT expiry helpers (Story 19.8)', () => {
  it('reads exp', () => expect(getJwtExpSeconds(tok({ exp: 123 }))).toBe(123))
  it('returns null for garbage', () => {
    expect(getJwtExpSeconds('nope')).toBeNull()
    expect(getJwtExpSeconds(tok({ sub: 'x' }))).toBeNull()
  })
  it('fresh only when more than 60 s remain', () => {
    const now = 1_000_000_000
    expect(isAccessTokenFresh(tok({ exp: now / 1000 + 61 }), now)).toBe(true)
    expect(isAccessTokenFresh(tok({ exp: now / 1000 + 60 }), now)).toBe(false)
    expect(isAccessTokenFresh(tok({ exp: now / 1000 - 5 }), now)).toBe(false)
    expect(isAccessTokenFresh('garbage', now)).toBe(false)
  })
  it('classifies only AuthApiError 400/401 as rejected', () => {
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 400 })).toBe(true)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 401 })).toBe(true)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 403, code: 'session_not_found' })).toBe(true)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 403, code: 'refresh_token_not_found' })).toBe(true)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 403, code: 'refresh_token_already_used' })).toBe(true)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 403, code: 'user_banned' })).toBe(false)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 403 })).toBe(false)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 429 })).toBe(false)
    expect(isRejectedRefreshError({ name: 'AuthApiError', status: 500 })).toBe(false)
    expect(isRejectedRefreshError({ name: 'AuthRetryableFetchError', status: 0 })).toBe(false)
    expect(isRejectedRefreshError({ name: 'AuthUnknownError', status: 400 })).toBe(false)
    expect(isRejectedRefreshError(null)).toBe(false)
  })
})
