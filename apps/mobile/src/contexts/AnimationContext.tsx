import React, { createContext, useContext, useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

type AnimationContextValue = {
  reduced: boolean
}

// Fail-safe: true until ReducedMotionProvider confirms otherwise (UX-DR15)
const AnimationContext = createContext<AnimationContextValue>({ reduced: true })

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  // Start reduced: true — fail-safe, not fail-open (UX-DR15)
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    // Read current preference at mount
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {})

    // Subscribe to live changes — NOT boot-only (UX-DR15, A11Y-003)
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    )

    return () => subscription.remove()
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
