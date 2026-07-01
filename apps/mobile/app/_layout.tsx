import { Stack } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BackButton } from '../src/components/navigation/BackButton'
import { CalmMeFab } from '../src/components/CalmMeFab'
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
import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AuthProvider, OnboardingProvider, initSession, useAuth, createSupabaseClient, type MMKV } from '@exposure-buddy/supabase'
import * as Sentry from '@sentry/react-native'
import {
  PowerSyncContext,
  getPowerSyncDatabase,
  createPowerSyncDatabase,
  PowerSyncSyncAdapter,
  SupabasePowerSyncConnector,
  initAdapter,
} from '@exposure-buddy/sync'

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  // Do NOT use useTranslation() here — the i18n provider may not be available if the
  // crash occurs before the i18n side-effect runs. Hardcoded English is intentional;
  // this is the last-resort fallback, not a localised UI (ADR-ERROR-STATES.md).
  return (
    <View style={errorBoundaryStyles.container}>
      {/* eslint-disable i18next/no-literal-string */}
      <Text
        accessibilityLiveRegion="polite"
        style={errorBoundaryStyles.message}
      >
        The app encountered an error. Please close and reopen it.
      </Text>
      {/* eslint-enable i18next/no-literal-string */}
    </View>
  )
}

const errorBoundaryStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  message: { fontSize: 16, color: '#111827', textAlign: 'center', lineHeight: 24 },
})

// Placeholder DB used when no user is signed in — never connected to Supabase.
// Keeps PowerSyncContext.Provider value non-null so useQuery's conditional hook
// calls don't violate Rules of Hooks on the null→db transition at sign-in.
// eslint-disable-next-line i18next/no-literal-string
const _placeholderDb = createPowerSyncDatabase('exposure-buddy-placeholder.db')

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider mmkv={mmkv}>
        <PowerSyncConnectionManager>
          <OnboardingProvider mmkv={mmkv}>
          <SafeAreaProvider>
            <ReducedMotionProvider>
              <ThemeProvider value={DefaultTheme}>
                {/* CalmMeFab is mounted before <Stack> so it precedes every screen in
                    accessibility-tree traversal order (Story 9.3, AC4) — its container is
                    position: 'absolute' (CalmMeFab.tsx), so this ordering change does not
                    affect visual position or z-index, only focus/swipe order. */}
                <CalmMeFab />
                <Stack screenOptions={{ headerShown: false }}>
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Stack.Screen name="privacy-notice" options={{ headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false }} />
                  {/* PERF: animation disabled — UX-DR8 requires instant render; cross-fade (~300ms on Mali-G31) violates the 200ms tap-to-mount budget. gestureEnabled: false is explicit — Android default is already false, iOS disabled per UX-DR8 instant-render intent. UX sign-off: UX-DR8 + Story 9.7 spec review. */}
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Stack.Screen name="calm-me" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Stack.Screen name="ladder" options={{ headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false }} />
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Stack.Screen name="reminder-settings" options={{ headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false }} />
                  <Stack.Screen name="session" options={{ headerShown: false }} />
                </Stack>
                <PortalHost />
              </ThemeProvider>
            </ReducedMotionProvider>
          </SafeAreaProvider>
          </OnboardingProvider>
        </PowerSyncConnectionManager>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}

function logSyncLifecycleError(err: unknown) {
  console.error('[PowerSync] lifecycle error:', err)
  // eslint-disable-next-line i18next/no-literal-string
  Sentry.addBreadcrumb({ category: 'powersync', message: 'lifecycle error', data: { err: String(err) } })
}

function PowerSyncConnectionManager({ children }: { children: React.ReactNode }) {
  const { userId: rawUserId, isLoading } = useAuth()
  // Tri-state: undefined = auth still loading, null = signed-out, string = signed-in user id.
  // useAuth().userId is string|null; isLoading collapses the two null states into a distinct sentinel.
  const userId = isLoading ? undefined : rawUserId

  const prevUserIdRef = useRef<string | null | undefined>(undefined)
  // Single in-flight promise chain — sequences connect/disconnectAndClear so a late-resolving
  // connect() cannot arrive after a sign-out and leave the app connected for a signed-out user.
  const inFlightRef = useRef<Promise<void>>(Promise.resolve())
  // Track the current per-user db so the disconnect branch operates on the right instance.
  const currentDbRef = useRef<ReturnType<typeof getPowerSyncDatabase> | null>(null)
  // Never null: start with placeholder so useQuery's conditional hook calls never see a
  // falsy context value (Rules of Hooks — useQuery.js:8 returns early before 3 inner hooks).
  const [db, setDb] = useState<ReturnType<typeof getPowerSyncDatabase>>(
    _placeholderDb,
  )

  useEffect(() => {
    if (userId === undefined) return                          // auth still loading
    if (userId === prevUserIdRef.current) return              // no transition
    prevUserIdRef.current = userId

    if (userId) {
      const powerSyncDb = getPowerSyncDatabase(userId)
      currentDbRef.current = powerSyncDb
      setDb(powerSyncDb)
      // initAdapter is per-user: each userId gets its own adapter instance bound to its db.
      initAdapter(new PowerSyncSyncAdapter(powerSyncDb))
      const connector = new SupabasePowerSyncConnector(createSupabaseClient())
      inFlightRef.current = inFlightRef.current
        .then(() => powerSyncDb.connect(connector))
        .catch(logSyncLifecycleError)
    } else {
      const powerSyncDb = currentDbRef.current
      currentDbRef.current = null
      setDb(_placeholderDb)  // revert to placeholder — never null (see useState init above)
      if (!powerSyncDb) return  // nothing to disconnect
      inFlightRef.current = inFlightRef.current
        .then(() => powerSyncDb.disconnectAndClear())
        .catch(logSyncLifecycleError)
    }
  }, [userId])

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  )
}
