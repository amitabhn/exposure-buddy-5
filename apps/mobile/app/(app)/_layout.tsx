import { useEffect } from 'react'
import { AppState } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth, createSupabaseClient } from '@exposure-buddy/supabase'

export default function AppLayout() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth()

  // Auth gate — never redirect while isLoading to prevent cold-start flash (ARC-004)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in')
    }
  }, [isLoading, isAuthenticated, router])

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
