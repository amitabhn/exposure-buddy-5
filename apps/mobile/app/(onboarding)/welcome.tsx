import { useEffect, useRef } from 'react'
import { Alert, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { color } from '@exposure-buddy/ui'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isLoading, onboardingProgressStep, onboardingProgressReadFailed, setOnboardingProgressStep } = useAuth()
  // Gate one-shot resume logic — only act after MMKV state has been populated.
  const resumeHandled = useRef(false)

  useEffect(() => {
    if (isLoading) return  // wait for auth+MMKV state to settle before acting
    if (resumeHandled.current) return
    resumeHandled.current = true

    if (onboardingProgressReadFailed) {
      // MMKV threw on progress read — show toast (AC5) and stay on step 1
      Alert.alert(t('onboarding.resumeFailed.toast'))
      return
    }

    if (onboardingProgressStep !== null && onboardingProgressStep >= 2) {
      // Resume to saved step
      if (onboardingProgressStep === 2) {
        router.replace('/(onboarding)/assessment')
      } else if (onboardingProgressStep === 3) {
        router.replace('/(onboarding)/ladder')
      } else if (onboardingProgressStep === 4) {
        router.replace('/(onboarding)/complete')
      }
      // Steps 5+ — stay on welcome (no route exists; steps > 4 not used at MVP)
    }
  }, [isLoading, onboardingProgressStep, onboardingProgressReadFailed, router, t])

  function handleGetStarted() {
    setOnboardingProgressStep(1)
    router.push('/(onboarding)/assessment')
  }

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <OnboardingStepIndicator step={1} />
        <Text style={styles.title}>{t('onboarding.welcome.title')}</Text>
        <Text style={styles.body}>{t('onboarding.welcome.body')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.welcome.cta')}
        >
          <Text style={styles.buttonText}>{t('onboarding.welcome.cta')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: see session/briefing.tsx for the flexGrow fix pattern.
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: color.surface.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: color.content.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: color.content.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: color.accent.courage,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
})
