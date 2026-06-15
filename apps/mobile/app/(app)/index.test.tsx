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

jest.mock('@exposure-buddy/core', () => ({
  resolveLowestPendingItem: jest.fn(() => null),
  resolveHomeScreenState: jest.fn((data: unknown) => {
    if (!data) return 'default'
    const d = data as { completedAtMs: number; reflectionSubmitted: boolean }
    const now = Date.now()
    const expiry = d.completedAtMs + 6 * 60 * 60 * 1000
    if (now < expiry) return 'post-exposure'
    if (!d.reflectionSubmitted) return 'expired'
    return 'default'
  }),
  formatTimeRemaining: jest.fn((completedAtMs: number) => {
    const remaining = completedAtMs + 6 * 60 * 60 * 1000 - Date.now()
    if (remaining <= 0) return ''
    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000)
    return `${hours}h ${minutes}m remaining`
  }),
}))

import HomeScreen from './'

// Helper to build a debrief pending data object
function makeDebriefPending(overrides = {}) {
  return {
    sessionId: 'session-abc',
    fearItemId: 'item-xyz',
    completedAtMs: Date.now() - 1000,  // just completed (window open)
    preSuds: 7,
    debriefSuds: 4,
    peakSuds: 8,
    hasLetter: false,
    reflectionSubmitted: false,
    ...overrides,
  }
}

const defaultAuthValue = {
  firstHomeVisitSeen: false,
  markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
  authState: { userId: 'user-123' },
  debriefPendingData: null,
}

describe('HomeScreen — existing tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue(defaultAuthValue)
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

  it('renders CourageLadderEntryCard in default state', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('courage-card')).toBeTruthy()
  })

  it('renders CalmMe button in default state', () => {
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

describe('HomeScreen — State 7 (post-exposure window open)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders state-7 content when debriefPendingData present and window open, hasLetter=true', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      debriefPendingData: makeDebriefPending({ hasLetter: true }),
    })
    const { getByLabelText } = render(<HomeScreen />)
    expect(getByLabelText('home.state7.ctaLetter')).toBeTruthy()
  })

  it('renders state-7 acknowledgement text when hasLetter=false', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      debriefPendingData: makeDebriefPending({ hasLetter: false }),
    })
    const { getByText } = render(<HomeScreen />)
    expect(getByText('home.state7.acknowledgement')).toBeTruthy()
  })

  it('does NOT render CourageLadderEntryCard in state 7', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      debriefPendingData: makeDebriefPending(),
    })
    const { queryByTestId } = render(<HomeScreen />)
    expect(queryByTestId('courage-card')).toBeNull()
  })

  it('formatTimeRemaining shows remaining time string while window is open', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      debriefPendingData: makeDebriefPending(),
    })
    const { getByText } = render(<HomeScreen />)
    // completedAtMs = Date.now() - 1000, so ~6h remaining → "5h 59m remaining"
    expect(getByText(/\d+h \d+m remaining/)).toBeTruthy()
  })

  it('state-7 CTA navigates to debrief in readOnly mode when hasLetter=true', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthValue,
      debriefPendingData: makeDebriefPending({ hasLetter: true }),
    })
    const { getByLabelText } = render(<HomeScreen />)
    fireEvent.press(getByLabelText('home.state7.ctaLetter'))
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('readOnly=true')
    )
  })
})

describe('HomeScreen — State 8 (window expired, late debrief)', () => {
  const expiredDebrief = makeDebriefPending({
    completedAtMs: Date.now() - 7 * 60 * 60 * 1000,  // 7 hours ago — window expired
    reflectionSubmitted: false,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, debriefPendingData: expiredDebrief })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders state-8 context card when window expired and reflection not submitted', () => {
    const { getByText } = render(<HomeScreen />)
    expect(getByText('home.state8.contextCard')).toBeTruthy()
  })

  it('renders state-8 "Reflect now" CTA', () => {
    const { getByLabelText } = render(<HomeScreen />)
    expect(getByLabelText('home.state8.cta')).toBeTruthy()
  })

  it('state-8 "Reflect now" CTA navigates to /session/debrief with all required params', () => {
    const { getByLabelText } = render(<HomeScreen />)
    fireEvent.press(getByLabelText('home.state8.cta'))
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/session/debrief')
    )
    const callArg: string = mockPush.mock.calls[0]?.[0] ?? ''
    expect(callArg).toContain('sessionId=session-abc')
    expect(callArg).toContain('preSuds=7')
    expect(callArg).toContain('debriefSuds=4')
    expect(callArg).toContain('peakSuds=8')
    expect(callArg).toContain('completedAtMs=')
  })

  it('does NOT render CourageLadderEntryCard in state 8', () => {
    const { queryByTestId } = render(<HomeScreen />)
    expect(queryByTestId('courage-card')).toBeNull()
  })
})

describe('HomeScreen — default state when debriefPendingData is null', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue({ ...defaultAuthValue, debriefPendingData: null })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders default state (CourageLadderEntryCard) when debriefPendingData is null', () => {
    const { getByTestId } = render(<HomeScreen />)
    expect(getByTestId('courage-card')).toBeTruthy()
  })

  it('does NOT render state-7 or state-8 content in default state', () => {
    const { queryByText } = render(<HomeScreen />)
    expect(queryByText('home.state7.acknowledgement')).toBeNull()
    expect(queryByText('home.state8.contextCard')).toBeNull()
  })
})
