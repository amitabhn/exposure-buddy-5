import { createSupabaseClient } from '../client'

export async function registerPushToken(params: {
  token: string
  platform: 'ios' | 'android'
  userId: string
}): Promise<void> {
  const client = createSupabaseClient()
  const { error } = await client.from('device_push_tokens').upsert(
    {
      token: params.token,
      platform: params.platform,
      user_id: params.userId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  )
  if (error) throw error
}
