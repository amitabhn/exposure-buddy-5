import { Stack } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initErrorHandler } from '../src/error-handler'
import { ReducedMotionProvider } from '../src/contexts/AnimationContext'
import '../src/i18n'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useRef, useState } from 'react'
import { AuthProvider, initSession, type MMKV } from '@exposure-buddy/supabase'

// MUST be called before any React rendering — registers Sentry and global error handler
initErrorHandler()
// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  })

  const splashHidden = useRef(false)
  // Cold start sequence (ARC-004):
  // 1. initErrorHandler() — module scope, first
  // 2. SplashScreen.preventAutoHideAsync() — module scope, second
  // 3. i18n side-effect — module scope, third
  // 4. initSession() — async, derives MMKV key from SecureStore before auth reads
  // Tri-state: undefined = pending; null = init failed (degraded, no persistence);
  // MMKV = ready. AuthProvider uses this to decide when to stop loading.
  const [mmkv, setMmkv] = useState<MMKV | null | undefined>(undefined)

  useEffect(() => {
    initSession()
      .then(setMmkv)
      .catch(() => {
        // initSession can fail if SecureStore is unavailable or the Hermes runtime
        // lacks crypto APIs — proceed in degraded mode so the auth gate can still render.
        setMmkv(null)
      })
  }, [])

  useEffect(() => {
    if ((fontsLoaded || fontError) && !splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontsLoaded, fontError])

  // Hold the splash screen while fonts load.
  // On fontError: proceed with system fonts (SF Pro / Roboto) — do not crash.
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <AuthProvider mmkv={mmkv}>
      <SafeAreaProvider>
        <ReducedMotionProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }} />
            <PortalHost />
          </ThemeProvider>
        </ReducedMotionProvider>
      </SafeAreaProvider>
    </AuthProvider>
  )
}
