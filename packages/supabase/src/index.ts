// @exposure-buddy/supabase — Supabase client, auth, session, RLS
export { createSupabaseClient } from './client'
export type { Database, TypedSupabaseClient } from './client'

export { AuthProvider, AuthContext } from './auth/AuthProvider'
export { useAuth } from './auth/useAuth'
export {
  initSession,
  getAuthState,
  setAuthState,
  clearAuthState,
  signOut,
  MMKV_KEYS,
} from './auth/session'
export type { AuthState, MmkvKey, MMKV } from './auth/session'
export type { PendingDeletionRecord } from '@exposure-buddy/core'
export { ConsentRecordService } from './functions'
export { DpoService } from './functions'
