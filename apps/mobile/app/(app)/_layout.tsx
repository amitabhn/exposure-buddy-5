import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth, createSupabaseClient } from '@exposure-buddy/supabase'

export default function AppLayout() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isLoading, isAuthenticated, isOnboardingComplete, isStorageDegraded } = useAuth()

  // Auth + onboarding gate — never redirect while isLoading (ARC-004 cold-start).
  // Priority: unauthenticated → sign-in; authenticated + onboarding incomplete → onboarding.
  // Skip the onboarding gate in degraded mode (MMKV unavailable) — route authenticated
  // users directly to the app rather than trapping them in an uncompletable onboarding loop.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in')
    } else if (!isLoading && isAuthenticated && !isOnboardingComplete && !isStorageDegraded) {
      router.replace('/(onboarding)/welcome')
    }
  }, [isLoading, isAuthenticated, isOnboardingComplete, isStorageDegraded, router])

  // Refresh session on foreground resume to catch token expiry during background suspension (ADR-008 §5b)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        createSupabaseClient().auth.getSession()
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
