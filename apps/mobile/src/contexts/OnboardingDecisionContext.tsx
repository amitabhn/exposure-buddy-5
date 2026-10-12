import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react'

// Story 19.9 — runtime-only "onboarding decision is undecided" signal.
//
// `(app)/_layout` knows when the reinstall fallback's hold has expired without an answer (first
// sync not complete, no hit). While that is true, nothing may write fear_ladder_items on this
// device: a local row would read as a false hit and take position 1 (uq_user_position collision).
// `app/ladder.tsx` is a sibling of the `(app)` group, so the layout's own state does not reach
// it; this root-level context does. Never persisted — undecided is a runtime state only.
type OnboardingDecisionContextValue = {
  isUndecided: boolean
  setIsUndecided: (value: boolean) => void
}

// Default false / no-op so any route reached without the provider (and existing tests) behave
// as before.
const OnboardingDecisionContext = createContext<OnboardingDecisionContextValue>({
  isUndecided: false,
  setIsUndecided: () => {},
})

export function OnboardingDecisionProvider({ children }: { children: React.ReactNode }) {
  const [isUndecided, setUndecided] = useState(false)
  const setIsUndecided = useCallback((value: boolean) => setUndecided(value), [])
  const value = useMemo(() => ({ isUndecided, setIsUndecided }), [isUndecided, setIsUndecided])
  return <OnboardingDecisionContext.Provider value={value}>{children}</OnboardingDecisionContext.Provider>
}

export function useIsOnboardingUndecided(): boolean {
  return useContext(OnboardingDecisionContext).isUndecided
}

// Called by `(app)/_layout`. useLayoutEffect so the value is set before a screen the user taps
// into mounts; the cleanup resets it so a stale `true` never outlives the layout (sign-out,
// account switch) and blocks the Ladder for the next account.
export function usePublishOnboardingUndecided(isUndecided: boolean): void {
  const { setIsUndecided } = useContext(OnboardingDecisionContext)
  useLayoutEffect(() => {
    setIsUndecided(isUndecided)
    return () => setIsUndecided(false)
  }, [isUndecided, setIsUndecided])
}
