import { useReducer, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { SudsArcChart, typography } from '@exposure-buddy/ui'
import type { DmSerifSurface } from '@exposure-buddy/ui'
import { getAdapter } from '../../src/sync/adapter'

// Compile-time guard — this screen is the prediction-reality-reveal DM Serif surface (UX-DR21)
const DEBRIEF_SURFACE = 'prediction-reality-reveal' satisfies DmSerifSurface

type DebriefState = {
  reflectionText: string
  hasAttemptedSubmit: boolean
  isSubmitting: boolean
}

type DebriefAction =
  | { type: 'SET_REFLECTION'; value: string }
  | { type: 'SUBMIT_ATTEMPTED' }
  | { type: 'SET_SUBMITTING'; value: boolean }

function debriefReducer(state: DebriefState, action: DebriefAction): DebriefState {
  switch (action.type) {
    case 'SET_REFLECTION': return { ...state, reflectionText: action.value }
    case 'SUBMIT_ATTEMPTED': return { ...state, hasAttemptedSubmit: true }
    case 'SET_SUBMITTING': return { ...state, isSubmitting: action.value }
    default: return state
  }
}

export default function DebriefScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const {
    clearSessionIntention,
    getSessionIntention,
  } = useAuth()

  const {
    sessionId,
    fearItemId,
    preSuds,
    debriefSuds,
    peakSuds,
    readOnly,
  } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    preSuds: string
    debriefSuds: string
    peakSuds: string
    completedAtMs: string
    readOnly?: string
  }>()

  const isReadOnly = readOnly === 'true'

  const [state, dispatch] = useReducer(debriefReducer, {
    reflectionText: '',
    hasAttemptedSubmit: false,
    isSubmitting: false,
  })
  const [saveError, setSaveError] = useState<string | null>(null)

  // Read letter text once at mount — useState initializer prevents branch flipping on re-renders
  // after clearSessionIntention() fires inside handleSubmitReflection.
  const [intentionText] = useState(() => getSessionIntention(sessionId))
  const hasLetter = !!(intentionText && intentionText.trim().length > 0)

  const preSudsInt = parseInt(preSuds ?? '0') || 0
  const debriefSudsInt = parseInt(debriefSuds ?? '0') || 0
  const peakSudsInt = parseInt(peakSuds ?? '0') || 0

  // Determine branch
  const branch: 'A' | 'B' | 'C' = hasLetter ? 'A'
    : debriefSudsInt < preSudsInt ? 'B' : 'C'

  // Build readings for SudsArcChart — MVP stub with just pre and exit
  // Epic 6: replace with full readings from PowerSync suds_readings query for this sessionId
  const readings: number[] = [preSudsInt, debriefSudsInt]

  // Show SUDS arc on Branch A and B; NOT on Branch C (UX spec)
  const showSudsArc = branch === 'A' || branch === 'B'
  // Trigger crisis contacts: debriefSuds >= 8 OR peakSuds >= 8 (⚠ clinician review)
  const showCrisisContacts = debriefSudsInt >= 8 || peakSudsInt >= 8

  async function handleSubmitReflection() {
    if (isReadOnly) return  // guard: read-only mode has no submit path

    setSaveError(null)
    dispatch({ type: 'SET_SUBMITTING', value: true })
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('exposure_sessions', 'UPDATE', {
        id: sessionId,
        post_session_reflection: state.reflectionText.trim() || null,
      })

      // Only clear intention text in the submit path (not in readOnly mode)
      clearSessionIntention(sessionId)

      router.replace('/')
    } catch (err) {
      console.error('[DebriefScreen] reflection enqueue failed:', err)
      dispatch({ type: 'SET_SUBMITTING', value: false })
      setSaveError(t('session.debrief.saveFailed'))
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Branch A — intention letter present (DM Serif prediction-reality-reveal surface, UX-DR21) */}
        {branch === 'A' && (
          <View style={styles.letterSection} testID={`debrief-surface-${DEBRIEF_SURFACE}`}>
            <Text style={styles.letterIntroText}>{t('session.debrief.letterIntro')}</Text>
            <Text style={styles.letterText}>{intentionText}</Text>
          </View>
        )}

        {/* Branch B — no intention, SUDS improved */}
        {branch === 'B' && (
          <View style={styles.acknowledgementSection}>
            <Text style={styles.acknowledgementText}>{t('session.debrief.acknowledgement')}</Text>
          </View>
        )}

        {/* Branch C — no intention, no improvement */}
        {branch === 'C' && (
          <View style={styles.acknowledgementSection}>
            <Text style={styles.acknowledgementText}>{t('session.debrief.acknowledgementNoImprovement')}</Text>
          </View>
        )}

        {/* SUDS arc chart — Branches A and B only */}
        {showSudsArc && (
          <SudsArcChart
            readings={readings}
            accessibilityLabel={t('session.debrief.title')}
          />
        )}

        {/* FR-ADVERSE-01: Crisis contacts when exit SUDS >= 8 or peak SUDS >= 8 */}
        {showCrisisContacts && (
          <View style={styles.crisisSection}>
            <Text style={styles.crisisHeading}>{t('session.debrief.crisisHeading')}</Text>
            {/* eslint-disable i18next/no-literal-string */}
            <TouchableOpacity
              onPress={() => Linking.openURL('tel:9152987821')}
              accessibilityRole="link"
              accessibilityLabel="iCall: 9152987821"
            >
              <Text style={styles.crisisContact}>iCall: 9152987821</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('tel:9999666555')}
              accessibilityRole="link"
              accessibilityLabel="Vandrevala Foundation: 9999-666-555"
            >
              <Text style={styles.crisisContact}>Vandrevala Foundation: 9999-666-555</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('tel:18008914416')}
              accessibilityRole="link"
              accessibilityLabel="Tele MANAS: 1800-891-4416"
            >
              <Text style={styles.crisisContact}>Tele MANAS: 1800-891-4416</Text>
            </TouchableOpacity>
            {/* eslint-enable i18next/no-literal-string */}
          </View>
        )}

        {/* Reflection field and Done CTA — only in non-read-only mode */}
        {!isReadOnly && (
          <>
            <Text style={styles.reflectionLabel}>{t('session.debrief.reflectionPrompt')}</Text>
            <TextInput
              style={styles.reflectionInput}
              value={state.reflectionText}
              onChangeText={v => dispatch({ type: 'SET_REFLECTION', value: v })}
              placeholder={t('session.debrief.reflectionPlaceholder')}
              multiline
              maxLength={500}
              accessibilityLabel={t('session.debrief.reflectionPrompt')}
            />
            {saveError ? (
              <View>
                <Text
                  // eslint-disable-next-line i18next/no-literal-string
                  accessibilityLiveRegion="polite"
                  style={styles.saveErrorText}
                >{saveError}</Text>
                <Pressable
                  onPress={handleSubmitReflection}
                  accessibilityRole="button"
                  accessibilityLabel={t('session.debrief.tryAgain')}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>{t('session.debrief.tryAgain')}</Text>
                </Pressable>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.doneButton, state.isSubmitting && styles.doneButtonDisabled]}
              onPress={handleSubmitReflection}
              disabled={state.isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('session.debrief.done')}
            >
              <Text style={styles.doneButtonText}>{t('session.debrief.done')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Read-only mode: back button only */}
        {isReadOnly && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('session.debrief.done')}
          >
            <Text style={styles.doneButtonText}>{t('session.debrief.done')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48 },
  letterSection: { marginBottom: 24 },
  letterIntroText: { ...typography.display, color: '#6b7280', marginBottom: 16 },
  letterText: { ...typography.narrative, color: '#111827' },
  acknowledgementSection: { marginBottom: 24 },
  acknowledgementText: { ...typography.narrative, color: '#111827' },
  crisisSection: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 16, marginBottom: 24 },
  crisisHeading: { fontSize: 14, fontWeight: '600', color: '#991b1b', marginBottom: 12, fontFamily: 'Inter_600SemiBold' },
  crisisContact: { fontSize: 16, color: '#1d4ed8', marginBottom: 8, textDecorationLine: 'underline' },
  reflectionLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8, fontFamily: 'Inter_600SemiBold' },
  reflectionInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  saveErrorText: { fontSize: 14, color: '#ef4444', lineHeight: 20, marginBottom: 8 },
  retryButton: { marginBottom: 12, alignSelf: 'flex-start' },
  retryButtonText: { fontSize: 14, color: '#1d4ed8', textDecorationLine: 'underline' },
  doneButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  doneButtonDisabled: { backgroundColor: '#d1d5db' },
  doneButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
