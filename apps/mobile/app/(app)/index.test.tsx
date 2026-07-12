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
const mockIsGroundingSignalFresh = jest.fn()

jest.mock('@exposure-buddy/core', () => ({
  resolveLowestPendingItem: jest.fn(() => null),
  resolveHomeScreenState: (...args: unknown[]) => mockResolveHomeScreenState(...args),
  isGroundingSignalFresh: (...args: unknown[]) => mockIsGroundingSignalFresh(...args),
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
  isOnboardingComplete: true,
  authState: { userId: 'user-123' },
  sessionRecoveryData: null,
  getGroundingActiveAt: () => null,
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
    mockIsGroundingSignalFresh.mockReturnValue(false)
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

  it('does NOT call markFirstHomeVisitSeen on the transient pre-onboarding mount', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, isOnboardingComplete: false })
    render(<HomeScreen />)
    expect(mockMarkFirstHomeVisitSeen).not.toHaveBeenCalled()
  })

  it('renders CourageLadderEntryCard', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('courage-card')).toBeTruthy()
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

    it('renders the supporting copy and fear item description when sessionRecoveryData is populated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthValue,
        sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: 'Public speaking', preSuds: 4 },
      })
      const { getByText } = render(<HomeScreen />)
      expect(getByText('home.state4.context')).toBeTruthy()
      expect(getByText('Public speaking')).toBeTruthy()
    })

    it('tapping the card navigates to /session/active with sessionRecoveryData fields', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthValue,
        sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: 'Public speaking', preSuds: 4 },
      })
      const { getByRole } = render(<HomeScreen />)
      fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
      expect(mockPush).toHaveBeenCalledWith(
        '/session/active?sessionId=s1&fearItemId=a&description=Public%20speaking&preSuds=4'
      )
    })

    it('cross-device fallback: sessionRecoveryData null, activeSession populated — renders supporting-copy-only and navigates using activeSession fields', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuthValue, sessionRecoveryData: null })
      mockUseActiveExposureSession.mockReturnValue({
        activeSession: { id: 's2', fearItemId: 'b', startedAt: '2026-06-17T08:00:00.000Z' },
        isLoading: false,
      })
      const { getByText, getByRole, queryByText } = render(<HomeScreen />)
      expect(getByText('home.state4.context')).toBeTruthy()
      expect(queryByText('Public speaking')).toBeNull()
      fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
      expect(mockPush).toHaveBeenCalledWith('/session/active?sessionId=s2&fearItemId=b&description=&preSuds=0')
    })

    it('cross-device fallback handles a null activeSession.fearItemId without crashing', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuthValue, sessionRecoveryData: null })
      mockUseActiveExposureSession.mockReturnValue({
        activeSession: { id: 's3', fearItemId: null, startedAt: '2026-06-17T08:00:00.000Z' },
        isLoading: false,
      })
      const { getByRole } = render(<HomeScreen />)
      fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
      expect(mockPush).toHaveBeenCalledWith('/session/active?sessionId=s3&fearItemId=&description=&preSuds=0')
    })

    it('handles a null sessionRecoveryData.fearItemId without crashing (primary path)', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthValue,
        sessionRecoveryData: { sessionId: 's1', fearItemId: null, description: 'Public speaking', preSuds: 4 },
      })
      const { getByRole } = render(<HomeScreen />)
      fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
      expect(mockPush).toHaveBeenCalledWith(
        '/session/active?sessionId=s1&fearItemId=&description=Public%20speaking&preSuds=4'
      )
    })

    it('renders supporting-copy-only when sessionRecoveryData.description is an empty string', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthValue,
        sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: '', preSuds: 4 },
      })
      const { getByText, queryByText } = render(<HomeScreen />)
      expect(getByText('home.state4.context')).toBeTruthy()
      expect(getByText('home.state4.cta')).toBeTruthy()
      expect(queryByText('Public speaking')).toBeNull()
    })

    it('AC 3: never renders expires_at in any form (primary path)', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthValue,
        sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: 'Public speaking', preSuds: 4 },
      })
      const { queryByText } = render(<HomeScreen />)
      expect(queryByText(/expires/i)).toBeNull()
    })

    it('AC 3: never renders expires_at in any form (cross-device fallback path)', () => {
      mockUseAuth.mockReturnValue({ ...defaultAuthValue, sessionRecoveryData: null })
      mockUseActiveExposureSession.mockReturnValue({
        activeSession: { id: 's2', fearItemId: 'b', startedAt: '2026-06-17T08:00:00.000Z' },
        isLoading: false,
      })
      const { queryByText } = render(<HomeScreen />)
      expect(queryByText(/expires/i)).toBeNull()
    })

    describe('Story 9.2: grounding-aware recovery routing', () => {
      it('killed mid-grounding (fresh GROUNDING_ACTIVE signal) recovers to /session/grounding, not /session/active', () => {
        mockIsGroundingSignalFresh.mockReturnValue(true)
        mockUseAuth.mockReturnValue({
          ...defaultAuthValue,
          sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: 'Public speaking', preSuds: 4 },
          getGroundingActiveAt: () => 1_750_000_000_000,
        })
        const { getByRole } = render(<HomeScreen />)
        fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
        expect(mockPush).toHaveBeenCalledWith(
          '/session/grounding?sessionId=s1&fearItemId=a&description=Public%20speaking&preSuds=4'
        )
      })

      it('killed mid-exposure (no fresh grounding signal) recovers to /session/active as before', () => {
        mockIsGroundingSignalFresh.mockReturnValue(false)
        mockUseAuth.mockReturnValue({
          ...defaultAuthValue,
          sessionRecoveryData: { sessionId: 's1', fearItemId: 'a', description: 'Public speaking', preSuds: 4 },
        })
        const { getByRole } = render(<HomeScreen />)
        fireEvent.press(getByRole('button', { name: 'home.state4.cta' }))
        expect(mockPush).toHaveBeenCalledWith(
          '/session/active?sessionId=s1&fearItemId=a&description=Public%20speaking&preSuds=4'
        )
      })
    })
  })

  describe('HomeScreenContext construction (real resolveHomeScreenState)', () => {
    beforeEach(() => {
      const { resolveHomeScreenState } = jest.requireActual('@exposure-buddy/core')
      mockResolveHomeScreenState.mockImplementation(resolveHomeScreenState)
    })

    it('items.every() on a non-empty, all-completed ladder resolves ladderComplete -> completed state', () => {
      mockUseFearLadderItems.mockReturnValue({
        items: [{ id: 'a', description: 'x', predictedSuds: 5, position: 1, status: 'completed', peakSuds: null }],
        isLoading: false,
      })
      const { getByText, queryByTestId } = render(<HomeScreen />)
      expect(getByText('home.state10.message')).toBeTruthy()
      expect(queryByTestId('courage-card')).toBeNull()
    })

    it('an empty ladder does NOT vacuously resolve ladderComplete -> empty-ladder state, not completed', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
      const { getByText, queryByText } = render(<HomeScreen />)
      expect(getByText('ladder.emptyState')).toBeTruthy()
      expect(queryByText('home.state10.message')).toBeNull()
    })

    it('a pending (non-complete) ladder with no active session -> morning state', () => {
      mockUseFearLadderItems.mockReturnValue({
        items: [{ id: 'a', description: 'x', predictedSuds: 5, position: 1, status: 'pending', peakSuds: null }],
        isLoading: false,
      })
      const { getByTestId } = render(<HomeScreen />)
      expect(getByTestId('courage-card')).toBeTruthy()
    })

    it('an active session maps to activeThread.exists -> progressing state', () => {
      mockUseFearLadderItems.mockReturnValue({
        items: [{ id: 'a', description: 'x', predictedSuds: 5, position: 1, status: 'pending', peakSuds: null }],
        isLoading: false,
      })
      mockUseActiveExposureSession.mockReturnValue({
        activeSession: { id: 's1', fearItemId: 'a', startedAt: '2026-06-17T08:00:00.000Z' },
        isLoading: false,
      })
      const { getByText } = render(<HomeScreen />)
      expect(getByText('home.state4.context')).toBeTruthy()
    })
  })
})
