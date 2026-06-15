import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { MMKV } from 'react-native-mmkv'
import { KV_KEYS } from '@exposure-buddy/core'
import { AuthContext } from './AuthProvider'
import {
  getOnboardingComplete,
  setOnboardingComplete,
  getOnboardingProgress,
  setOnboardingProgress,
} from './session'

export interface OnboardingContextValue {
  isOnboardingComplete: boolean
  markOnboardingComplete: () => void
  onboardingProgressStep: number | null
  setOnboardingProgressStep: (step: number) => void
  // True when MMKV threw on reading onboarding progress (corrupt key).
  onboardingProgressReadFailed: boolean
  setSudsCalibration: (value: number) => void
  crisisFlaggedInOnboarding: boolean
  setCrisisFlaggedInOnboarding: () => void
  firstHomeVisitSeen: boolean
  markFirstHomeVisitSeen: () => void
}

export const OnboardingContext = createContext<OnboardingContextValue>({
  isOnboardingComplete: false,
  markOnboardingComplete: () => {},
  onboardingProgressStep: null,
  setOnboardingProgressStep: () => {},
  onboardingProgressReadFailed: false,
  setSudsCalibration: () => {},
  crisisFlaggedInOnboarding: false,
  setCrisisFlaggedInOnboarding: () => {},
  firstHomeVisitSeen: false,
  markFirstHomeVisitSeen: () => {},
})

interface OnboardingProviderProps {
  children: React.ReactNode
  mmkv: MMKV | null | undefined
}

export function OnboardingProvider({ children, mmkv }: OnboardingProviderProps): React.ReactElement {
  // Read auth identity from AuthContext — OnboardingProvider must nest inside AuthProvider.
  const { authState } = useContext(AuthContext)
  const userId = authState.userId

  const [isOnboardingComplete, setIsOnboardingCompleteLocal] = useState(false)
  const [onboardingProgressStep, setOnboardingProgressStepLocal] = useState<number | null>(null)
  const [onboardingProgressReadFailed, setOnboardingProgressReadFailed] = useState(false)
  const [crisisFlaggedInOnboarding, setCrisisFlaggedInOnboardingLocal] = useState(false)
  const [firstHomeVisitSeen, setFirstHomeVisitSeenLocal] = useState(false)

  // Mirrors the mmkv prop so imperative functions can access the current instance.
  const mmkvRef = useRef<MMKV | null>(mmkv ?? null)
  useEffect(() => { mmkvRef.current = mmkv ?? null }, [mmkv])

  // Guard against re-reads on token refreshes (which fire onAuthStateChange with the same userId).
  const lastReadUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      // Sign-out — reset all onboarding state
      setIsOnboardingCompleteLocal(false)
      setOnboardingProgressStepLocal(null)
      setOnboardingProgressReadFailed(false)
      setCrisisFlaggedInOnboardingLocal(false)
      setFirstHomeVisitSeenLocal(false)
      lastReadUserIdRef.current = null
      return
    }
    if (userId === lastReadUserIdRef.current) return  // token refresh — skip re-read
    lastReadUserIdRef.current = userId
    const store = mmkvRef.current
    if (!store) return

    setIsOnboardingCompleteLocal(getOnboardingComplete(store, userId))
    try {
      const progress = getOnboardingProgress(store, userId)
      setOnboardingProgressStepLocal(progress?.step ?? null)
      setOnboardingProgressReadFailed(false)
    } catch {
      setOnboardingProgressStepLocal(null)
      setOnboardingProgressReadFailed(true)
    }
    setCrisisFlaggedInOnboardingLocal(
      store.getBoolean(KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)) ?? false
    )
    setFirstHomeVisitSeenLocal(
      store.getBoolean(KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)) ?? false
    )
  }, [userId])

  function markOnboardingComplete(): void {
    const store = mmkvRef.current
    if (!store || !userId) {
      console.error('[OnboardingProvider] markOnboardingComplete called in degraded mode — cannot persist to MMKV')
      return
    }
    setOnboardingComplete(store, userId)
    setIsOnboardingCompleteLocal(true)
  }

  function setOnboardingProgressStep(step: number): void {
    const store = mmkvRef.current
    if (!store || !userId) return
    setOnboardingProgress(store, userId, { step })
    setOnboardingProgressStepLocal(step)
  }

  function setSudsCalibration(value: number): void {
    const store = mmkvRef.current
    if (!store || !userId) {
      console.error('[OnboardingProvider] setSudsCalibration called in degraded mode — cannot persist to MMKV')
      return
    }
    // Stored as a number type — downstream readers must use store.getNumber(key), not getString.
    store.set(KV_KEYS.SUDS_CALIBRATION(userId), value)
  }

  function setCrisisFlaggedInOnboarding(): void {
    const store = mmkvRef.current
    if (!store || !userId) {
      console.error('[OnboardingProvider] setCrisisFlaggedInOnboarding called in degraded mode — cannot persist to MMKV')
      return
    }
    store.set(KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId), true)
    setCrisisFlaggedInOnboardingLocal(true)
  }

  function markFirstHomeVisitSeen(): void {
    if (!userId) {
      console.error('[OnboardingProvider] markFirstHomeVisitSeen called before userId is available')
      return
    }
    const store = mmkvRef.current
    if (!store) {
      // Degraded mode — update local state only so greeting doesn't repeat this session.
      setFirstHomeVisitSeenLocal(true)
      return
    }
    store.set(KV_KEYS.FIRST_HOME_VISIT_SEEN(userId), true)
    setFirstHomeVisitSeenLocal(true)
  }

  return (
    <OnboardingContext.Provider value={{
      isOnboardingComplete,
      markOnboardingComplete,
      onboardingProgressStep,
      setOnboardingProgressStep,
      onboardingProgressReadFailed,
      setSudsCalibration,
      crisisFlaggedInOnboarding,
      setCrisisFlaggedInOnboarding,
      firstHomeVisitSeen,
      markFirstHomeVisitSeen,
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}
