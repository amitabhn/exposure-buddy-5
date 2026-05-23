import * as SecureStore from 'expo-secure-store'
import { createMMKV } from 'react-native-mmkv'
import type { MMKV } from 'react-native-mmkv'
import type { Session } from '@supabase/supabase-js'

export type { MMKV }

// Device-unique key alias stored in hardware-backed keystore (ARC-004)
const MMKV_KEY_ALIAS = 'exposure-buddy.mmkv.key'

// Typed MMKV key constants — all session keys live here to prevent collisions
export const MMKV_KEYS = {
  AUTH_SESSION: 'auth.session',
  AUTH_USER_ID: 'auth.userId',
  AUTH_EMAIL: 'auth.email',
} as const

export type MmkvKey = (typeof MMKV_KEYS)[keyof typeof MMKV_KEYS]

export interface AuthState {
  session: Session | null
  userId: string | null
  email: string | null
}

let _mmkv: MMKV | null = null

/**
 * Derives or generates an MMKV encryption key from SecureStore, then initialises
 * the MMKV instance. Must resolve before AuthProvider mounts (ARC-004 cold start).
 *
 * Android reinstall / backup-restore edge case: see
 * packages/supabase/__tests__/rls/mmkv-key-rotation.stub.ts
 */
export async function initSession(): Promise<MMKV> {
  if (_mmkv) return _mmkv

  const stored = await SecureStore.getItemAsync(MMKV_KEY_ALIAS)
  let encryptionKey: string
  if (stored) {
    encryptionKey = stored
  } else {
    // First install — generate a device-unique 32-char hex key (128 bits entropy, AES-256 limit)
    encryptionKey = crypto.randomUUID().replace(/-/g, '')
    await SecureStore.setItemAsync(MMKV_KEY_ALIAS, encryptionKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })
  }

  _mmkv = createMMKV({ id: 'exposure-buddy', encryptionKey, encryptionType: 'AES-256' })
  return _mmkv
}

export function getAuthState(mmkv: MMKV): AuthState {
  const raw = mmkv.getString(MMKV_KEYS.AUTH_SESSION)
  const session: Session | null = raw ? (JSON.parse(raw) as Session) : null
  return {
    session,
    userId: mmkv.getString(MMKV_KEYS.AUTH_USER_ID) ?? null,
    email: mmkv.getString(MMKV_KEYS.AUTH_EMAIL) ?? null,
  }
}

export function setAuthState(mmkv: MMKV, session: Session): void {
  mmkv.set(MMKV_KEYS.AUTH_SESSION, JSON.stringify(session))
  mmkv.set(MMKV_KEYS.AUTH_USER_ID, session.user.id)
  mmkv.set(MMKV_KEYS.AUTH_EMAIL, session.user.email ?? '')
}

export function clearAuthState(mmkv: MMKV): void {
  mmkv.remove(MMKV_KEYS.AUTH_SESSION)
  mmkv.remove(MMKV_KEYS.AUTH_USER_ID)
  mmkv.remove(MMKV_KEYS.AUTH_EMAIL)
}
