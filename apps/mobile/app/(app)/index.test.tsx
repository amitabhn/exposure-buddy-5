import React from 'react'
import { TouchableOpacity, View, AccessibilityInfo } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockMarkFirstHomeVisitSeen = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@exposure-buddy/ui', () => {
  const MockReact = require('react')
  const { TouchableOpacity: MockTouchable } = require('react-native')
  return {
    CourageLadderEntryCard: MockReact.forwardRef(
      ({ onPress }: { onPress: () => void }, ref: React.ForwardedRef<View>) => (
        <MockTouchable ref={ref} testID="courage-card" onPress={onPress} />
      )
    ),
  }
})

jest.mock('@exposure-buddy/core', () => ({
  resolveLowestPendingItem: jest.fn(() => null),
}))

import HomeScreen from './'

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue({
      firstHomeVisitSeen: false,
      markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders readyToStart greeting when firstHomeVisitSeen is false on mount', () => {
    const { getByText } = render(<HomeScreen />)
    // Uses seenOnMount.current (ref at mount time), not live state
    expect(getByText('home.readyToStart')).toBeTruthy()
  })

  it('renders welcomeBack greeting when firstHomeVisitSeen is true on mount', () => {
    mockUseAuth.mockReturnValue({
      firstHomeVisitSeen: true,
      markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
    })
    const { getByText } = render(<HomeScreen />)
    expect(getByText('home.welcomeBack')).toBeTruthy()
  })

  it('calls markFirstHomeVisitSeen on mount when not seen', () => {
    render(<HomeScreen />)
    expect(mockMarkFirstHomeVisitSeen).toHaveBeenCalledTimes(1)
  })

  it('does NOT call markFirstHomeVisitSeen when already seen', () => {
    mockUseAuth.mockReturnValue({
      firstHomeVisitSeen: true,
      markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
    })
    render(<HomeScreen />)
    expect(mockMarkFirstHomeVisitSeen).not.toHaveBeenCalled()
  })

  it('renders CourageLadderEntryCard', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('courage-card')).toBeTruthy()
  })

  it('renders CalmMe button', () => {
    const { getByRole } = render(<HomeScreen />)
    expect(getByRole('button', { name: 'home.calmMe.cta' })).toBeTruthy()
  })

  it('CalmMe button navigates to /calm-me', () => {
    const { getByRole } = render(<HomeScreen />)
    fireEvent.press(getByRole('button', { name: 'home.calmMe.cta' }))
    expect(mockPush).toHaveBeenCalledWith('/calm-me')
  })

  it('sets accessibility focus on card after 100ms', () => {
    render(<HomeScreen />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
  })

  it('CourageLadderEntryCard onPress navigates to /ladder', () => {
    const { getByTestId } = render(<HomeScreen />)
    fireEvent.press(getByTestId('courage-card'))
    expect(mockPush).toHaveBeenCalledWith('/ladder')
  })
})
