import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Stack: {
    Screen: () => null,
  },
}))

const mockSetOnboardingProgressStep = jest.fn()
const mockSetCrisisFlaggedInOnboarding = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../../src/components/onboarding/OnboardingStepIndicator', () => ({
  OnboardingStepIndicator: () => null,
}))

jest.mock('../../src/components/onboarding/FearItemForm', () => {
  const { TouchableOpacity } = require('react-native')
  return {
    FearItemForm: ({ onSave, onCrisisDetected }: { onSave: (d: string, s: number) => void; onCrisisDetected: () => void }) => (
      <>
        <TouchableOpacity testID="form-add" onPress={() => onSave('Test situation', 5)} />
        <TouchableOpacity testID="form-crisis" onPress={() => onCrisisDetected()} />
      </>
    ),
  }
})

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: () => ({ enqueue: mockEnqueue }),
}))

import LadderScreen from './ladder'

describe('LadderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    let callCount = 0
    jest.spyOn(Math, 'random').mockImplementation(() => (callCount++ % 32) * 0.03125)
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userId: 'user-123',
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
      setCrisisFlaggedInOnboarding: mockSetCrisisFlaggedInOnboarding,
    })
  })

  it('renders title', () => {
    const { getByText } = render(<LadderScreen />)
    expect(getByText('onboarding.fearLadder.title')).toBeTruthy()
  })

  it('on mount calls setOnboardingProgressStep(3)', () => {
    render(<LadderScreen />)
    expect(mockSetOnboardingProgressStep).toHaveBeenCalledWith(3)
  })

  it('Next button is disabled with fewer than 3 items', () => {
    const { getByRole } = render(<LadderScreen />)
    const button = getByRole('button', { name: 'onboarding.fearLadder.nextCta' })
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('shows minimumItems helper text with fewer than 3 items', () => {
    const { getByText, getByRole } = render(<LadderScreen />)
    expect(getByText('onboarding.fearLadder.minimumItems')).toBeTruthy()
    const button = getByRole('button', { name: 'onboarding.fearLadder.nextCta' })
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('Next enabled and helper hidden after 3 items added', async () => {
    const { getByTestId, queryByText, getByRole } = render(<LadderScreen />)

    // Add item 1
    fireEvent.press(getByTestId('form-add'))
    await waitFor(() => expect(getByTestId('add-another-button')).toBeTruthy())
    fireEvent.press(getByTestId('add-another-button'))

    // Add item 2
    fireEvent.press(getByTestId('form-add'))
    await waitFor(() => expect(getByTestId('add-another-button')).toBeTruthy())
    fireEvent.press(getByTestId('add-another-button'))

    // Add item 3
    fireEvent.press(getByTestId('form-add'))

    await waitFor(() => {
      const button = getByRole('button', { name: 'onboarding.fearLadder.nextCta' })
      expect(button.props.accessibilityState.disabled).toBe(false)
      expect(queryByText('onboarding.fearLadder.minimumItems')).toBeNull()
    })
  })

  it('hides FearItemForm and shows maximumItems after 10 items', async () => {
    const { getByTestId, queryByTestId, getByText } = render(<LadderScreen />)

    for (let i = 0; i < 10; i++) {
      fireEvent.press(getByTestId('form-add'))
      await waitFor(() => {
        if (i < 9) {
          expect(getByTestId('add-another-button')).toBeTruthy()
        }
      })
      if (i < 9) {
        fireEvent.press(getByTestId('add-another-button'))
      }
    }

    await waitFor(() => {
      expect(getByText('onboarding.fearLadder.maximumItems')).toBeTruthy()
      expect(queryByTestId('form-add')).toBeNull()
      expect(queryByTestId('add-another-button')).toBeNull()
    })
  })

  it('shows crisis banner when onCrisisDetected fires', async () => {
    const { getByTestId, getByText } = render(<LadderScreen />)
    fireEvent.press(getByTestId('form-crisis'))
    await waitFor(() => {
      expect(getByText('onboarding.crisisDetected.banner')).toBeTruthy()
    })
  })

  it('calls setCrisisFlaggedInOnboarding exactly once even when onCrisisDetected fires multiple times', async () => {
    const { getByTestId } = render(<LadderScreen />)
    fireEvent.press(getByTestId('form-crisis'))
    fireEvent.press(getByTestId('form-crisis'))
    await waitFor(() => {
      expect(mockSetCrisisFlaggedInOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it('pressing Next when ≥3 items calls setOnboardingProgressStep(4) and navigates to complete', async () => {
    const { getByTestId, getByRole } = render(<LadderScreen />)

    // Add 3 items
    fireEvent.press(getByTestId('form-add'))
    await waitFor(() => expect(getByTestId('add-another-button')).toBeTruthy())
    fireEvent.press(getByTestId('add-another-button'))

    fireEvent.press(getByTestId('form-add'))
    await waitFor(() => expect(getByTestId('add-another-button')).toBeTruthy())
    fireEvent.press(getByTestId('add-another-button'))

    fireEvent.press(getByTestId('form-add'))

    await waitFor(() => {
      const button = getByRole('button', { name: 'onboarding.fearLadder.nextCta' })
      expect(button.props.accessibilityState.disabled).toBe(false)
    })

    fireEvent.press(getByRole('button', { name: 'onboarding.fearLadder.nextCta' }))

    await waitFor(() => {
      expect(mockSetOnboardingProgressStep).toHaveBeenCalledWith(4)
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/complete')
    })
  })
})
