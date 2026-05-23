import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database }
export type TypedSupabaseClient = SupabaseClient<Database>

let _client: TypedSupabaseClient | null = null

declare const process: { env: Record<string, string | undefined> }

export function createSupabaseClient(): TypedSupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseAnonKey = process.env['SUPABASE_ANON_KEY']

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY must be set in EAS environment variables (ARC-006)',
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
