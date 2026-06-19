import React, { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { BREATHING_PATTERN, PHASE_ORDER } from '@exposure-buddy/core'
import type { BreathingPhaseName } from '@exposure-buddy/core'
import { color, spacing, tapTarget } from '../tokens/theme'

export interface BreathingCoachProps {
  phaseIndex: number // 0–3, see PHASE_ORDER
  isGuided: boolean
  remainingSeconds: number
  phaseElapsedMs: number
  reduced: boolean
  promptText: string // translated text for the current phase — also used as the live-region announcement
  readyLabel: string // translated "I'm ready" label
  onReadyPress: () => void
}

const RING_SIZE = 200
const RING_BASE_SCALE = 1
const RING_PULSE_SCALE = 1.3
const RING_BORDER_WIDTH = 3
// The ring's pulse is a transform, which doesn't reserve extra layout space — without a
// slot sized to the peak scale, the ring visually grows into whatever sits below it.
const RING_SLOT_SIZE = RING_SIZE * RING_PULSE_SCALE

function phaseName(phaseIndex: number): BreathingPhaseName {
  return PHASE_ORDER[phaseIndex % PHASE_ORDER.length]!
}

function formatMMSS(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Per-phase numeric countdown for the reduced-motion fallback (AC #11) — e.g. "4", "3", "2", "1".
// Derived from the same shared-clock state the hook already tracks, not a second timer.
function phaseSecondsRemaining(phaseIndex: number, phaseElapsedMs: number): number {
  const duration = BREATHING_PATTERN[phaseName(phaseIndex)]
  return Math.max(1, duration - Math.floor(phaseElapsedMs / 1000))
}

export const BreathingCoach = React.forwardRef<
  React.ElementRef<typeof View>,
  BreathingCoachProps
>(function BreathingCoach(
  { phaseIndex, isGuided, remainingSeconds, phaseElapsedMs, reduced, promptText, readyLabel, onReadyPress },
  ref,
) {
  const scale = useSharedValue(RING_BASE_SCALE)

  // AC #10: live region on every phase change, continuing identically through the passive
  // phase (AC #5) — the guided→passive structural transition itself gets no announcement.
  // Uses the full translated phrase even in reduced motion (AC #11), since it's the only
  // timing cue available without the ring.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(promptText)
  }, [phaseIndex])

  // Ring size tracks the breathing pattern directly, not a free-running loop: it grows over
  // the full inhale duration, holds constant at peak through holdIn, shrinks over the full
  // exhale duration, then holds constant at rest through holdOut. Same contract for every
  // future breathing technique (see visual-design-foundation.md "Breathing techniques").
  // AC #11: static ring when reduced — no transform at all.
  useEffect(() => {
    if (reduced) {
      cancelAnimation(scale)
      scale.value = RING_BASE_SCALE
      return
    }
    const name = phaseName(phaseIndex)
    const durationMs = BREATHING_PATTERN[name] * 1000
    switch (name) {
      case 'inhale':
        scale.value = withTiming(RING_PULSE_SCALE, { duration: durationMs, easing: Easing.inOut(Easing.ease) })
        break
      case 'holdIn':
        cancelAnimation(scale)
        scale.value = RING_PULSE_SCALE
        break
      case 'exhale':
        scale.value = withTiming(RING_BASE_SCALE, { duration: durationMs, easing: Easing.inOut(Easing.ease) })
        break
      case 'holdOut':
        cancelAnimation(scale)
        scale.value = RING_BASE_SCALE
        break
    }
    return () => cancelAnimation(scale)
  }, [phaseIndex, reduced, scale])

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <View ref={ref} style={styles.container}>
      <View style={styles.ringSlot}>
        <Animated.View style={[styles.ring, ringStyle]} />
      </View>

      {/* Instructions stay visible for the whole session, guided and passive alike — the
          phase cycle (and its live-region announcement) runs identically in both. */}
      <Text style={styles.prompt}>
        {reduced
          ? `${phaseSecondsRemaining(phaseIndex, phaseElapsedMs)}…`
          : promptText}
      </Text>

      <Text style={styles.timer}>{formatMMSS(remainingSeconds)}</Text>

      {!isGuided && (
        <TouchableOpacity
          style={styles.readyButton}
          onPress={onReadyPress}
          accessibilityRole="button"
          accessibilityLabel={readyLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.readyLabel}>{readyLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface.primary,
    gap: spacing[6],
  },
  ringSlot: {
    // Reserves layout space for the ring's peak pulse scale, not just its resting size, so
    // the transform-driven animation never overlaps the text below it.
    width: RING_SLOT_SIZE,
    height: RING_SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'transparent',
    borderWidth: RING_BORDER_WIDTH,
    borderColor: color.accent.courage,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: color.content.primary,
  },
  timer: {
    fontSize: 16,
    color: color.content.secondary,
  },
  readyButton: {
    minHeight: tapTarget.inTheMoment,
    paddingHorizontal: spacing[6],
    borderRadius: tapTarget.inTheMoment / 2,
    backgroundColor: color.accent.courage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
