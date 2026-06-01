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
const mockSetSudsCalibration = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../../src/components/onboarding/OnboardingStepIndicator', () => ({
  OnboardingStepIndicator: () => null,
}))

jest.mock('../../src/components/onboarding/SudsCalibrationWidget', () => {
  const { TouchableOpacity } = require('react-native')
  return {
    SudsCalibrationWidget: ({ onChange }: { onChange: (v: number) => void }) => (
      <TouchableOpacity testID="suds-widget" accessibilityRole="none" onPress={() => onChange(7)}>
      </TouchableOpacity>
    ),
  }
})

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: () => ({ enqueue: mockEnqueue }),
}))

import AssessmentScreen from './assessment'

describe('AssessmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`)
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userId: 'user-123',
      setOnboardingProgressStep: mockSetOnboardingProgressStep,
      setSudsCalibration: mockSetSudsCalibration,
    })
  })

  it('renders psychoeducation title and body content', () => {
    const { getByText } = render(<AssessmentScreen />)
    expect(getByText('onboarding.assessment.title')).toBeTruthy()
    expect(getByText('onboarding.assessment.body1')).toBeTruthy()
  })

  it('renders calibration section title', () => {
    const { getByText } = render(<AssessmentScreen />)
    expect(getByText('onboarding.assessment.calibrationTitle')).toBeTruthy()
  })

  it('renders the "Feeling overwhelmed?" link', () => {
    const { getByText } = render(<AssessmentScreen />)
    expect(getByText('onboarding.overwhelmed.cta')).toBeTruthy()
  })

  it('Next button is disabled before value selected', () => {
    const { getByRole } = render(<AssessmentScreen />)
    const button = getByRole('button')
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('on mount calls setOnboardingProgressStep(2)', () => {
    render(<AssessmentScreen />)
    expect(mockSetOnboardingProgressStep).toHaveBeenCalledWith(2)
  })

  it('pressing Next when value set calls setSudsCalibration, setOnboardingProgressStep(3), and replaces to ladder', async () => {
    const { getByTestId, getByRole } = render(<AssessmentScreen />)

    // Simulate widget selecting value 7
    fireEvent.press(getByTestId('suds-widget'))

    // Press the Next button
    fireEvent.press(getByRole('button'))

    await waitFor(() => {
      expect(mockSetSudsCalibration).toHaveBeenCalledWith(7)
      expect(mockSetOnboardingProgressStep).toHaveBeenCalledWith(3)
      expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/ladder')
    })
  })
})
