import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { getAdapter } from '../../src/sync/adapter'
import { SudsScale } from '../../src/components/session/SudsScale'
import { useAuth } from '@exposure-buddy/supabase'
import { transition } from '@exposure-buddy/core'

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
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  const { authState, hasSessionIntention, setDebriefPending, clearSessionInProgress } = useAuth()

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
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/grounding?sessionId=${sessionId}&fearItemId=${encodeURIComponent(fearItemId)}&description=${encodeURIComponent(description ?? '')}&preSuds=${preSuds}`
    )
  }

  async function handleCompleteSession(debriefSuds: number) {
    if (isCompletingSession) return  // double-tap guard
    setIsCompletingSession(true)

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

      // 5. Check if intention letter exists — via useAuth() helper (no direct MMKV access in screens)
      const hasLetter = hasSessionIntention(sessionId)

      // 6. Write SESSION_DEBRIEF_PENDING — used by home screen for states 7/8
      setDebriefPending({
        sessionId,
        fearItemId: fearItemId ?? null,
        completedAtMs,
        preSuds: parseInt(preSuds ?? '0') || 0,
        debriefSuds,
        peakSuds,
        hasLetter,
        reflectionSubmitted: false,
      })

      // 7. Clear SESSION_IN_PROGRESS — session is no longer resumable
      clearSessionInProgress()

      // 8. Navigate to debrief with completion params
      // NOTE: intentionText is NOT passed as URL param (too long, encoding issues).
      // debrief.tsx reads SESSION_INTENTION(sessionId) from MMKV via getSessionIntention() on mount.
      // Epic 6: peakSuds currently computed from tracked maxSudsLogged; replace with PowerSync query
      // of all suds_readings for this sessionId.
      router.push(
        // eslint-disable-next-line i18next/no-literal-string
        `/session/debrief?sessionId=${sessionId}&fearItemId=${fearItemId != null ? encodeURIComponent(fearItemId) : ''}&preSuds=${preSuds}&debriefSuds=${debriefSuds}&peakSuds=${peakSuds}&completedAtMs=${completedAtMs}`
      )
    } catch (err) {
      console.error('[ActiveScreen] session completion failed:', err)
      setIsCompletingSession(false)
    }
  }

  return (
    <>
      {/* headerShown: false + gestureEnabled: false set in session/_layout.tsx */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('session.active.title')}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}

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

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopExposure}
            accessibilityRole="button"
            accessibilityLabel={t('session.active.stopExposure')}
          >
            <Text style={styles.stopButtonText}>{t('session.active.stopExposure')}</Text>
          </TouchableOpacity>
        </View>

        {/* CalmMe button — always accessible, UX-DR04 */}
        <TouchableOpacity
          style={styles.calmMeButton}
          onPress={() => router.push('/calm-me')}
          accessibilityRole="button"
          accessibilityLabel={t('session.active.calmMe')}
        >
          <Text style={styles.calmMeText}>{t('session.active.calmMe')}</Text>
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSudsModalVisible(false)}>
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
        onRequestClose={() => setCompletionModalVisible(false)}
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
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 12 },
  description: { fontSize: 16, color: '#374151', lineHeight: 24, marginBottom: 32 },
  actions: { flex: 1, justifyContent: 'center', gap: 16 },
  logButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  logButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  completeButton: { backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  completeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  stopButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  stopButtonText: { color: '#374151', fontSize: 16 },
  calmMeButton: { paddingVertical: 14, alignItems: 'center' },
  calmMeText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 48 },
  modalTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 20 },
  logConfirmButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  logConfirmDisabled: { backgroundColor: '#d1d5db' },
  logConfirmText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#6b7280', fontSize: 15 },
})
