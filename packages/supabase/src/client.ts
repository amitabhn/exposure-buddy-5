import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database, SupabaseClient }
export type TypedSupabaseClient = SupabaseClient<Database>

let _client: TypedSupabaseClient | null = null

declare const process: { env: Record<string, string | undefined> }

// Default upper bound for any single Supabase request. Without a timeout a stalled
// connection (e.g. a flaky mobile network, or the emulator's dropped first packet in E2E)
// leaves callers like signInWithOtp hanging forever. Override via EXPO_PUBLIC_FETCH_TIMEOUT_MS
// (the E2E APK sets a short value so the onboarding flow's "Send code" retries can recover).
const DEFAULT_FETCH_TIMEOUT_MS = 30_000

// Wraps fetch with an AbortController so requests reject rather than hang past the timeout,
// while still honouring any caller-supplied AbortSignal.
function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const callerSignal = init?.signal
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort()
      else callerSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    return fetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer)
    })
  }
}

export function createSupabaseClient(): TypedSupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL']
  const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set as EAS environment variables (ARC-006). The EXPO_PUBLIC_ prefix is required so Expo inlines the value into the JS bundle at build time.',
    )
  }

  const fetchTimeoutMs =
    Number(process.env['EXPO_PUBLIC_FETCH_TIMEOUT_MS']) || DEFAULT_FETCH_TIMEOUT_MS

  _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // session persistence handled by MMKV (ARC-004)
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createTimeoutFetch(fetchTimeoutMs),
    },
  })

  return _client
}
