import { Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ONBOARDING_STEP_COUNT } from '@exposure-buddy/core'

interface OnboardingStepIndicatorProps {
  step: number
}

export function OnboardingStepIndicator({ step }: OnboardingStepIndicatorProps) {
  const { t } = useTranslation()
  return (
    <Text
      style={styles.text}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}
    >
      {t('onboarding.stepIndicator', { current: step, total: ONBOARDING_STEP_COUNT })}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
})
