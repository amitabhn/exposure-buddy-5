import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { color, groundingTokens, spacing } from '../tokens/theme'

export interface GroundingPromptProps {
  steps: { promptText: string; count: number; fieldLabels: string[] }[] // ordered, pre-translated, 5 items
  fieldPlaceholder: string
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
  {
    steps,
    fieldPlaceholder,
    gotItLabel,
    doneFinalLabel,
    completeMessage,
    doneLabel,
    againLabel,
    reduced,
    onComplete,
  },
  ref,
) {
  const total = steps.length
  const [stepIndex, setStepIndex] = useState(0)
  const [complete, setComplete] = useState(false)
  // Ephemeral, per-step field entries — never lifted out, persisted, or synced. Reset whenever
  // stepIndex changes (including "Go again"'s reset to 0) so a new step never shows stale text.
  const [fieldValues, setFieldValues] = useState<string[]>(() =>
    Array(steps[0]?.count ?? 0).fill(''),
  )
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

  // Resets the ephemeral field entries every time the displayed step changes — this is the
  // only place field state is written outside a field's own onChangeText. Deliberately does
  // NOT depend on `complete`, so re-entering step 1 via "Go again" (stepIndex 0 -> 0, no
  // change) still gets a fresh set: handleAgain always sets stepIndex to 0, and the mount
  // initializer above already seeded step 0's array, but this effect also runs on mount and
  // re-applies the same empty array, which is harmless.
  useEffect(() => {
    setFieldValues(Array(steps[stepIndex]?.count ?? 0).fill(''))
  }, [stepIndex, steps])

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

  function handleFieldChange(index: number, text: string) {
    setFieldValues((prev) => {
      const next = [...prev]
      next[index] = text
      return next
    })
  }

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
  const currentStep = steps[stepIndex]
  const fieldLabels = currentStep?.fieldLabels ?? []
  const fieldCount = currentStep?.count ?? 0

  return (
    <View ref={ref} style={styles.outer}>
      {/* No existing KeyboardAvoidingView usage elsewhere in the app to follow — this is the
          first. `padding` on iOS shrinks the content area; Android has no reliable
          shift/pan-and-scan equivalent via this API alone, so `height` here plus the
          ScrollView below keeps the advance button reachable by scrolling either way without
          dismissing the keyboard (keyboardShouldPersistTaps="handled"). */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.counter}>{`${stepIndex + 1} / ${total}`}</Text>
          <Animated.View style={contentStyle}>
            <Text style={styles.prompt}>{currentStep?.promptText}</Text>
          </Animated.View>
          <View style={styles.fields}>
            {/* Rendered against currentStep.count/fieldLabels (always in sync with each
                other), not fieldValues.length — the reset effect below commits AFTER a
                step-change render, so on that one render fieldValues can still be the
                outgoing step's (longer or differently-valued) array. Reading
                fieldValues[index] ?? '' means an out-of-range or not-yet-reset index
                just renders empty instead of stale text or an undefined label. */}
            {Array.from({ length: fieldCount }, (_, index) => (
              <TextInput
                // Index is a stable position key here: the array is always rebuilt to the
                // current step's count on every step change, never reordered or filtered.
                key={index}
                style={styles.fieldInput}
                value={fieldValues[index] ?? ''}
                onChangeText={(text) => handleFieldChange(index, text)}
                placeholder={fieldPlaceholder}
                accessibilityLabel={fieldLabels[index]}
                returnKeyType={index === fieldCount - 1 ? 'done' : 'next'}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.cta}
            onPress={handleAdvance}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
})

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    backgroundColor: color.surface.primary,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
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
  fields: {
    width: '100%',
    gap: 12,
  },
  fieldInput: {
    width: '100%',
    minHeight: groundingTokens.tapTarget,
    borderWidth: 1,
    borderColor: color.surface.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: color.content.primary,
    backgroundColor: color.surface.secondary,
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
