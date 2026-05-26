import { createSupabaseClient } from '../client'

export async function callEdgeFn<TBody extends Record<string, unknown>>(name: string, body: TBody): Promise<void> {
  // createSupabaseClient() returns a module-level singleton; the in-memory session
  // from supabase.auth.verifyOtp() is present on this instance when called from an
  // authenticated context, so functions.invoke() sends the correct Bearer JWT.
  const client = createSupabaseClient()
  const { error } = await client.functions.invoke(name, { body })
  if (error) throw error
}
