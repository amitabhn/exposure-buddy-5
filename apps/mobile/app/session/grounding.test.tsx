import React from 'react'
import { BackHandler } from 'react-native'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  // useFocusEffect calls callback immediately in test environment (mirrors useFocusOnMount.test.tsx)
  useFocusEffect: (cb: () => void) => { cb() },
}))

// BackHandler.ios.js (jest-expo's default test platform) ships a real no-op addEventListener —
// spy on it rather than jest.mock('react-native', ...), which breaks jest-expo's native module setup.
const mockAddEventListener = jest.spyOn(BackHandler, 'addEventListener')

const mockClearSessionInProgress = jest.fn()
const mockClearSessionIntention = jest.fn()
const mockClearGroundingActive = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@exposure-buddy/core', () => ({
  transition: jest.fn(() => ({ ok: true })),
  CALM_ME_AFFIRMATIONS: ['calmMe.affirmation.1'],
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: mockEnqueue })),
}))

const { useLocalSearchParams } = require('expo-router')
const { transition } = require('@exposure-buddy/core')

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({
    authState: { userId: 'user-123' },
    clearSessionInProgress: mockClearSessionInProgress,
    clearSessionIntention: mockClearSessionIntention,
    clearGroundingActive: mockClearGroundingActive,
  })
  useLocalSearchParams.mockReturnValue({
    sessionId: 'session-uuid-1',
    fearItemId: 'item-uuid-1',
    description: 'Test situation',
    preSuds: '7',
  })
})

const GroundingScreen = require('./grounding').default

describe('GroundingScreen', () => {
  it('renders affirmation text from CALM_ME_AFFIRMATIONS', () => {
    const { getByText } = render(<GroundingScreen />)
    expect(getByText('calmMe.affirmation.1')).toBeTruthy()
  })

  it('no back button rendered (headerShown is false, forward-only screen)', () => {
    const { queryByLabelText } = render(<GroundingScreen />)
    expect(queryByLabelText('common.back')).toBeNull()
  })

  it('registers Android hardware-back interceptor that swallows the event', () => {
    render(<GroundingScreen />)
    expect(mockAddEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
    const handler = mockAddEventListener.mock.calls[0]?.[1]
    expect(handler?.()).toBe(true)
  })

  it('tapping Breathing pushes to /calm-me/breathing', () => {
    const { getByLabelText } = render(<GroundingScreen />)
    fireEvent.press(getByLabelText('calmMe.technique.breathing'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me/breathing')
  })

  it('tapping 5-4-3-2-1 pushes to /calm-me/grounding', () => {
    const { getByLabelText } = render(<GroundingScreen />)
    fireEvent.press(getByLabelText('calmMe.technique.grounding'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me/grounding')
  })

  it('tapping Helplines pushes to /calm-me/helplines', () => {
    const { getByLabelText } = render(<GroundingScreen />)
    fireEvent.press(getByLabelText('calmMe.technique.helplines'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me/helplines')
  })

  it('Keep Going calls transition then router.replace (not push) to /session/active', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.keepGoing')) })
    expect(transition).toHaveBeenCalledWith('grounding', { type: 'grounding.resumed' })
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining('/session/active')
    )
    expect(mockRouterPush).not.toHaveBeenCalledWith(
      expect.stringContaining('/session/active')
    )
  })

  it('Keep Going calls clearGroundingActive (Story 9.2 — normal exit)', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.keepGoing')) })
    expect(mockClearGroundingActive).toHaveBeenCalled()
  })

  it('Keep Going bails with no navigation when transition fails', async () => {
    transition.mockReturnValueOnce({ ok: false, error: { code: 'INVALID_TRANSITION', message: 'no' } })
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.keepGoing')) })
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('Stop Session calls transition then enqueues exposure_sessions UPDATE with abandoned status', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    expect(transition).toHaveBeenCalledWith('grounding', { type: 'grounding.stopped' })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'UPDATE',
        expect.objectContaining({ status: 'abandoned' })
      )
    })
  })

  it('Stop Session bails with no enqueue/navigation when transition fails', async () => {
    transition.mockReturnValueOnce({ ok: false, error: { code: 'INVALID_TRANSITION', message: 'no' } })
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalledWith('/session/abandoned')
  })

  it('Stop Session enqueues fear_ladder_items status reset to pending', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'fear_ladder_items',
        'UPDATE',
        expect.objectContaining({ status: 'pending' })
      )
    })
  })

  it('Stop Session clears SESSION_IN_PROGRESS and SESSION_INTENTION', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(mockClearSessionInProgress).toHaveBeenCalled()
      expect(mockClearSessionIntention).toHaveBeenCalledWith('session-uuid-1')
    })
  })

  it('Stop Session calls clearGroundingActive (Story 9.2 — normal exit)', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(mockClearGroundingActive).toHaveBeenCalled()
    })
  })

  it('Stop Session navigates to /session/abandoned', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/session/abandoned')
    })
  })
})

describe('GroundingScreen — Story 9.6 error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      authState: { userId: 'user-123' },
      clearSessionInProgress: mockClearSessionInProgress,
      clearSessionIntention: mockClearSessionIntention,
      clearGroundingActive: mockClearGroundingActive,
    })
    useLocalSearchParams.mockReturnValue({
      sessionId: 'session-uuid-1',
      fearItemId: 'item-uuid-1',
      description: 'Test situation',
      preSuds: '7',
    })
  })

  it('shows abandonment-failure error text with accessibilityLiveRegion="polite" when enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText, getByText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      const errorText = getByText('grounding.abandonFailed')
      expect(errorText.props.accessibilityLiveRegion).toBe('polite')
    })
  })

  it('shows retry button when abandonment enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(getByLabelText('grounding.tryAgain')).toBeTruthy()
    })
  })

  it('does NOT clear MMKV or navigate on abandonment failure', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('grounding.stopSession')) })
    await waitFor(() => {
      expect(mockClearSessionInProgress).not.toHaveBeenCalled()
    })
    expect(mockRouterPush).not.toHaveBeenCalledWith('/session/abandoned')
  })
})
