import { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { GroundingPrompt, color } from '@exposure-buddy/ui'
import { GROUNDING_STEPS } from '@exposure-buddy/core'
import { useAnimation } from '../../src/contexts/AnimationContext'

export default function GroundingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reduced } = useAnimation()

  // Stable identity so GroundingPrompt's effects (keyed on `steps`) don't re-run every render.
  const steps = useMemo(
    () => GROUNDING_STEPS.map(({ promptKey }) => ({ promptText: t(promptKey) })),
    [t],
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.back')}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <GroundingPrompt
          steps={steps}
          gotItLabel={t('grounding541.gotIt')}
          doneFinalLabel={t('grounding541.doneFinal')}
          completeMessage={t('grounding541.complete')}
          doneLabel={t('grounding541.done')}
          againLabel={t('grounding541.again')}
          reduced={reduced}
          onComplete={() => router.back()}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface.primary, width: '100%', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 48, left: 24, padding: 8, zIndex: 1 },
  backIcon: { fontSize: 28, color: '#111827' },
})
