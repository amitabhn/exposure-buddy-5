import { useLayoutEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Modal } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getAdapter } from '../../src/sync/adapter'
import { SudsScale } from '../../src/components/session/SudsScale'
import { useAuth } from '@exposure-buddy/supabase'
import { transition } from '@exposure-buddy/core'
import { color, CalmMeButton } from '@exposure-buddy/ui'
import { consumeSessionResumedFlag, setResumeBannerVisible } from '../../src/state/sessionResumeFlag'

// Pure-JS UUID v4 — same pattern as ladder.tsx (Hermes limitation: no crypto.randomUUID)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function ActiveScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  const { clearSessionInProgress, setGroundingActive } = useAuth()

  // Story 18.2 — dismissible Insta Calm banner, shown only when this screen was reached via
  // a real recovery Resume (local or cross-device fallback), never on a normal fresh session
  // start. Lazy initializer consumes the one-shot flag exactly once, during this screen's
  // initial render — see sessionResumeFlag.ts for why the flag must be set synchronously by
  // handleRecoveryResume rather than via a useEffect there.
  const [showResumeBanner, setShowResumeBanner] = useState(() => consumeSessionResumedFlag(sessionId))

  // Publish visibility into the shared signal so the always-mounted global CalmMeFab can
  // suppress itself specifically while this banner is shown, reappearing once dismissed.
  // Not the same flag as above — this one is reactive and consumed by a sibling component.
  // useLayoutEffect (not useEffect): the banner itself is already visible synchronously in
  // this same initial render via showResumeBanner's lazy useState initializer, but a plain
  // useEffect publishes after paint — leaving a one-commit window where CalmMeFab (subscribed
  // via useSyncExternalStore) could still read stale `false` and render alongside the banner.
  useLayoutEffect(() => {
    setResumeBannerVisible(showResumeBanner)
    return () => setResumeBannerVisible(false)
  }, [showResumeBanner])

  function handleInstaCalmFromBanner() {
    // eslint-disable-next-line i18next/no-literal-string
    router.push('/calm-me?inSession=1')
  }

  function handleDismissResumeBanner() {
    setShowResumeBanner(false)
  }

  // Initialised to 1: the pre-session reading written in intent.tsx already counts.
  const [sudsReadingsCount, setSudsReadingsCount] = useState(1)
  // Track maximum SUDS seen across the session (for peakSuds on completion).
  // Initialised to parseInt(preSuds): the pre-session reading already counts.
  const [maxSudsLogged, setMaxSudsLogged] = useState(() => parseInt(preSuds ?? '0') || 0)
  const [sudsModalVisible, setSudsModalVisible] = useState(false)
  const [pendingSuds, setPendingSuds] = useState<number | null>(null)

  // Completion modal state
  const [completionModalVisible, setCompletionModalVisible] = useState(false)
  const [pendingDebriefSuds, setPendingDebriefSuds] = useState<number | null>(null)
  const [isCompletingSession, setIsCompletingSession] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const lastDebriefSudsRef = useRef<number | null>(null)

  async function handleLogSuds() {
    if (pendingSuds === null) return
    setSudsModalVisible(false)

    // Track peak SUDS outside try — reading was seen client-side regardless of enqueue success
    setMaxSudsLogged(m => Math.max(m, pendingSuds))  // outside try — track regardless of enqueue success
    setSudsReadingsCount(c => c + 1)                 // also outside try for same reason

    const now = new Date().toISOString()
    // NFR-PERF-02: enqueue() must return in < 500ms.
    // The no-op stub satisfies this trivially; Epic 6 must verify with real adapter.
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('suds_readings', 'INSERT', {
        id: generateUUID(),
        session_id: sessionId,
        suds_value: pendingSuds,
        recorded_at: now,
      })
    } catch (err) {
      console.error('[ActiveScreen] suds enqueue failed:', err)
    }
    setPendingSuds(null)
  }

  function handleStopExposure() {
    // active→grounding via exposure.stopped event
    // Story 9.2: mark grounding active before navigating, so a kill mid-grounding
    // can be distinguished from a kill mid-exposure on cold-start recovery.
    setGroundingActive()
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/grounding?sessionId=${sessionId}&fearItemId=${encodeURIComponent(fearItemId)}&description=${encodeURIComponent(description ?? '')}&preSuds=${preSuds}`
    )
  }

  async function handleCompleteSession(debriefSuds: number) {
    if (isCompletingSession) return  // double-tap guard
    setIsCompletingSession(true)
    setCompletionError(null)
    lastDebriefSudsRef.current = debriefSuds

    // 1. Fire state machine transition (guard: sudsReadingsCount ≥ 1, always true here)
    // eslint-disable-next-line i18next/no-literal-string
    const result = transition('active', { type: 'session.completed', sudsReadingsCount })
    if (!result.ok) { setIsCompletingSession(false); return }

    const endedAt = new Date().toISOString()
    const peakSuds = Math.max(maxSudsLogged, debriefSuds)
    const completedAtMs = Date.now()

    try {
      // 2. Enqueue exit suds_readings INSERT
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('suds_readings', 'INSERT', {
        id: generateUUID(),
        session_id: sessionId,
        suds_value: debriefSuds,
        recorded_at: endedAt,
      })

      // 3. Enqueue exposure_sessions UPDATE → 'completed'
      // NOTE: do NOT include expires_at — set server-side by set_session_expires_at trigger
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('exposure_sessions', 'UPDATE', {
        id: sessionId,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'completed',
        ended_at: endedAt,
      })

      // 4. Enqueue fear_ladder_items UPDATE → 'completed', set peak_suds
      // Guard: only enqueue if fearItemId is non-null (null fearItemId = no associated ladder item)
      if (fearItemId) {
        // eslint-disable-next-line i18next/no-literal-string
        await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
          id: fearItemId,
          // eslint-disable-next-line i18next/no-literal-string
          status: 'completed',
          peak_suds: peakSuds,
          updated_at: endedAt,
          updatedAt: Date.now(),  // last_write_wins timestamp guard (same pattern as Story 5.1)
        })
      }

      // 5. Clear SESSION_IN_PROGRESS — session is no longer resumable
      clearSessionInProgress()

      // 6. Navigate to debrief with completion params
      // NOTE: intentionText is NOT passed as URL param (too long, encoding issues).
      // debrief.tsx reads SESSION_INTENTION(sessionId) from MMKV via getSessionIntention() on mount.
      // Epic 6: peakSuds currently computed from tracked maxSudsLogged; replace with PowerSync query
      // of all suds_readings for this sessionId.
      // Reset before push: screen unmounts in production so the flag is invisible, but Fast Refresh
      // preserves component state across edits — resetting here prevents the stuck grey button on
      // the next dev-mode session start (VER-5-3-1).
      setIsCompletingSession(false)
      router.push(
        // eslint-disable-next-line i18next/no-literal-string
        `/session/debrief?sessionId=${sessionId}&fearItemId=${fearItemId != null ? encodeURIComponent(fearItemId) : ''}&preSuds=${preSuds}&debriefSuds=${debriefSuds}&peakSuds=${peakSuds}&completedAtMs=${completedAtMs}`
      )
    } catch (err) {
      console.error('[ActiveScreen] session completion failed:', err)
      setIsCompletingSession(false)
      setCompletionError(t('session.active.completionFailed'))
    }
  }

  return (
    <>
      {/* headerShown: false + gestureEnabled: false set in session/_layout.tsx */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{t('session.active.title')}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}

        {showResumeBanner ? (
          <View style={styles.resumeBanner}>
            <Text style={styles.resumeBannerHint}>{t('calmMe.fabHint')}</Text>
            <View style={styles.resumeBannerActions}>
              <CalmMeButton
                onPress={handleInstaCalmFromBanner}
                label={t('calmMe.fabLabel')}
                accessibilityLabel={t('calmMe.fab')}
              />
              <TouchableOpacity
                style={styles.resumeBannerDismiss}
                onPress={handleDismissResumeBanner}
                accessibilityRole="button"
                accessibilityLabel={t('calmMe.exit')}
              >
                <Text style={styles.resumeBannerDismissText}>{t('calmMe.exit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => { setPendingSuds(null); setSudsModalVisible(true) }}
            accessibilityRole="button"
            accessibilityLabel={t('session.active.logSuds')}
          >
            <Text style={styles.logButtonText}>{t('session.active.logSuds')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => { setPendingDebriefSuds(null); setCompletionModalVisible(true) }}
            accessibilityRole="button"
            accessibilityLabel={t('session.active.completeExposure')}
          >
            <Text style={styles.completeButtonText}>{t('session.active.completeExposure')}</Text>
          </TouchableOpacity>

          {completionError ? (
            <View>
              <Text
                // eslint-disable-next-line i18next/no-literal-string
                accessibilityLiveRegion="polite"
                style={styles.completionErrorText}
              >{completionError}</Text>
              <Pressable
                onPress={() => lastDebriefSudsRef.current !== null && handleCompleteSession(lastDebriefSudsRef.current)}
                disabled={isCompletingSession || completionModalVisible}
                accessibilityRole="button"
                accessibilityLabel={t('session.active.tryAgain')}
                accessibilityState={{ disabled: isCompletingSession || completionModalVisible }}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>{t('session.active.tryAgain')}</Text>
              </Pressable>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopExposure}
            accessibilityRole="button"
            accessibilityLabel={t('session.active.stopExposure')}
            accessibilityHint={t('session.active.stopExposureHint')}
          >
            <Text style={styles.stopButtonText}>{t('session.active.stopExposure')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUDS logging modal */}
      <Modal
        visible={sudsModalVisible}
        transparent
        // eslint-disable-next-line i18next/no-literal-string
        animationType="slide"
        // eslint-disable-next-line i18next/no-literal-string
        presentationStyle="overFullScreen"
        onRequestClose={() => setSudsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('session.active.sudsModalTitle')}</Text>
            <SudsScale value={pendingSuds} onChange={setPendingSuds} />
            <TouchableOpacity
              style={[styles.logConfirmButton, pendingSuds === null && styles.logConfirmDisabled]}
              onPress={handleLogSuds}
              disabled={pendingSuds === null}
              accessibilityRole="button"
              accessibilityLabel={t('session.active.logButton')}
            >
              <Text style={styles.logConfirmText}>{t('session.active.logButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSudsModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('ladder.cancel')}
            >
              <Text style={styles.cancelText}>{t('ladder.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Completion modal */}
      <Modal
        visible={completionModalVisible}
        transparent
        // eslint-disable-next-line i18next/no-literal-string
        animationType="slide"
        // eslint-disable-next-line i18next/no-literal-string
        presentationStyle="overFullScreen"
        onRequestClose={() => { setCompletionModalVisible(false); setCompletionError(null) }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('session.active.completionModalTitle')}</Text>
            <SudsScale value={pendingDebriefSuds} onChange={setPendingDebriefSuds} />
            <TouchableOpacity
              style={[
                styles.logConfirmButton,
                (pendingDebriefSuds === null || isCompletingSession) && styles.logConfirmDisabled,
              ]}
              onPress={() => {
                if (pendingDebriefSuds !== null) {
                  setCompletionModalVisible(false)
                  handleCompleteSession(pendingDebriefSuds)
                }
              }}
              disabled={pendingDebriefSuds === null || isCompletingSession}
              accessibilityRole="button"
              accessibilityLabel={t('session.active.finishSession')}
            >
              <Text style={styles.logConfirmText}>{t('session.active.finishSession')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCompletionModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t('ladder.cancel')}
            >
              <Text style={styles.cancelText}>{t('ladder.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface.primary, paddingHorizontal: 24, paddingBottom: 32 },
  // paddingRight reserves space for the Calm Me FAB (top-right, ~88pt footprint)
  title: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 12, paddingRight: 88 },
  description: { fontSize: 16, color: color.content.secondary, lineHeight: 24, marginBottom: 32 },
  resumeBanner: {
    backgroundColor: color.surface.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  resumeBannerHint: { fontSize: 14, color: color.content.secondary, lineHeight: 20 },
  resumeBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resumeBannerDismiss: { paddingVertical: 10, paddingHorizontal: 8 },
  resumeBannerDismissText: { color: color.content.secondary, fontSize: 14, textDecorationLine: 'underline' },
  actions: { flex: 1, justifyContent: 'center', gap: 16 },
  logButton: { backgroundColor: color.accent.courage, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  logButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  // #0f766e — completed/success semantic colour, out of scope per Story 12.5; left unchanged.
  completeButton: { backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  completeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  completionErrorText: { fontSize: 14, color: '#ef4444', lineHeight: 20 },
  retryButton: { marginTop: 8, alignSelf: 'flex-start' },
  retryButtonText: { fontSize: 14, color: color.accent.courage, textDecorationLine: 'underline' },
  stopButton: { borderWidth: 1, borderColor: color.surface.secondary, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  stopButtonText: { color: color.content.secondary, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: color.surface.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 48 },
  modalTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 20 },
  logConfirmButton: { backgroundColor: color.accent.courage, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  logConfirmDisabled: { backgroundColor: color.surface.secondary },
  logConfirmText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: color.content.secondary, fontSize: 15 },
})
