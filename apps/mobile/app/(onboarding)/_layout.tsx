import { Stack, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '@exposure-buddy/supabase'

export default function OnboardingLayout() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth()

  // Auth gate — redirect to sign-in if somehow accessed unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/sign-in')
    }
  }, [isLoading, isAuthenticated, router])

  return <Stack screenOptions={{ headerShown: false }} />
}
