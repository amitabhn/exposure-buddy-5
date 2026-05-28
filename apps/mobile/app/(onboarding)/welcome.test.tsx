import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

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
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../../src/components/onboarding/OnboardingStepIndicator', () => ({
  OnboardingStepIndicator: () => null,
}))

import WelcomeScreen from './welcome'

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      onboardingProgressStep: null,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
  })

  it('renders the title and CTA button', () => {
    const { getByText } = render(<WelcomeScreen />)
    expect(getByText('onboarding.welcome.title')).toBeTruthy()
    expect(getByText('onboarding.welcome.cta')).toBeTruthy()
  })

  it('CTA button is accessible via role=button', () => {
    const { getByRole } = render(<WelcomeScreen />)
    expect(getByRole('button')).toBeTruthy()
  })

  it('pressing Get started calls setOnboardingProgressStep(1) then navigates', () => {
    const { getByRole } = render(<WelcomeScreen />)
    fireEvent.press(getByRole('button'))
    expect(mockSetOnboardingProgressStep).toHaveBeenCalledWith(1)
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/assessment')
  })

  it('does not navigate on mount when onboardingProgressStep is null', () => {
    render(<WelcomeScreen />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('navigates to assessment when onboardingProgressStep >= 2', () => {
    mockUseAuth.mockReturnValue({
      onboardingProgressStep: 2,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/assessment')
  })

  it('stays on welcome when onboardingProgressReadFailed is true', () => {
    mockUseAuth.mockReturnValue({
      onboardingProgressStep: null,
      onboardingProgressReadFailed: true,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
