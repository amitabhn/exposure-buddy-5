import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'

// Minimal stub — full SUDS assessment implemented in Story 4.2
export default function AssessmentScreen() {
  const { t } = useTranslation()
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.container}>
        <OnboardingStepIndicator step={2} />
        <Text style={styles.title}>{t('onboarding.assessment.title')}</Text>
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
})
