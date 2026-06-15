import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockGetSessionIntention = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

const { useLocalSearchParams } = require('expo-router')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSessionIntention.mockReturnValue(null)
  mockUseAuth.mockReturnValue({
    getSessionIntention: mockGetSessionIntention,
  })
  useLocalSearchParams.mockReturnValue({
    sessionId: 'session-uuid-1',
    fearItemId: 'item-uuid-1',
    description: 'Test fear situation',
    preSuds: '6',
  })
})

const BriefingScreen = require('./briefing').default

describe('BriefingScreen', () => {
  it('renders session context copy', () => {
    const { getByText } = render(<BriefingScreen />)
    expect(getByText('session.briefing.sessionContext')).toBeTruthy()
  })

  it('renders intention letter block when getSessionIntention returns a non-empty string', () => {
    mockGetSessionIntention.mockReturnValue('I expect to feel anxious but I can handle it.')
    const { getByText } = render(<BriefingScreen />)
    expect(getByText('session.briefing.letterIntro')).toBeTruthy()
    expect(getByText('I expect to feel anxious but I can handle it.')).toBeTruthy()
  })

  it('does NOT render letter block when getSessionIntention returns null', () => {
    mockGetSessionIntention.mockReturnValue(null)
    const { queryByText } = render(<BriefingScreen />)
    expect(queryByText('session.briefing.letterIntro')).toBeNull()
  })

  it('tapping "I\'m ready" calls router.push with a URL containing /session/active', () => {
    const { getByLabelText } = render(<BriefingScreen />)
    fireEvent.press(getByLabelText('session.briefing.readyButton'))
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('/session/active')
    )
  })
})
