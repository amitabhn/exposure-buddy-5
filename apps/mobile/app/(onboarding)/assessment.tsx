import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'
import { SudsCalibrationWidget } from '../../src/components/onboarding/SudsCalibrationWidget'
import { getAdapter } from '../../src/sync/adapter'

// Pure-JS UUID v4 — avoids native module dependency (crypto global absent in Hermes without polyfill)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function AssessmentScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId, setOnboardingProgressStep, setSudsCalibration } = useAuth()
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Save progress to MMKV on mount so resume logic routes here if app is closed
  useEffect(() => {
    setOnboardingProgressStep(2)
  }, [setOnboardingProgressStep])

  async function handleNext() {
    if (selectedValue === null) return
    if (!userId) return  // always non-null behind the onboarding auth gate; guard satisfies TypeScript
    setSaveError(null)
    setSudsCalibration(selectedValue)
    setOnboardingProgressStep(3)  // local state first — intent committed before fallible I/O
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('user_onboarding_metadata', 'INSERT', {
        id: generateUUID(),  // client-generated UUID: offline-first pattern
        user_id: userId,
        suds_calibration_value: selectedValue,
        completed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[AssessmentScreen] enqueue failed — calibration value persisted locally:', err)
      setSaveError(t('onboarding.assessment.saveFailed'))
      return
    }
    router.replace('/(onboarding)/ladder')
  }

  return (
    <>
      {/* Back gesture is available on step 2 — no gestureEnabled: false */}
      <Stack.Screen options={{}} />
      <ScrollView contentContainerStyle={styles.container}>
        <OnboardingStepIndicator step={2} />

        {/* Psychoeducation section */}
        <Text style={styles.title}>{t('onboarding.assessment.title')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body1')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body2')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body3')}</Text>

        {/* SUDS calibration section */}
        <Text style={styles.sectionTitle}>{t('onboarding.assessment.calibrationTitle')}</Text>
        <Text style={styles.scenario}>{t('onboarding.assessment.practiceScenario')}</Text>
        <SudsCalibrationWidget value={selectedValue} onChange={setSelectedValue} />

        {saveError ? (
          <View>
            <Text
              // eslint-disable-next-line i18next/no-literal-string
              accessibilityLiveRegion="polite"
              style={styles.saveErrorText}
            >{saveError}</Text>
            <Pressable
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.assessment.trySaving')}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>{t('onboarding.assessment.trySaving')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* "Feeling overwhelmed?" — persistent, always visible */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/crisis')}
          accessibilityRole="link"
          accessibilityLabel={t('onboarding.overwhelmed.cta')}
          style={styles.overwhelmedLink}
        >
          <Text style={styles.overwhelmedText}>{t('onboarding.overwhelmed.cta')}</Text>
        </TouchableOpacity>

        {/* Next button — disabled until value selected */}
        <TouchableOpacity
          style={[styles.button, selectedValue === null && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={selectedValue === null}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.assessment.cta')}
          accessibilityState={{ disabled: selectedValue === null }}
        >
          <Text style={styles.buttonText}>{t('onboarding.assessment.cta')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  scenario: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  saveErrorText: { fontSize: 14, color: '#ef4444', marginTop: 16, lineHeight: 20 },
  retryButton: { marginTop: 8, alignSelf: 'flex-start' },
  retryButtonText: { fontSize: 14, color: '#1d4ed8', textDecorationLine: 'underline' },
  overwhelmedLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  overwhelmedText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
})
