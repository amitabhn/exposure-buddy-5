import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth, createSupabaseClient } from '@exposure-buddy/supabase'

export default function AppLayout() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isLoading, isAuthenticated, isOnboardingComplete } = useAuth()

  // Auth + onboarding gate — never redirect while isLoading (ARC-004 cold-start).
  // Priority: unauthenticated → sign-in; authenticated but onboarding incomplete → onboarding.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in')
    } else if (!isLoading && isAuthenticated && !isOnboardingComplete) {
      router.replace('/(onboarding)/welcome')
    }
  }, [isLoading, isAuthenticated, isOnboardingComplete, router])

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
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="settings/index" options={{ title: t('nav.settings') }} />
    </Tabs>
  )
}
