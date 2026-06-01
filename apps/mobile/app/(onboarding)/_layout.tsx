import { Stack, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '@exposure-buddy/supabase'
import { BackButton } from '../../src/components/navigation/BackButton'

export default function OnboardingLayout() {
  const router = useRouter()
  const { isLoading, isAuthenticated, isOnboardingComplete } = useAuth()

  // Auth + completion gates — redirect unauthenticated users to sign-in; redirect
  // users who already completed onboarding to the app (prevents deep-link re-entry).
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in')
    } else if (!isLoading && isAuthenticated && isOnboardingComplete) {
      router.replace('/(app)')
    }
  }, [isLoading, isAuthenticated, isOnboardingComplete, router])

  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: navigation.canGoBack(),
        headerTitle: () => null,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' },
        headerLeft: () => <BackButton />,
        headerBackVisible: false,
      })}
    />
  )
}
