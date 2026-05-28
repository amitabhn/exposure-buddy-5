import { useEffect, useRef } from 'react'
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
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
      }
      // Steps 3+ routes (ladder, complete) are created in Stories 4.3 and 4.4.
      // If progress is > 2, stay on welcome until those routes exist.
    }
  }, [isLoading, onboardingProgressStep, onboardingProgressReadFailed, router, t])

  function handleGetStarted() {
    setOnboardingProgressStep(1)
    router.push('/(onboarding)/assessment')
  }

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.container}>
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
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
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
