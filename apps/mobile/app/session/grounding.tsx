import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { getAdapter } from '../../src/sync/adapter'

// IMPORTANT: This screen ships as COMPLETE at MVP. No TODO, STUB, or Epic 7 comments.
// Epic 7 Story 7.5 adds the full technique picker as a SEPARATE enhancement;
// this screen is NOT replaced — it is SUPPLEMENTED.

export default function GroundingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  const { clearSessionInProgress, clearSessionIntention } = useAuth()

  async function handleConfirmStop() {
    // grounding.stopped event → grounding→abandoned
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
    }

    // Clear MMKV session keys
    clearSessionInProgress()
    if (sessionId) clearSessionIntention(sessionId)

    // eslint-disable-next-line i18next/no-literal-string
    router.push('/session/abandoned')
  }

  function handleResume() {
    // grounding.resumed event → grounding→active
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
      <View style={styles.container}>
        <Text style={styles.affirmation}>{t('session.grounding.affirmation')}</Text>
        <Text style={styles.breathingPrompt}>{t('session.grounding.breathingPrompt')}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={handleResume}
            accessibilityRole="button"
            accessibilityLabel={t('session.grounding.resume')}
          >
            <Text style={styles.resumeText}>{t('session.grounding.resume')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleConfirmStop}
            accessibilityRole="button"
            accessibilityLabel={t('session.grounding.confirmStop')}
          >
            <Text style={styles.stopText}>{t('session.grounding.confirmStop')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, justifyContent: 'center' },
  affirmation: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'center', lineHeight: 30, marginBottom: 24 },
  breathingPrompt: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 26, marginBottom: 48 },
  actions: { gap: 16 },
  resumeButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  resumeText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stopButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  stopText: { color: '#374151', fontSize: 16 },
})
