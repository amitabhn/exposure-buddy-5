import React, { createContext, useContext, useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import type { AccessibilityChangeEventName } from 'react-native'

type AnimationContextValue = {
  reduced: boolean
}

// Typed constant — compile-time check if RN removes this event (Patch 10)
const REDUCE_MOTION_EVENT: AccessibilityChangeEventName = 'reduceMotionChanged'

// Fail-safe: true until ReducedMotionProvider confirms otherwise (UX-DR15)
const AnimationContext = createContext<AnimationContextValue>({ reduced: true })

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  // Start reduced: true — fail-safe, not fail-open (UX-DR15)
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    let mounted = true // Guard against state update on unmounted component (Patch 2)

    // Read current preference at mount
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => { if (mounted) setReduced(value) })
      .catch((e) => { if (__DEV__) console.warn('[AnimationContext] isReduceMotionEnabled failed:', e) }) // Patch 7

    // Subscribe to live changes — NOT boot-only (UX-DR15, A11Y-003)
    // Type coercion guards against platform-variant argument shapes (Patch 3)
    const subscription = AccessibilityInfo.addEventListener(
      REDUCE_MOTION_EVENT,
      (value: unknown) => setReduced(Boolean(value)),
    )

    return () => {
      mounted = false
      subscription?.remove?.() // Optional chaining prevents throw on malformed subscription (Patch 1)
    }
  }, [])

  return (
    <AnimationContext.Provider value={{ reduced }}>
      {children}
    </AnimationContext.Provider>
  )
}

export function useAnimation(): AnimationContextValue {
  return useContext(AnimationContext)
}
