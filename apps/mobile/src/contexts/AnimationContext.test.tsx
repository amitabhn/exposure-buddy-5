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

  it('updates within one render cycle when reduceMotionChanged fires', async () => {
    let capturedHandler: (isEnabled: unknown) => void = () => {}
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
      (_event: unknown, handler: unknown) => {
        capturedHandler = handler as (isEnabled: unknown) => void
        return { remove: jest.fn() } as any
      },
    )

    const { result } = renderHook(() => useAnimation(), { wrapper })
    await act(async () => {}) // flush isReduceMotionEnabled Promise

    act(() => {
      capturedHandler(true)
    })

    expect(result.current.reduced).toBe(true)
  })

  it('removes event listener on unmount', async () => {
    const removeMock = jest.fn()
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: removeMock } as any)
    const { unmount } = renderHook(() => useAnimation(), { wrapper })
    await act(async () => {}) // flush isReduceMotionEnabled Promise
    unmount()
    expect(removeMock).toHaveBeenCalledTimes(1)
  })

  it('remains reduced: true when isReduceMotionEnabled rejects', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('API failure'))
    const { result } = renderHook(() => useAnimation(), { wrapper })
    await act(async () => {})
    expect(result.current.reduced).toBe(true)
  })

  it('reflects last value after rapid successive reduceMotionChanged events', async () => {
    let capturedHandler: (isEnabled: unknown) => void = () => {}
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(
      (_event: unknown, handler: unknown) => {
        capturedHandler = handler as (isEnabled: unknown) => void
        return { remove: jest.fn() } as any
      },
    )

    const { result } = renderHook(() => useAnimation(), { wrapper })
    await act(async () => {}) // flush isReduceMotionEnabled Promise

    act(() => {
      capturedHandler(true)
      capturedHandler(false)
      capturedHandler(true)
    })

    expect(result.current.reduced).toBe(true)
  })
})
