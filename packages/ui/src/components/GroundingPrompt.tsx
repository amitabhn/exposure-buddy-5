import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { color, groundingTokens } from '../tokens/theme'

export interface GroundingPromptProps {
  steps: { promptText: string }[] // ordered, pre-translated, 5 items
  gotItLabel: string
  doneFinalLabel: string
  completeMessage: string
  doneLabel: string
  againLabel: string
  reduced: boolean
  onComplete: () => void // fires only on the completion view's "Done" tap
}

// groundingTokens.motion.easing is the literal 'easeInOut' register for this component.
const GROUNDING_EASING = Easing.inOut(Easing.ease)

export const GroundingPrompt = React.forwardRef<
  React.ElementRef<typeof View>,
  GroundingPromptProps
>(function GroundingPrompt(
  { steps, gotItLabel, doneFinalLabel, completeMessage, doneLabel, againLabel, reduced, onComplete },
  ref,
) {
  const total = steps.length
  const [stepIndex, setStepIndex] = useState(0)
  const [complete, setComplete] = useState(false)
  // Guards against rapid double-tap advancing two steps (or firing onComplete twice) — a ref,
  // not state, so a second synchronous press in the same tick still sees the lock. Unlocked by
  // transitionTick below, which increments on every handler call regardless of whether
  // stepIndex/complete actually change (handleDone changes neither, since it just calls
  // onComplete — without this, the guard would stay locked forever after one "Done" tap).
  const transitioningRef = useRef(false)
  const [transitionTick, setTransitionTick] = useState(0)
  const opacity = useSharedValue(1)

  // AC #7: live region — step counter read before the prompt text, on mount and every step
  // change; a second announcement fires on entering the completion view.
  useEffect(() => {
    if (complete) {
      AccessibilityInfo.announceForAccessibility(completeMessage)
      return
    }
    const promptText = steps[stepIndex]?.promptText ?? ''
    AccessibilityInfo.announceForAccessibility(`Step ${stepIndex + 1} of ${total}. ${promptText}`)
  }, [stepIndex, complete, steps, total, completeMessage])

  // AC #8, #10: cross-fade keyed on the displayed content (step index, or the completion view,
  // including the "Go again" reset — just another transition, not a special-cased snap).
  // Reduced motion sets opacity directly with no withTiming call (instant, no decoration).
  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity)
      opacity.value = 1
      return
    }
    opacity.value = 0
    opacity.value = withTiming(1, {
      duration: groundingTokens.motion.duration,
      easing: GROUNDING_EASING,
    })
    return () => cancelAnimation(opacity)
  }, [stepIndex, complete, reduced])

  // Unlocks the transition guard after every handler call, not just ones that change
  // stepIndex/complete (handleDone changes neither).
  useEffect(() => {
    transitioningRef.current = false
  }, [transitionTick])

  const contentStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  function handleAdvance() {
    if (transitioningRef.current) return
    transitioningRef.current = true
    setTransitionTick((t) => t + 1)
    if (stepIndex < total - 1) {
      setStepIndex((i) => i + 1)
    } else {
      setComplete(true)
    }
  }

  function handleDone() {
    if (transitioningRef.current) return
    transitioningRef.current = true
    setTransitionTick((t) => t + 1)
    onComplete()
  }

  function handleAgain() {
    if (transitioningRef.current) return
    transitioningRef.current = true
    setTransitionTick((t) => t + 1)
    setComplete(false)
    setStepIndex(0)
  }

  if (complete) {
    return (
      <View ref={ref} style={styles.container}>
        <Animated.View style={contentStyle}>
          <Text style={styles.message}>{completeMessage}</Text>
        </Animated.View>
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.cta}
            onPress={handleDone}
            accessibilityRole="button"
            accessibilityLabel={doneLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.ctaLabel}>{doneLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, styles.ctaSecondary]}
            onPress={handleAgain}
            accessibilityRole="button"
            accessibilityLabel={againLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.ctaLabel}>{againLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const isLastStep = stepIndex === total - 1
  const ctaLabel = isLastStep ? doneFinalLabel : gotItLabel

  return (
    <View ref={ref} style={styles.container}>
      <Text style={styles.counter}>{`${stepIndex + 1} / ${total}`}</Text>
      <Animated.View style={contentStyle}>
        <Text style={styles.prompt}>{steps[stepIndex]?.promptText}</Text>
      </Animated.View>
      <TouchableOpacity
        style={styles.cta}
        onPress={handleAdvance}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.ctaLabel}>{ctaLabel}</Text>
      </TouchableOpacity>
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
    gap: 24,
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
    color: color.content.secondary,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: color.content.primary,
    textAlign: 'center',
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: color.content.primary,
    textAlign: 'center',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  cta: {
    minHeight: groundingTokens.tapTarget,
    paddingHorizontal: 24,
    borderRadius: groundingTokens.tapTarget / 2,
    backgroundColor: color.accent.courage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondary: {
    backgroundColor: color.content.secondary,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
