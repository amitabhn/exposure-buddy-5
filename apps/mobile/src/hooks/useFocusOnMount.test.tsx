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

  it('calls setAccessibilityFocus with the node handle when reduced is true', () => {
    (useAnimation as jest.Mock).mockReturnValue({ reduced: true })
    // Mock findNodeHandle to return a valid handle so the focus call can be asserted (AC5)
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(1)
    renderHook(() => useFocusOnMount())
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(1)
  })
})
