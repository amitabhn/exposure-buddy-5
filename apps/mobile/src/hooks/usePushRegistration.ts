import { useCallback, useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerPushToken } from '@exposure-buddy/supabase'

export type UsePushRegistrationResult = {
  registerNow: () => Promise<void>
}

export function usePushRegistration(userId: string | undefined | null): UsePushRegistrationResult {
  // Tracks whether registration has succeeded at least once this session, gating the
  // AC4 foreground re-registration trigger (only refresh last_seen_at for a token we own).
  const hasRegisteredRef = useRef(false)
  // Concurrency guard — prevents an overlapping mount-effect call and AppState-triggered
  // call from racing (e.g. permission granted right as the app foregrounds).
  const isRegisteringRef = useRef(false)

  const registerNow = useCallback(async () => {
    if (!userId || isRegisteringRef.current) return
    isRegisteringRef.current = true
    try {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') return

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
      // eslint-disable-next-line i18next/no-literal-string -- platform identifier, not user-facing text
      const platform = Platform.OS === 'ios' ? 'ios' : 'android'

      await registerPushToken({ token, platform, userId })
      hasRegisteredRef.current = true
    } finally {
      isRegisteringRef.current = false
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function run() {
      try {
        await registerNow()
      } catch (err) {
        if (!cancelled) console.warn('[usePushRegistration] mount registration failed:', err)
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [userId, registerNow])

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && hasRegisteredRef.current) {
        registerNow().catch(err => {
          console.warn('[usePushRegistration] foreground re-registration failed:', err)
        })
      }
    })
    return () => sub.remove()
  }, [registerNow])

  return { registerNow }
}
