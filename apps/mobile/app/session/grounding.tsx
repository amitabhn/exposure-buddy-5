import { useCallback, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Pressable, StyleSheet, BackHandler, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@exposure-buddy/supabase'
import { transition, CALM_ME_AFFIRMATIONS } from '@exposure-buddy/core'
import { getAdapter } from '../../src/sync/adapter'

export default function GroundingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  const { clearSessionInProgress, clearSessionIntention, clearGroundingActive } = useAuth()
  const [abandonError, setAbandonError] = useState<string | null>(null)
  const [isAbandoning, setIsAbandoning] = useState(false)
  const isAbandoningRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
      return () => subscription.remove()
    }, [])
  )

  async function handleConfirmStop() {
    if (isAbandoningRef.current) return
    // grounding.stopped event → grounding→abandoned
    // eslint-disable-next-line i18next/no-literal-string
    const result = transition('grounding', { type: 'grounding.stopped' })
    if (!result.ok) return

    isAbandoningRef.current = true
    setIsAbandoning(true)
    setAbandonError(null)
    const endedAt = new Date().toISOString()

    try {
      // Enqueue exposure_sessions UPDATE status → abandoned
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('exposure_sessions', 'UPDATE', {
        id: sessionId,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'abandoned',
        ended_at: endedAt,
      })

      // Enqueue fear_ladder_items UPDATE status → pending (last_write_wins guard)
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
        id: fearItemId,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'pending',
        updated_at: endedAt,
        updatedAt: Date.now(),
      })
    } catch (err) {
      console.error('[GroundingScreen] abandonment enqueue failed:', err)
      setAbandonError(t('grounding.abandonFailed'))
      isAbandoningRef.current = false
      setIsAbandoning(false)
      return
    }

    // Clear MMKV session keys — only on successful enqueue so session can be recovered on retry
    clearSessionInProgress()
    if (sessionId) clearSessionIntention(sessionId)
    clearGroundingActive()

    // eslint-disable-next-line i18next/no-literal-string
    router.push('/session/abandoned')
  }

  function handleResume() {
    // grounding.resumed event → grounding→active
    // eslint-disable-next-line i18next/no-literal-string
    const result = transition('grounding', { type: 'grounding.resumed' })
    if (!result.ok) return

    // Story 9.2: normal exit from grounding — clear before navigating back to active.
    clearGroundingActive()

    // router.replace keeps stack flat: back from resumed active goes to pause, not grounding
    router.replace(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/active?sessionId=${sessionId}&fearItemId=${encodeURIComponent(fearItemId)}&description=${encodeURIComponent(description ?? '')}&preSuds=${preSuds}`
    )
  }

  return (
    <>
      {/* headerShown: false + gestureEnabled: false set in session/_layout.tsx — forward-only */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* TODO post-MVP: consider distinct framing copy for grounding vs. Calm Me contexts */}
        <Text style={styles.affirmation}>{t(CALM_ME_AFFIRMATIONS[0]!)}</Text>

        <View style={styles.techniquePicker}>
          <TouchableOpacity
            style={styles.techniqueCard}
            // eslint-disable-next-line i18next/no-literal-string
            onPress={() => router.push('/calm-me/breathing')}
            accessibilityRole="button"
            accessibilityLabel={t('calmMe.technique.breathing')}
          >
            <Text style={styles.techniqueLabel}>{t('calmMe.technique.breathing')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.techniqueCard}
            // eslint-disable-next-line i18next/no-literal-string
            onPress={() => router.push('/calm-me/grounding')}
            accessibilityRole="button"
            accessibilityLabel={t('calmMe.technique.grounding')}
          >
            <Text style={styles.techniqueLabel}>{t('calmMe.technique.grounding')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.techniqueCard}
            // eslint-disable-next-line i18next/no-literal-string
            onPress={() => router.push('/calm-me/helplines')}
            accessibilityRole="button"
            accessibilityLabel={t('calmMe.technique.helplines')}
          >
            <Text style={styles.techniqueLabel}>{t('calmMe.technique.helplines')}</Text>
          </TouchableOpacity>
        </View>

        {abandonError ? (
          <View style={styles.abandonErrorContainer}>
            <Text
              // eslint-disable-next-line i18next/no-literal-string
              accessibilityLiveRegion="polite"
              style={styles.abandonErrorText}
            >{abandonError}</Text>
            <Pressable
              onPress={handleConfirmStop}
              disabled={isAbandoning}
              accessibilityRole="button"
              accessibilityLabel={t('grounding.tryAgain')}
              accessibilityState={{ disabled: isAbandoning }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>{t('grounding.tryAgain')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={handleResume}
            accessibilityRole="button"
            accessibilityLabel={t('grounding.keepGoing')}
          >
            <Text style={styles.resumeText}>{t('grounding.keepGoing')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.stopButton, isAbandoning && styles.stopButtonDisabled]}
            onPress={handleConfirmStop}
            disabled={isAbandoning}
            accessibilityRole="button"
            accessibilityLabel={t('grounding.stopSession')}
            accessibilityState={{ disabled: isAbandoning }}
          >
            <Text style={styles.stopText}>{t('grounding.stopSession')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: see session/briefing.tsx for the flexGrow fix pattern.
  container: { flexGrow: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, justifyContent: 'center' },
  affirmation: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'center', lineHeight: 30, marginBottom: 32 },
  techniquePicker: { gap: 12, marginBottom: 32 },
  techniqueCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  techniqueLabel: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827' },
  abandonErrorContainer: { marginBottom: 16 },
  abandonErrorText: { fontSize: 14, color: '#ef4444', lineHeight: 20, marginBottom: 8 },
  retryButton: { alignSelf: 'flex-start' },
  retryButtonText: { fontSize: 14, color: '#1d4ed8', textDecorationLine: 'underline' },
  actions: { gap: 16 },
  resumeButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  resumeText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stopButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  stopButtonDisabled: { opacity: 0.5 },
  stopText: { color: '#374151', fontSize: 16 },
})
