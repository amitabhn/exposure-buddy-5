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

const mockGetLastUsedTechnique = jest.fn()
const mockSetLastUsedTechnique = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

const { useLocalSearchParams } = require('expo-router')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetLastUsedTechnique.mockReturnValue(null)
  mockUseAuth.mockReturnValue({
    getLastUsedTechnique: mockGetLastUsedTechnique,
    setLastUsedTechnique: mockSetLastUsedTechnique,
  })
  useLocalSearchParams.mockReturnValue({
    fearItemId: 'item-uuid-1',
    sessionId: 'session-uuid-1',
    description: 'Test fear situation',
    predictedSuds: '5',
  })
})

const TechniqueScreen = require('./technique').default

describe('TechniqueScreen', () => {
  it('renders 3 technique cards', () => {
    const { getByLabelText } = render(<TechniqueScreen />)
    // Three radio buttons
    expect(getByLabelText('session.technique.somaticLabel')).toBeTruthy()
    expect(getByLabelText('session.technique.breathingLabel')).toBeTruthy()
    expect(getByLabelText('session.technique.cognitiveLabel')).toBeTruthy()
  })

  it('"Continue" button is disabled with no selection', () => {
    const { getByLabelText } = render(<TechniqueScreen />)
    const continueBtn = getByLabelText('session.technique.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true)
  })

  it('selecting a card enables "Continue"', () => {
    const { getByLabelText } = render(<TechniqueScreen />)
    fireEvent.press(getByLabelText('session.technique.somaticLabel'))
    const continueBtn = getByLabelText('session.technique.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(false)
  })

  it('pre-selects last-used technique when getLastUsedTechnique returns "breathing"', () => {
    mockGetLastUsedTechnique.mockReturnValue('breathing')
    const { getByLabelText } = render(<TechniqueScreen />)
    const continueBtn = getByLabelText('session.technique.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(false)
  })

  it('tapping "Continue" calls setLastUsedTechnique before router.push', () => {
    const callOrder: string[] = []
    mockSetLastUsedTechnique.mockImplementation(() => { callOrder.push('set') })
    mockRouterPush.mockImplementation(() => { callOrder.push('push') })
    const { getByLabelText } = render(<TechniqueScreen />)
    fireEvent.press(getByLabelText('session.technique.breathingLabel'))
    fireEvent.press(getByLabelText('session.technique.continue'))
    expect(mockSetLastUsedTechnique).toHaveBeenCalledWith('item-uuid-1', 'breathing')
    expect(callOrder).toEqual(['set', 'push'])
  })

  it('tapping "Continue" pushes a URL containing /session/intent with technique= param', () => {
    const { getByLabelText } = render(<TechniqueScreen />)
    fireEvent.press(getByLabelText('session.technique.somaticLabel'))
    fireEvent.press(getByLabelText('session.technique.continue'))
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('/session/intent')
    )
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('technique=somatic')
    )
  })

  it('when getLastUsedTechnique returns null, no card is pre-selected and "Continue" remains disabled', () => {
    mockGetLastUsedTechnique.mockReturnValue(null)
    const { getByLabelText } = render(<TechniqueScreen />)
    const continueBtn = getByLabelText('session.technique.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true)
    // Somatic card should not have selected state
    const somaticCard = getByLabelText('session.technique.somaticLabel')
    expect(somaticCard.props.accessibilityState?.selected).toBe(false)
  })
})
