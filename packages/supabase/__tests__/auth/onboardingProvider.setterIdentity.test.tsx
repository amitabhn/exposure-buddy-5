import React, { useContext } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, it, expect, vi } from 'vitest'
import type { MMKV } from 'react-native-mmkv'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))
vi.mock('expo-secure-store', () => ({}))
vi.mock('../../src/client', () => ({ createSupabaseClient: () => ({}) }))

import { AuthContext } from '../../src/auth/AuthProvider'
import { OnboardingProvider, OnboardingContext } from '../../src/auth/OnboardingProvider'

function makeMockMmkv(): MMKV {
  const store = new Map<string, unknown>()
  return {
    getString: (k: string) => store.get(k) as string | undefined,
    getBoolean: (k: string) => store.get(k) as boolean | undefined,
    getNumber: (k: string) => store.get(k) as number | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    delete: (k: string) => { store.delete(k) },
  } as unknown as MMKV
}

// Regression (Story 19.1): onboarding screens call setOnboardingProgressStep from effects keyed
// on its identity. With push-based navigation the ladder stays mounted under `complete`; if the
// setter changes identity on every provider render, that effect re-fires and rewrites 4 → 3.
describe('OnboardingProvider — setOnboardingProgressStep identity', () => {
  it('keeps the same function identity across provider re-renders', () => {
    const seen: Array<(step: number) => void> = []
    let currentStep: number | null = null

    function Probe() {
      const ctx = useContext(OnboardingContext)
      seen.push(ctx.setOnboardingProgressStep)
      currentStep = ctx.onboardingProgressStep
      return null
    }

    const authValue = { authState: { userId: 'user-1' } } as unknown as React.ContextType<typeof AuthContext>

    let renderer!: ReturnType<typeof create>
    act(() => {
      renderer = create(
        <AuthContext.Provider value={authValue}>
          <OnboardingProvider mmkv={makeMockMmkv()}>
            <Probe />
          </OnboardingProvider>
        </AuthContext.Provider>,
      )
    })

    // Each call updates provider state and so re-renders the provider.
    act(() => { seen[seen.length - 1]!(3) })
    act(() => { seen[seen.length - 1]!(4) })

    expect(currentStep).toBe(4)
    expect(seen.length).toBeGreaterThan(2)
    expect(new Set(seen).size).toBe(1)
    renderer.unmount()
  })
})
