import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { BreathingCoach, color } from '@exposure-buddy/ui'
import { PHASE_ORDER } from '@exposure-buddy/core'
import { useAnimation } from '../../src/contexts/AnimationContext'
import { useBreathingPhase } from '../../src/hooks/useBreathingPhase'

const SESSION_COMPLETE_DISPLAY_MS = 1500

export default function BreathingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { reduced } = useAnimation()
  const { phaseIndex, isGuided, remainingSeconds, phaseElapsedMs, sessionEnded, endReason, onReadyPress } =
    useBreathingPhase()
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AC #6: timer-driven graceful end — show "Session complete" briefly, then navigate back.
  // AC #7: "I'm ready" early exit — navigate back immediately, no completion message.
  useEffect(() => {
    if (!sessionEnded) return
    if (endReason === 'early-exit') {
      router.back()
      return
    }
    if (endReason === 'timer') {
      completionTimeoutRef.current = setTimeout(() => router.back(), SESSION_COMPLETE_DISPLAY_MS)
      return () => {
        if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current)
      }
    }
  }, [sessionEnded, endReason, router])

  const phaseName = PHASE_ORDER[phaseIndex % PHASE_ORDER.length]!
  const promptText = t(`breathing.${phaseName}`)
  const readyLabel = t('breathing.passiveReady')

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
          {/* Decorative glyph, not reading content — scaling it with system font size
              breaks its layout (Story 9.3, Task 7 max-font-size walkthrough finding). */}
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.backIcon} allowFontScaling={false}>‹</Text>
        </TouchableOpacity>

        {sessionEnded && endReason === 'timer' ? (
          <Text style={styles.sessionComplete}>{t('breathing.sessionComplete')}</Text>
        ) : (
          <BreathingCoach
            phaseIndex={phaseIndex}
            isGuided={isGuided}
            remainingSeconds={remainingSeconds}
            phaseElapsedMs={phaseElapsedMs}
            reduced={reduced}
            promptText={promptText}
            readyLabel={readyLabel}
            onReadyPress={onReadyPress}
          />
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface.primary, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 48, left: 24, padding: 8, zIndex: 1 },
  backIcon: { fontSize: 28, color: '#111827' },
  sessionComplete: { fontSize: 16, color: '#374151' },
})
