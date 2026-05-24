import * as SecureStore from 'expo-secure-store'
import { MMKV } from 'react-native-mmkv'
import type { Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '../client'

export type { MMKV }

// Device-unique key alias stored in hardware-backed keystore (ARC-004)
const MMKV_KEY_ALIAS = 'exposure-buddy.mmkv.key'

// Single-key storage — atomic write prevents torn-read on OOM kill (ARC-004)
export const MMKV_KEYS = {
  AUTH_STATE: 'auth.state',
} as const

export type MmkvKey = (typeof MMKV_KEYS)[keyof typeof MMKV_KEYS]

export interface AuthState {
  session: Session | null
  userId: string | null
  email: string | null
}

interface StoredAuthState {
  session: Session
  userId: string
  email: string
}

// Promise singleton — concurrent callers share one init path, preventing key mismatch (ARC-004)
let _initPromise: Promise<MMKV> | null = null

/**
 * Derives or generates an MMKV encryption key from SecureStore, then initialises
 * the MMKV instance. Safe to call concurrently. Must resolve before AuthProvider
 * mounts (ARC-004 cold start).
 *
 * Android reinstall / backup-restore edge case: see
 * packages/supabase/__tests__/rls/mmkv-key-rotation.stub.ts
 */
export function initSession(): Promise<MMKV> {
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const stored = await SecureStore.getItemAsync(MMKV_KEY_ALIAS)
    let encryptionKey: string
    if (stored) {
      encryptionKey = stored
    } else {
      // First install — generate a device-unique key (ARC-004)
      encryptionKey = crypto.randomUUID().replace(/-/g, '')
      await SecureStore.setItemAsync(MMKV_KEY_ALIAS, encryptionKey, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
    }
    return new MMKV({ id: 'exposure-buddy', encryptionKey })
  })()
  return _initPromise
}

export function getAuthState(mmkv: MMKV): AuthState {
  try {
    const raw = mmkv.getString(MMKV_KEYS.AUTH_STATE)
    if (!raw) return { session: null, userId: null, email: null }
    const stored = JSON.parse(raw) as StoredAuthState
    return { session: stored.session, userId: stored.userId, email: stored.email }
  } catch {
    // Corrupt MMKV state — clear and return signed-out state
    clearAuthState(mmkv)
    return { session: null, userId: null, email: null }
  }
}

export function setAuthState(mmkv: MMKV, session: Session): void {
  const state: StoredAuthState = {
    session,
    userId: session.user.id,
    email: session.user.email ?? '',
  }
  mmkv.set(MMKV_KEYS.AUTH_STATE, JSON.stringify(state))
}

export function clearAuthState(mmkv: MMKV): void {
  mmkv.delete(MMKV_KEYS.AUTH_STATE)
}

export async function signOut(mmkv: MMKV): Promise<void> {
  await createSupabaseClient().auth.signOut()
  clearAuthState(mmkv)
  // eslint-disable-next-line i18next/no-literal-string
  await SecureStore.deleteItemAsync('supabase_access_token').catch(() => {})
  // eslint-disable-next-line i18next/no-literal-string
  await SecureStore.deleteItemAsync('supabase_refresh_token').catch(() => {})
}
