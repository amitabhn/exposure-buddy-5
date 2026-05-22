import { Stack } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initErrorHandler } from '../src/error-handler'
import { ReducedMotionProvider } from '../src/contexts/AnimationContext'
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
import { useEffect, useRef } from 'react'

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
    <SafeAreaProvider>
      <ReducedMotionProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </ThemeProvider>
      </ReducedMotionProvider>
    </SafeAreaProvider>
  )
}
