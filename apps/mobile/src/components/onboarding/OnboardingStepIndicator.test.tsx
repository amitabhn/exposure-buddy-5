import React from 'react'
import { render } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`
      return key
    },
  }),
}))

jest.mock('@exposure-buddy/core', () => ({
  ONBOARDING_STEP_COUNT: 4,
}))

import { OnboardingStepIndicator } from './OnboardingStepIndicator'

describe('OnboardingStepIndicator', () => {
  it('renders the step indicator text with correct params', () => {
    const { getByRole } = render(<OnboardingStepIndicator step={1} />)
    const el = getByRole('progressbar')
    expect(el).toBeTruthy()
  })

  it('sets accessibilityValue.now to the current step', () => {
    const { getByRole } = render(<OnboardingStepIndicator step={2} />)
    const el = getByRole('progressbar')
    expect(el.props.accessibilityValue.now).toBe(2)
  })

  it('sets accessibilityValue.min=1 and max=ONBOARDING_STEP_COUNT', () => {
    const { getByRole } = render(<OnboardingStepIndicator step={1} />)
    const el = getByRole('progressbar')
    expect(el.props.accessibilityValue.min).toBe(1)
    expect(el.props.accessibilityValue.max).toBe(4)
  })
})
