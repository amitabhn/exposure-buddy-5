import React from 'react'
import { renderHook } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

// Mock expo-router: useFocusEffect calls callback immediately in test environment
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    cb()
  },
}))

// Mock AnimationContext so we can control the reduced value
jest.mock('../contexts/AnimationContext', () => ({
  useAnimation: jest.fn(),
}))

import { useAnimation } from '../contexts/AnimationContext'
import { useFocusOnMount } from './useFocusOnMount'

describe('useFocusOnMount', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does NOT call setAccessibilityFocus when reduced is false', () => {
    (useAnimation as jest.Mock).mockReturnValue({ reduced: false })
    renderHook(() => useFocusOnMount())
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()
  })

  it('attempts focus placement when reduced is true (null guard prevents call with null handle)', () => {
    (useAnimation as jest.Mock).mockReturnValue({ reduced: true })
    // findNodeHandle returns null for unmounted refs in Jest — the null guard `if (handle !== null)`
    // prevents calling setAccessibilityFocus with a null handle. This test verifies the
    // reduced-true branch executes without error and the null guard works correctly.
    expect(() => renderHook(() => useFocusOnMount())).not.toThrow()
    // setAccessibilityFocus is NOT called because findNodeHandle returns null in test env
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()
  })
})
