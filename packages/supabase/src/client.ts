import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database, SupabaseClient }
export type TypedSupabaseClient = SupabaseClient<Database>

let _client: TypedSupabaseClient | null = null

declare const process: { env: Record<string, string | undefined> }

export function createSupabaseClient(): TypedSupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL']
  const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set as EAS environment variables (ARC-006). The EXPO_PUBLIC_ prefix is required so Expo inlines the value into the JS bundle at build time.',
    )
  }

  _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // session persistence handled by MMKV (ARC-004)
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })

  return _client
}
