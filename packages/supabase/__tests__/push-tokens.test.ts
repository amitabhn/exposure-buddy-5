import { describe, it, expect, vi } from 'vitest'

const upsert = vi.fn()
const from = vi.fn(() => ({ upsert }))

vi.mock('../src/client', () => ({ createSupabaseClient: () => ({ from }) }))

import { registerPushToken } from '../src/functions/push-tokens'

describe('registerPushToken', () => {
  it('upserts onto device_push_tokens with onConflict: token', async () => {
    upsert.mockResolvedValueOnce({ error: null })

    await registerPushToken({ token: 'expo-token-1', platform: 'ios', userId: 'user-1' })

    expect(from).toHaveBeenCalledWith('device_push_tokens')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'expo-token-1',
        platform: 'ios',
        user_id: 'user-1',
        last_seen_at: expect.any(String),
      }),
      { onConflict: 'token' },
    )
  })

  it('throws the raw Supabase error on failure', async () => {
    const error = new Error('insert failed')
    upsert.mockResolvedValueOnce({ error })

    await expect(
      registerPushToken({ token: 'expo-token-2', platform: 'android', userId: 'user-2' }),
    ).rejects.toBe(error)
  })
})
