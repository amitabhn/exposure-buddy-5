import { useEffect, useState } from 'react'
import { AppState, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuth, createSupabaseClient } from '@exposure-buddy/supabase'
import { getAdapter } from '../../src/sync/adapter'
import { usePushRegistration } from '../../src/hooks/usePushRegistration'

export default function AppLayout() {
  const { t } = useTranslation()
  const router = useRouter()
  const {
    isLoading,
    isAuthenticated,
    isOnboardingComplete,
    isStorageDegraded,
    sessionRecoveryData,
    clearSessionInProgress,
    clearSessionIntention,
    userId,
  } = useAuth()

  usePushRegistration(userId)
  // Local dismissal flag: hides the modal after Resume without clearing session data,
  // so the recovery blob remains available if the app is force-quit mid-session again.
  // Resets automatically when sessionRecoveryData is cleared (abandonment/completion).
  const [recoveryModalDismissed, setRecoveryModalDismissed] = useState(false)
  useEffect(() => {
    if (!sessionRecoveryData) setRecoveryModalDismissed(false)
  }, [sessionRecoveryData])

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

  function handleRecoveryResume() {
    if (!sessionRecoveryData) return
    setRecoveryModalDismissed(true)
    const { sessionId, fearItemId, description, preSuds } = sessionRecoveryData
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/active?sessionId=${sessionId}&fearItemId=${fearItemId != null ? encodeURIComponent(fearItemId) : ''}&description=${encodeURIComponent(description)}&preSuds=${preSuds}`
    )
  }

  async function handleRecoveryEnd() {
    if (!sessionRecoveryData) return
    const { sessionId, fearItemId } = sessionRecoveryData
    const endedAt = new Date().toISOString()

    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('exposure_sessions', 'UPDATE', {
        id: sessionId,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'abandoned',
        ended_at: endedAt,
      })
      if (fearItemId) {
        // eslint-disable-next-line i18next/no-literal-string
        await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
          id: fearItemId,
          // eslint-disable-next-line i18next/no-literal-string
          status: 'pending',
          updated_at: endedAt,
          updatedAt: Date.now(),
        })
      }
    } catch (err) {
      console.error('[AppLayout] recovery end enqueue failed:', err)
    }

    clearSessionInProgress()
    clearSessionIntention(sessionId)
  }

  // Recovery modal is shown when authenticated + not loading + a session was in progress + not dismissed.
  // Modal is NOT shown during loading (isLoading === true) per AC7.
  // recoveryModalDismissed hides the modal after Resume without clearing session data (Android safety).
  const showRecoveryModal = !isLoading && isAuthenticated && sessionRecoveryData !== null && !recoveryModalDismissed

  return (
    <>
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

      <Modal
        visible={showRecoveryModal}
        transparent
        // eslint-disable-next-line i18next/no-literal-string
        animationType="fade"
        // eslint-disable-next-line i18next/no-literal-string
        presentationStyle="overFullScreen"
        onRequestClose={() => {}}
      >
        <View style={recoveryStyles.overlay}>
          <View style={recoveryStyles.card}>
            <Text style={recoveryStyles.title}>{t('session.recovery.title')}</Text>
            <Text style={recoveryStyles.body}>{t('session.recovery.body')}</Text>
            <TouchableOpacity
              style={recoveryStyles.resumeButton}
              onPress={handleRecoveryResume}
              accessibilityRole="button"
              accessibilityLabel={t('session.recovery.resume')}
            >
              <Text style={recoveryStyles.resumeText}>{t('session.recovery.resume')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={recoveryStyles.endButton}
              onPress={handleRecoveryEnd}
              accessibilityRole="button"
              accessibilityLabel={t('session.recovery.end')}
            >
              <Text style={recoveryStyles.endText}>{t('session.recovery.end')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const recoveryStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, width: '100%' },
  title: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 12 },
  body: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 24 },
  resumeButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  resumeText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  endButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  endText: { color: '#374151', fontSize: 15 },
})
