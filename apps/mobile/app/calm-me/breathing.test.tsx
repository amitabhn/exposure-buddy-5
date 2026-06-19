import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockRouterBack }),
}))

const mockUseAnimation = jest.fn()

jest.mock('../../src/contexts/AnimationContext', () => ({
  useAnimation: () => mockUseAnimation(),
}))

import BreathingScreen from './breathing'

describe('BreathingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockUseAnimation.mockReturnValue({ reduced: false })
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('auto-starts the guided phase with the MM:SS countdown visible', () => {
    const { getByText } = render(<BreathingScreen />)
    expect(getByText('breathing.inhale')).toBeTruthy()
    expect(getByText('5:00')).toBeTruthy()
  })

  it('cycles inhale → holdIn → exhale → holdOut in order across 16s', () => {
    const { getByText } = render(<BreathingScreen />)

    act(() => jest.advanceTimersByTime(4000))
    expect(getByText('breathing.holdIn')).toBeTruthy()

    act(() => jest.advanceTimersByTime(4000))
    expect(getByText('breathing.exhale')).toBeTruthy()

    act(() => jest.advanceTimersByTime(4000))
    expect(getByText('breathing.holdOut')).toBeTruthy()

    act(() => jest.advanceTimersByTime(4000))
    expect(getByText('breathing.inhale')).toBeTruthy()
  })

  it('auto-transitions to passive after 2 guided cycles (32s): text hidden, "I\'m ready" visible', () => {
    const { getByText, queryByText } = render(<BreathingScreen />)

    act(() => jest.advanceTimersByTime(32000))

    expect(queryByText('breathing.inhale')).toBeNull()
    expect(queryByText('breathing.holdIn')).toBeNull()
    expect(queryByText('breathing.exhale')).toBeNull()
    expect(queryByText('breathing.holdOut')).toBeNull()
    expect(getByText('breathing.passiveReady')).toBeTruthy()
  })

  it('tapping "I\'m ready" during passive navigates back immediately with no completion message', () => {
    const { getByText, queryByText } = render(<BreathingScreen />)
    act(() => jest.advanceTimersByTime(32000))

    fireEvent.press(getByText('breathing.passiveReady'))

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(queryByText('breathing.sessionComplete')).toBeNull()
  })

  it('AC #6: lets the in-progress phase finish before showing "Session complete", with no abrupt mid-phase cut', () => {
    const { getByText, queryByText } = render(<BreathingScreen />)

    // One tick before the session timer expires, still mid-exercise.
    act(() => jest.advanceTimersByTime(299000))
    expect(queryByText('breathing.sessionComplete')).toBeNull()
    expect(mockRouterBack).not.toHaveBeenCalled()

    // Crossing the boundary at 300s ends the session and shows the completion message —
    // not a cut mid-breath.
    act(() => jest.advanceTimersByTime(1000))
    expect(getByText('breathing.sessionComplete')).toBeTruthy()
    expect(mockRouterBack).not.toHaveBeenCalled()

    // Only after the 1–2s display delay does navigation happen.
    act(() => jest.advanceTimersByTime(1500))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('Back button during the guided phase navigates back with no error or crash', () => {
    const { getByLabelText } = render(<BreathingScreen />)
    fireEvent.press(getByLabelText('calmMe.back'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('AC #11: reduced motion renders the numeric per-phase countdown instead of the animated text prompt', () => {
    mockUseAnimation.mockReturnValue({ reduced: true })
    const { getByText, queryByText } = render(<BreathingScreen />)

    expect(queryByText('breathing.inhale')).toBeNull()
    expect(getByText('4…')).toBeTruthy()

    act(() => jest.advanceTimersByTime(1000))
    expect(getByText('3…')).toBeTruthy()

    act(() => jest.advanceTimersByTime(1000))
    expect(getByText('2…')).toBeTruthy()

    act(() => jest.advanceTimersByTime(1000))
    expect(getByText('1…')).toBeTruthy()
  })

  it('AC #10: announces only on the 4 cycling phase legs, continuing uninterrupted through the passive transition', () => {
    render(<BreathingScreen />)
    const announce = AccessibilityInfo.announceForAccessibility as jest.Mock

    expect(announce).toHaveBeenCalledTimes(1) // initial mount: inhale

    act(() => jest.advanceTimersByTime(4000)) // -> holdIn
    act(() => jest.advanceTimersByTime(4000)) // -> exhale
    act(() => jest.advanceTimersByTime(4000)) // -> holdOut
    expect(announce).toHaveBeenCalledTimes(4)

    // Crossing into passive (cycle 2's final holdOut -> cycle 3's inhale) is still just one
    // ordinary phase-change announcement — no extra call for the structural transition.
    // Each advance is its own act() so React flushes (and runs effects for) every
    // intermediate phase, not just the final batched state.
    for (let i = 0; i < 5; i++) {
      act(() => jest.advanceTimersByTime(4000))
    }
    expect(announce).toHaveBeenCalledTimes(9)
  })

  it('AC #5: the "I\'m ready" CTA has a minimum height of 56, not a fixed square', () => {
    const { getByLabelText } = render(<BreathingScreen />)
    act(() => jest.advanceTimersByTime(32000))

    const button = getByLabelText('breathing.passiveReady')
    expect(button).toHaveStyle({ minHeight: 56 })
    expect(button.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 })
  })
})
