import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { ReducedMotionProvider, useAnimation } from './AnimationContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReducedMotionProvider>{children}</ReducedMotionProvider>
)

describe('AnimationContext', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('default value is reduced: true (fail-safe before provider confirms)', () => {
    // Context default — no provider, reads from createContext({ reduced: true })
    const { result } = renderHook(() => useAnimation())
    expect(result.current.reduced).toBe(true)
  })

  it('updates within one render cycle when reduceMotionChanged fires', () => {
    let capturedHandler: (isEnabled: boolean) => void = () => {}
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
      (_event: unknown, handler: unknown) => {
        capturedHandler = handler as (isEnabled: boolean) => void
        return { remove: jest.fn() } as any
      },
    )

    const { result } = renderHook(() => useAnimation(), { wrapper })

    act(() => {
      capturedHandler(true)
    })

    expect(result.current.reduced).toBe(true)
  })
})
