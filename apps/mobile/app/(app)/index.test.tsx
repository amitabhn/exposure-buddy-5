import React from 'react'
import { View, AccessibilityInfo } from 'react-native'
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

const mockResolveHomeScreenState = jest.fn()

jest.mock('@exposure-buddy/core', () => ({
  resolveLowestPendingItem: jest.fn(() => null),
  resolveHomeScreenState: (...args: unknown[]) => mockResolveHomeScreenState(...args),
}))

const mockUseFearLadderItems = jest.fn()
jest.mock('../../src/hooks/useFearLadderItems', () => ({
  useFearLadderItems: (...args: unknown[]) => mockUseFearLadderItems(...args),
}))

const mockUseActiveExposureSession = jest.fn()
jest.mock('../../src/hooks/useActiveExposureSession', () => ({
  useActiveExposureSession: (...args: unknown[]) => mockUseActiveExposureSession(...args),
}))

import HomeScreen from './'

const defaultAuthValue = {
  firstHomeVisitSeen: false,
  markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
  authState: { userId: 'user-123' },
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue(defaultAuthValue)
    mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
    mockUseActiveExposureSession.mockReturnValue({ activeSession: null, isLoading: false })
    mockResolveHomeScreenState.mockReturnValue('morning')
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders readyToStart greeting when firstHomeVisitSeen is false on mount', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getByText('home.readyToStart')).toBeTruthy()
  })

  it('renders welcomeBack greeting when firstHomeVisitSeen is true on mount', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, firstHomeVisitSeen: true })
    const { getByText } = render(<HomeScreen />)
    expect(getByText('home.welcomeBack')).toBeTruthy()
  })

  it('calls markFirstHomeVisitSeen on mount when not seen', () => {
    render(<HomeScreen />)
    expect(mockMarkFirstHomeVisitSeen).toHaveBeenCalledTimes(1)
  })

  it('does NOT call markFirstHomeVisitSeen when already seen', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, firstHomeVisitSeen: true })
    render(<HomeScreen />)
    expect(mockMarkFirstHomeVisitSeen).not.toHaveBeenCalled()
  })

  it('does NOT call markFirstHomeVisitSeen when userId is not yet available', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, authState: { userId: null } })
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

  describe('loading state', () => {
    it('renders a loading indicator and no state card while either hook is loading', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: true })
      const { getByLabelText, queryByTestId } = render(<HomeScreen />)
      expect(getByLabelText('common.loading')).toBeTruthy()
      expect(queryByTestId('courage-card')).toBeNull()
    })

    it('renders a loading indicator while the active-session query is loading', () => {
      mockUseActiveExposureSession.mockReturnValue({ activeSession: null, isLoading: true })
      const { getByLabelText } = render(<HomeScreen />)
      expect(getByLabelText('common.loading')).toBeTruthy()
    })
  })

  describe("'completed' state", () => {
    beforeEach(() => {
      mockResolveHomeScreenState.mockReturnValue('completed')
    })

    it('renders the state10 message with no CTA card', () => {
      const { getByText, queryByTestId } = render(<HomeScreen />)
      expect(getByText('home.state10.message')).toBeTruthy()
      expect(queryByTestId('courage-card')).toBeNull()
    })
  })

  describe("'empty-ladder' state", () => {
    beforeEach(() => {
      mockResolveHomeScreenState.mockReturnValue('empty-ladder')
    })

    it('renders the empty-ladder message and add-item CTA', () => {
      const { getByText, getByRole } = render(<HomeScreen />)
      expect(getByText('ladder.emptyState')).toBeTruthy()
      expect(getByRole('button', { name: 'ladder.addItem' })).toBeTruthy()
    })

    it('add-item CTA navigates to /ladder', () => {
      const { getByRole } = render(<HomeScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      expect(mockPush).toHaveBeenCalledWith('/ladder')
    })
  })

  describe("'progressing' state", () => {
    beforeEach(() => {
      mockResolveHomeScreenState.mockReturnValue('progressing')
    })

    it('renders the state4 placeholder', () => {
      const { getByText } = render(<HomeScreen />)
      expect(getByText('home.state4.placeholder')).toBeTruthy()
    })

    it('placeholder CTA navigates to /ladder', () => {
      const { getByText } = render(<HomeScreen />)
      fireEvent.press(getByText('home.state4.placeholder'))
      expect(mockPush).toHaveBeenCalledWith('/ladder')
    })
  })
})
