import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CALM_ME_AFFIRMATIONS } from '@exposure-buddy/core'
import { getAdapter } from '../../src/sync/adapter'
import { SudsScale } from '../../src/components/session/SudsScale'

export default function CalmMeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { sessionRecoveryData, clearSessionInProgress, clearSessionIntention } = useAuth()
  // inSession is set by the FAB (root layout) at tap-time, where usePathname() can still
  // distinguish '/session/active' from elsewhere — by the time this screen mounts, the
  // active route is already '/calm-me' itself, so that check can't be repeated here.
  const { inSession } = useLocalSearchParams<{ inSession?: string }>()
  const isInSession = inSession === '1' && sessionRecoveryData !== null

  const [showDebriefConfirm, setShowDebriefConfirm] = useState(false)
  const [showFreshSudsPrompt, setShowFreshSudsPrompt] = useState(false)
  const [submittingSuds, setSubmittingSuds] = useState(false)

  function handleExit() {
    // Exit always wins over an open confirm/prompt — dismisses everything, no state change.
    router.back()
  }

  function handleKeepGoing() {
    router.back()
  }

  function handleNeedToStop() {
    setShowDebriefConfirm(true)
  }

  function handleNotNow() {
    setShowDebriefConfirm(false)
    // eslint-disable-next-line i18next/no-literal-string
    router.replace('/')
  }

  function handleConfirmYes() {
    setShowDebriefConfirm(false)
    setShowFreshSudsPrompt(true)
  }

  async function handleFreshSudsSelected(freshSuds: number) {
    if (!sessionRecoveryData || submittingSuds) return
    setSubmittingSuds(true)
    const { sessionId, fearItemId, preSuds } = sessionRecoveryData
    const endedAt = new Date().toISOString()

    // Mirrors session/grounding.tsx's handleConfirmStop pattern: log enqueue failures but
    // always proceed to clear MMKV state and navigate, since the user already chose to stop.
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
      console.error('[CalmMeScreen] abandonment enqueue failed:', err)
    }

    clearSessionInProgress()
    if (sessionId) clearSessionIntention(sessionId)

    const completedAtMs = Date.now()
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/debrief?sessionId=${encodeURIComponent(sessionId)}&fearItemId=${fearItemId != null ? encodeURIComponent(fearItemId) : ''}&preSuds=${encodeURIComponent(String(preSuds))}&debriefSuds=${encodeURIComponent(String(freshSuds))}&peakSuds=${encodeURIComponent(String(freshSuds))}&completedAtMs=${encodeURIComponent(String(completedAtMs))}`
    )
  }

  return (
    <>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleExit}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.exit')}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.exitIcon}>✕</Text>
        </TouchableOpacity>

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

        {isInSession && !showDebriefConfirm && !showFreshSudsPrompt && (
          <View style={styles.actionFooter}>
            <TouchableOpacity
              style={styles.keepGoingButton}
              onPress={handleKeepGoing}
              accessibilityRole="button"
              accessibilityLabel={t('calmMe.keepGoing')}
            >
              <Text style={styles.keepGoingText}>{t('calmMe.keepGoing')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.needToStopButton}
              onPress={handleNeedToStop}
              accessibilityRole="button"
              accessibilityLabel={t('calmMe.needToStop')}
            >
              <Text style={styles.needToStopText}>{t('calmMe.needToStop')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showDebriefConfirm && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t('calmMe.debriefNow')}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmYesButton}
                onPress={handleConfirmYes}
                accessibilityRole="button"
                accessibilityLabel={t('calmMe.yes')}
              >
                <Text style={styles.confirmYesText}>{t('calmMe.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmNotNowButton}
                onPress={handleNotNow}
                accessibilityRole="button"
                accessibilityLabel={t('calmMe.notNow')}
              >
                <Text style={styles.confirmNotNowText}>{t('calmMe.notNow')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showFreshSudsPrompt && (
          <View style={styles.sudsPromptCard}>
            <Text style={styles.confirmTitle}>{t('session.active.sudsModalTitle')}</Text>
            <SudsScale value={null} onChange={handleFreshSudsSelected} />
          </View>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // flexGrow (not flex) on a ScrollView's contentContainerStyle — preserves the existing
  // marginTop:'auto' bottom-pinned footer behaviour for short content (the container still
  // grows to fill the viewport), while letting tall content (Story 9.3 max-font-size
  // walkthrough finding) scroll instead of being clipped off-screen.
  container: { flexGrow: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 },
  exitButton: { position: 'absolute', top: 48, right: 24, padding: 8, zIndex: 1 },
  exitIcon: { fontSize: 22, color: '#111827' },
  affirmation: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 32,
  },
  techniquePicker: { gap: 12, marginBottom: 24 },
  techniqueCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  techniqueLabel: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827' },
  actionFooter: { gap: 16, marginTop: 'auto' },
  keepGoingButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  keepGoingText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  needToStopButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  needToStopText: { color: '#374151', fontSize: 16 },
  confirmCard: { marginTop: 'auto', backgroundColor: '#f9fafb', borderRadius: 12, padding: 20 },
  confirmTitle: { fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'center', marginBottom: 16 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmYesButton: { flex: 1, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  confirmYesText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  confirmNotNowButton: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  confirmNotNowText: { color: '#374151', fontSize: 15 },
  sudsPromptCard: { marginTop: 'auto', backgroundColor: '#f9fafb', borderRadius: 12, padding: 20 },
})
