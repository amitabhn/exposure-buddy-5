import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { getAdapter } from '../../src/sync/adapter'
import { SudsScale } from '../../src/components/session/SudsScale'

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

  // Initialised to 1: the pre-session reading written in intent.tsx already counts.
  // Needed for COMPLETE_SESSION guard in Story 5.3.
  const [sudsReadingsCount, setSudsReadingsCount] = useState(1)
  const [sudsModalVisible, setSudsModalVisible] = useState(false)
  const [pendingSuds, setPendingSuds] = useState<number | null>(null)

  async function handleLogSuds() {
    if (pendingSuds === null) return
    setSudsModalVisible(false)

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
      setSudsReadingsCount(c => c + 1)
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
