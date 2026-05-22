import { useRef, useCallback } from 'react'
import type { RefObject } from 'react'
import { AccessibilityInfo, findNodeHandle } from 'react-native'
import type { View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAnimation } from '../contexts/AnimationContext'

// Post-transition focus placement for reduced-motion screens (UX-DR16, A11Y-004).
// When reduceMotion is true, instant (0ms) transitions cause TalkBack on Android 10 to lose
// focus context. This hook explicitly places focus on the primary interactive element after
// each navigation event, but ONLY when reduced motion is active — when animations run
// normally, the transition itself carries focus and explicit placement is not needed.
export function useFocusOnMount<T extends View = View>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  const { reduced } = useAnimation()

  useFocusEffect(
    useCallback(() => {
      if (!reduced) return
      const handle = findNodeHandle(ref.current)
      if (handle !== null) {
        AccessibilityInfo.setAccessibilityFocus(handle)
      }
    }, [reduced]),
  )

  return ref
}
