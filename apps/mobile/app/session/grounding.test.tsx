import React from 'react'
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
}))

const mockClearSessionInProgress = jest.fn()
const mockClearSessionIntention = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: mockEnqueue })),
}))

const { useLocalSearchParams } = require('expo-router')

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({
    authState: { userId: 'user-123' },
    clearSessionInProgress: mockClearSessionInProgress,
    clearSessionIntention: mockClearSessionIntention,
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
  it('renders affirmation text', () => {
    const { getByText } = render(<GroundingScreen />)
    expect(getByText('session.grounding.affirmation')).toBeTruthy()
  })

  it('renders breathing prompt', () => {
    const { getByText } = render(<GroundingScreen />)
    expect(getByText('session.grounding.breathingPrompt')).toBeTruthy()
  })

  it('no back button rendered (headerShown is false, forward-only screen)', () => {
    const { queryByLabelText } = render(<GroundingScreen />)
    expect(queryByLabelText('common.back')).toBeNull()
  })

  it('Resume uses router.replace (not push) to /session/active', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.grounding.resume')) })
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining('/session/active')
    )
    expect(mockRouterPush).not.toHaveBeenCalledWith(
      expect.stringContaining('/session/active')
    )
  })

  it('Confirm Stop enqueues exposure_sessions UPDATE with abandoned status', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.grounding.confirmStop')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'UPDATE',
        expect.objectContaining({ status: 'abandoned' })
      )
    })
  })

  it('Confirm Stop enqueues fear_ladder_items status reset to pending', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.grounding.confirmStop')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'fear_ladder_items',
        'UPDATE',
        expect.objectContaining({ status: 'pending' })
      )
    })
  })

  it('Confirm Stop clears SESSION_IN_PROGRESS and SESSION_INTENTION', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.grounding.confirmStop')) })
    await waitFor(() => {
      expect(mockClearSessionInProgress).toHaveBeenCalled()
      expect(mockClearSessionIntention).toHaveBeenCalledWith('session-uuid-1')
    })
  })

  it('Confirm Stop navigates to /session/abandoned', async () => {
    const { getByLabelText } = render(<GroundingScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.grounding.confirmStop')) })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/session/abandoned')
    })
  })
})
