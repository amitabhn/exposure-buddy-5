import * as SecureStore from 'expo-secure-store'
import { MMKV } from 'react-native-mmkv'
import type { Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '../client'
import { KV_KEYS } from '@exposure-buddy/core'

export type { MMKV }

// Device-unique key alias stored in hardware-backed keystore (ARC-004)
const MMKV_KEY_ALIAS = 'exposure-buddy.mmkv.key'

// Single-key storage — atomic write prevents torn-read on OOM kill (ARC-004)
export const MMKV_KEYS = {
  AUTH_STATE: 'auth.state',
  // Set once on the device's first successful sign-in. Persists across sign-out
  // (cleared only on reinstall, when the MMKV encryption key rotates). The
  // sign-in screen uses this to default to "Sign in" for returning users and
  // "Create account" for fresh installs.
  HAS_AUTHED_BEFORE: 'auth.hasAuthedBefore',
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

// 32-hex-char random key for MMKV encryption. Hermes (RN 0.81) exposes
// crypto.getRandomValues; we don't rely on crypto.randomUUID, which is not
// universally available on Hermes builds. Math.random fallback is a last resort
// for environments missing both — acceptable for a device-local MMKV key.
function generateEncryptionKey(): string {
  const bytes = new Uint8Array(16)
  const c: { getRandomValues?: (b: Uint8Array) => Uint8Array } | undefined = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array } }).crypto
  if (typeof c?.getRandomValues === 'function') {
    c.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

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
      // First install — generate a device-unique key (ARC-004).
      encryptionKey = generateEncryptionKey()
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
  mmkv.set(MMKV_KEYS.HAS_AUTHED_BEFORE, true)
}

export function getHasAuthedBefore(mmkv: MMKV): boolean {
  return mmkv.getBoolean(MMKV_KEYS.HAS_AUTHED_BEFORE) ?? false
}

export function clearAuthState(mmkv: MMKV): void {
  mmkv.delete(MMKV_KEYS.AUTH_STATE)
}

export async function signOut(mmkv: MMKV | null): Promise<void> {
  await createSupabaseClient().auth.signOut()
  if (mmkv) clearAuthState(mmkv)
  // eslint-disable-next-line i18next/no-literal-string
  await SecureStore.deleteItemAsync('supabase_access_token').catch(() => {})
  // eslint-disable-next-line i18next/no-literal-string
  await SecureStore.deleteItemAsync('supabase_refresh_token').catch(() => {})
}

// ─── Onboarding MMKV helpers ─────────────────────────────────────────────────

export function getOnboardingComplete(mmkv: MMKV, userId: string): boolean {
  try {
    return mmkv.getBoolean(KV_KEYS.ONBOARDING_COMPLETE(userId)) ?? false
  } catch {
    return false
  }
}

export function setOnboardingComplete(mmkv: MMKV, userId: string): void {
  mmkv.set(KV_KEYS.ONBOARDING_COMPLETE(userId), true)
}

export function getOnboardingProgress(mmkv: MMKV, userId: string): { step: number } | null {
  const raw = mmkv.getString(KV_KEYS.ONBOARDING_PROGRESS(userId))
  if (!raw) return null
  // Throws on corrupt JSON or invalid shape — caller handles graceful degradation (AC5)
  const parsed = JSON.parse(raw) as { step: unknown }
  if (typeof parsed?.step !== 'number' || !Number.isInteger(parsed.step) || parsed.step < 1) {
    throw new Error('Invalid onboarding progress: step must be a positive integer')
  }
  return { step: parsed.step }
}

export function setOnboardingProgress(mmkv: MMKV, userId: string, progress: { step: number }): void {
  mmkv.set(KV_KEYS.ONBOARDING_PROGRESS(userId), JSON.stringify(progress))
}
