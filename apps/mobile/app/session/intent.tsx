import { useReducer } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import type { SessionRecoveryData } from '@exposure-buddy/core'
import { getAdapter } from '../../src/sync/adapter'
import { SudsScale } from '../../src/components/session/SudsScale'
import { BackButton } from '../../src/components/navigation/BackButton'

// Pure-JS UUID v4 — same pattern as ladder.tsx (Hermes limitation: no crypto.randomUUID)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

type IntentState = {
  preSuds: number | null
  intentionText: string
  hasAttemptedSubmit: boolean
  isSubmitting: boolean
}

type IntentAction =
  | { type: 'SET_SUDS'; value: number }
  | { type: 'SET_INTENTION'; text: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_DONE' }

function intentReducer(state: IntentState, action: IntentAction): IntentState {
  switch (action.type) {
    case 'SET_SUDS':    return { ...state, preSuds: action.value }
    case 'SET_INTENTION': return { ...state, intentionText: action.text }
    case 'SUBMIT':       return { ...state, hasAttemptedSubmit: true, isSubmitting: true }
    case 'SUBMIT_DONE':  return { ...state, isSubmitting: false }
    default:             return state
  }
}

export default function IntentScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { fearItemId, sessionId, description, predictedSuds } = useLocalSearchParams<{
    fearItemId: string
    sessionId: string
    description: string
    predictedSuds: string
  }>()

  const { authState, isAuthenticated, setSessionInProgress, setSessionIntention } = useAuth()
  const userId = authState.userId

  const [state, dispatch] = useReducer(intentReducer, {
    preSuds: null,
    intentionText: '',
    hasAttemptedSubmit: false,
    isSubmitting: false,
  })

  const showRecommendedHint = parseInt(predictedSuds ?? '0', 10) >= 7

  async function handleContinue() {
    // DPDPA ADR-008: Both exposure_sessions and suds_readings are Health data.
    // Consent established at onboarding (OTP flow); isAuthenticated is the current proxy.
    // P14: gate on isAuthenticated explicitly with this comment per architecture MUST rule.
    if (!isAuthenticated || !userId || state.preSuds === null || state.isSubmitting) return

    dispatch({ type: 'SUBMIT' })
    const now = new Date().toISOString()

    try {
      const trimmedIntention = state.intentionText.trim()

      // (a) Store intention text in MMKV if written (cleared on abandonment/completion)
      if (trimmedIntention) {
        setSessionIntention(sessionId, trimmedIntention)
      }

      // (b) Enqueue exposure_sessions INSERT (P2: include pre_session_intention at write time)
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('exposure_sessions', 'INSERT', {
        id: sessionId,
        user_id: userId,
        fear_item_id: fearItemId,
        // eslint-disable-next-line i18next/no-literal-string
        session_type: 'erp',
        // eslint-disable-next-line i18next/no-literal-string
        status: 'started',
        pre_session_intention: trimmedIntention || null,
        started_at: now,
        created_at: now,
      })

      // (c) Enqueue suds_readings INSERT for pre-exposure reading
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('suds_readings', 'INSERT', {
        id: generateUUID(),
        session_id: sessionId,
        suds_value: state.preSuds,
        recorded_at: now,
      })

      // (d) Enqueue fear_ladder_items UPDATE status → in_progress (last_write_wins guard)
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
        id: fearItemId,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'in_progress',
        updated_at: now,
        updatedAt: Date.now(),
      })

      // (e) Write SESSION_IN_PROGRESS JSON blob to MMKV
      const recoveryData: SessionRecoveryData = {
        sessionId,
        fearItemId,
        preSuds: state.preSuds,
        description: description ?? '',
      }
      setSessionInProgress(recoveryData)

      // (f) session.started event: idle→pre_session (state machine is informational at screen level)

      // (g) Navigate to pause screen
      router.push(
        // eslint-disable-next-line i18next/no-literal-string
        `/session/pause?sessionId=${sessionId}&fearItemId=${encodeURIComponent(fearItemId)}&description=${encodeURIComponent(description ?? '')}&preSuds=${state.preSuds}`
      )
    } catch (err) {
      console.error('[IntentScreen] enqueue failed:', err)
      dispatch({ type: 'SUBMIT_DONE' })
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('session.intent.title'),
          headerShadowVisible: false,
          // eslint-disable-next-line i18next/no-literal-string
          headerStyle: { backgroundColor: '#ffffff' },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {description ? (
          <Text style={styles.descriptionContext}>{description}</Text>
        ) : null}

        <Text style={styles.label}>{t('session.intent.sudsLabel')}</Text>
        <SudsScale value={state.preSuds} onChange={(v) => dispatch({ type: 'SET_SUDS', value: v })} />

        <Text style={styles.label}>{t('session.intent.intentionPrompt')}</Text>
        <TextInput
          style={styles.textInput}
          value={state.intentionText}
          onChangeText={(text) => dispatch({ type: 'SET_INTENTION', text })}
          placeholder={t('session.intent.intentionPlaceholder')}
          multiline
          maxLength={500}
          accessibilityLabel={t('session.intent.intentionPrompt')}
        />
        {showRecommendedHint && (
          <Text style={styles.hint}>{t('session.intent.intentionRecommended')}</Text>
        )}

        <TouchableOpacity
          style={[styles.continueButton, (state.preSuds === null || state.isSubmitting) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={state.preSuds === null || state.isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={t('session.intent.continue')}
          accessibilityState={{ disabled: state.preSuds === null || state.isSubmitting }}
        >
          <Text style={styles.continueText}>{t('session.intent.continue')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  descriptionContext: { fontSize: 16, color: '#374151', marginBottom: 24, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12, marginTop: 8 },
  textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 12, backgroundColor: '#f9fafb', minHeight: 80 },
  hint: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 16 },
  continueButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  continueButtonDisabled: { backgroundColor: '#d1d5db' },
  continueText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
