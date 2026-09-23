import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()
const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
  }),
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)
jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: mockEnqueue })),
}))

const mockClearSessionIntention = jest.fn()
const mockGetSessionIntention = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@exposure-buddy/ui', () => {
  const actual = jest.requireActual('@exposure-buddy/ui')
  return {
    SudsArcChart: ({ accessibilityLabel }: { accessibilityLabel?: string }) => {
      const { View } = require('react-native')
      return <View testID="suds-arc-chart" accessibilityLabel={accessibilityLabel} />
    },
    color: actual.color,
    typography: {
      display:   { fontSize: 28, fontWeight: '400', lineHeight: 32, fontFamily: 'DMSerifDisplay_400Regular_Italic' },
      narrative: { fontSize: 15, fontWeight: '400', lineHeight: 24, fontFamily: 'DMSerifDisplay_400Regular_Italic' },
    },
  }
})

const { useLocalSearchParams } = require('expo-router')

const baseParams = {
  sessionId: 'session-1',
  fearItemId: 'item-1',
  preSuds: '6',
  debriefSuds: '4',
  peakSuds: '6',
  completedAtMs: String(Date.now() - 1000),  // just completed
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSessionIntention.mockReturnValue(null)
  mockUseAuth.mockReturnValue({
    clearSessionIntention: mockClearSessionIntention,
    getSessionIntention: mockGetSessionIntention,
  })
  useLocalSearchParams.mockReturnValue(baseParams)
})

const DebriefScreen = require('./debrief').default

describe('DebriefScreen — Branch A (intention letter present)', () => {
  beforeEach(() => {
    mockGetSessionIntention.mockReturnValue('I expect to feel scared but I will push through.')
    useLocalSearchParams.mockReturnValue(baseParams)
  })

  it('renders letter intro and letter text', () => {
    const { getByText } = render(<DebriefScreen />)
    expect(getByText('session.debrief.letterIntro')).toBeTruthy()
    expect(getByText('I expect to feel scared but I will push through.')).toBeTruthy()
  })

  it('shows SUDS arc chart on Branch A', () => {
    const { getByTestId } = render(<DebriefScreen />)
    expect(getByTestId('suds-arc-chart')).toBeTruthy()
  })

  it('shows reflection TextInput and Done CTA', () => {
    const { getByLabelText } = render(<DebriefScreen />)
    expect(getByLabelText('session.debrief.reflectionPrompt')).toBeTruthy()
    expect(getByLabelText('session.debrief.done')).toBeTruthy()
  })
})

describe('DebriefScreen — Branch B (no intention, SUDS improved)', () => {
  beforeEach(() => {
    mockGetSessionIntention.mockReturnValue(null)
    useLocalSearchParams.mockReturnValue({ ...baseParams, preSuds: '7', debriefSuds: '4' })
  })

  it('renders Branch B acknowledgement text', () => {
    const { getByText } = render(<DebriefScreen />)
    expect(getByText('session.debrief.acknowledgement')).toBeTruthy()
  })

  it('shows SUDS arc chart on Branch B', () => {
    const { getByTestId } = render(<DebriefScreen />)
    expect(getByTestId('suds-arc-chart')).toBeTruthy()
  })
})

describe('DebriefScreen — Branch C (no intention, no improvement)', () => {
  beforeEach(() => {
    mockGetSessionIntention.mockReturnValue(null)
    useLocalSearchParams.mockReturnValue({ ...baseParams, preSuds: '6', debriefSuds: '6' })
  })

  it('renders Branch C acknowledgement text', () => {
    const { getByText } = render(<DebriefScreen />)
    expect(getByText('session.debrief.acknowledgementNoImprovement')).toBeTruthy()
  })

  it('does NOT show SUDS arc chart on Branch C', () => {
    const { queryByTestId } = render(<DebriefScreen />)
    expect(queryByTestId('suds-arc-chart')).toBeNull()
  })
})

describe('DebriefScreen — FR-ADVERSE-01 crisis contacts', () => {
  it('shows crisis contacts when debriefSuds = 8 (threshold met)', () => {
    useLocalSearchParams.mockReturnValue({ ...baseParams, debriefSuds: '8', peakSuds: '6' })
    const { getByLabelText } = render(<DebriefScreen />)
    expect(getByLabelText('iCall: 9152987821')).toBeTruthy()
    expect(getByLabelText('Vandrevala Foundation: 9999-666-555')).toBeTruthy()
    expect(getByLabelText('Tele MANAS: 1800-891-4416')).toBeTruthy()
  })

  it('shows crisis contacts when peakSuds = 8 and debriefSuds = 6', () => {
    useLocalSearchParams.mockReturnValue({ ...baseParams, debriefSuds: '6', peakSuds: '8' })
    const { getByLabelText } = render(<DebriefScreen />)
    expect(getByLabelText('iCall: 9152987821')).toBeTruthy()
  })

  it('does NOT show crisis contacts when debriefSuds = 7 AND peakSuds = 7', () => {
    useLocalSearchParams.mockReturnValue({ ...baseParams, debriefSuds: '7', peakSuds: '7' })
    const { queryByLabelText } = render(<DebriefScreen />)
    expect(queryByLabelText('iCall: 9152987821')).toBeNull()
  })
})

describe('DebriefScreen — handleSubmitReflection', () => {
  it('Done button enqueues post_session_reflection UPDATE, clears intention, and routes home', async () => {
    useLocalSearchParams.mockReturnValue(baseParams)
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'UPDATE',
        expect.objectContaining({ id: 'session-1' })
      )
    })
    expect(mockClearSessionIntention).toHaveBeenCalledWith('session-1')
    expect(mockRouterReplace).toHaveBeenCalledWith('/')
  })
})

describe('DebriefScreen — readOnly mode', () => {
  beforeEach(() => {
    mockGetSessionIntention.mockReturnValue('My letter text')
    useLocalSearchParams.mockReturnValue({ ...baseParams, readOnly: 'true' })
  })

  it('does not render reflection TextInput in readOnly mode', () => {
    const { queryByLabelText } = render(<DebriefScreen />)
    expect(queryByLabelText('session.debrief.reflectionPrompt')).toBeNull()
  })

  it('renders a back button in readOnly mode', () => {
    const { getByLabelText } = render(<DebriefScreen />)
    expect(getByLabelText('session.debrief.done')).toBeTruthy()
  })

  it('back button calls router.back() in readOnly mode', async () => {
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    expect(mockRouterBack).toHaveBeenCalled()
  })

  it('does NOT call clearSessionIntention in readOnly mode', async () => {
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    expect(mockClearSessionIntention).not.toHaveBeenCalled()
  })

  it('does NOT call enqueue in readOnly mode', async () => {
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })
})

describe('DebriefScreen — Story 9.6 error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionIntention.mockReturnValue(null)
    mockUseAuth.mockReturnValue({
      clearSessionIntention: mockClearSessionIntention,
      getSessionIntention: mockGetSessionIntention,
    })
    useLocalSearchParams.mockReturnValue(baseParams)
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows save-failure error text when enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText, getByText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      expect(getByText('session.debrief.saveFailed')).toBeTruthy()
    })
  })

  it('calls AccessibilityInfo.announceForAccessibility with the error text when enqueue rejects (Story 12.4 AC-C)', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('session.debrief.saveFailed')
    })
  })

  it('does not call announceForAccessibility before any save failure', () => {
    render(<DebriefScreen />)
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled()
  })

  it('does not set accessibilityLiveRegion on the save-failure text (Story 12.4 AC-C — imperative announcement only, avoids double-announcing on Android)', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText, getByText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      const errorText = getByText('session.debrief.saveFailed')
      expect(errorText.props.accessibilityLiveRegion).toBeUndefined()
    })
  })

  it('shows retry button when enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      expect(getByLabelText('session.debrief.tryAgain')).toBeTruthy()
    })
  })

  it('does NOT navigate home when enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<DebriefScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.debrief.done')) })
    await waitFor(() => {
      expect(mockRouterReplace).not.toHaveBeenCalled()
    })
  })
})
