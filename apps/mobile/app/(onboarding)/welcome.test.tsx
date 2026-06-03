import React from 'react'
import { Alert } from 'react-native'
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
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: null,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
  })

  afterEach(() => {
    alertSpy.mockRestore()
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

  it('does not act while isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      onboardingProgressStep: 2,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('navigates to assessment when onboardingProgressStep is 2', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: 2,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/assessment')
  })

  it('navigates to ladder when onboardingProgressStep is 3', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: 3,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/ladder')
  })

  it('navigates to complete when onboardingProgressStep is 4', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: 4,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/complete')
  })

  it('stays on welcome when onboardingProgressStep is > 4 (route not yet created)', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: 5,
      onboardingProgressReadFailed: false,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('shows Alert and stays on welcome when onboardingProgressReadFailed is true', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      onboardingProgressStep: null,
      onboardingProgressReadFailed: true,
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
    })
    render(<WelcomeScreen />)
    expect(alertSpy).toHaveBeenCalledWith('onboarding.resumeFailed.toast')
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
