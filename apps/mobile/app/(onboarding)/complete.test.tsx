import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && 'count' in opts) return `${key}:${opts.count}`
      return key
    },
  }),
}))

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

const mockMarkOnboardingComplete = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

import CompleteScreen from './complete'

describe('CompleteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      crisisFlaggedInOnboarding: false,
      markOnboardingComplete: mockMarkOnboardingComplete,
    })
    mockUseLocalSearchParams.mockReturnValue({ count: '5' })
  })

  it('renders title (non-crisis path)', () => {
    const { getByText } = render(<CompleteScreen />)
    expect(getByText('onboarding.complete.title')).toBeTruthy()
  })

  it('renders titleSoft (crisis path)', () => {
    mockUseAuth.mockReturnValue({
      crisisFlaggedInOnboarding: true,
      markOnboardingComplete: mockMarkOnboardingComplete,
    })
    const { getByText } = render(<CompleteScreen />)
    expect(getByText('onboarding.complete.titleSoft')).toBeTruthy()
  })

  it('shows item count when count param is present and > 0 (non-crisis)', () => {
    const { getByText } = render(<CompleteScreen />)
    expect(getByText('onboarding.complete.itemCount:5')).toBeTruthy()
  })

  it('omits item count in crisis path even when count present', () => {
    mockUseAuth.mockReturnValue({
      crisisFlaggedInOnboarding: true,
      markOnboardingComplete: mockMarkOnboardingComplete,
    })
    const { queryByText } = render(<CompleteScreen />)
    expect(queryByText('onboarding.complete.itemCount:5')).toBeNull()
  })

  it('omits item count when count param is absent (resume case)', () => {
    // Simulates welcome.tsx resume path which calls router.replace without params
    mockUseLocalSearchParams.mockReturnValue({})
    const { queryByText } = render(<CompleteScreen />)
    expect(queryByText(/onboarding\.complete\.itemCount/)).toBeNull()
  })

  it('omits item count when count param is "0"', () => {
    mockUseLocalSearchParams.mockReturnValue({ count: '0' })
    const { queryByText } = render(<CompleteScreen />)
    expect(queryByText(/onboarding\.complete\.itemCount/)).toBeNull()
  })

  it('shows overwhelmed link in crisis path', () => {
    mockUseAuth.mockReturnValue({
      crisisFlaggedInOnboarding: true,
      markOnboardingComplete: mockMarkOnboardingComplete,
    })
    const { getByText } = render(<CompleteScreen />)
    expect(getByText('onboarding.overwhelmed.cta')).toBeTruthy()
  })

  it('does NOT show overwhelmed link in non-crisis path', () => {
    const { queryByRole } = render(<CompleteScreen />)
    // The overwhelmed link is a button in crisis path only
    const overwhelmedButtons = queryByRole('button', { name: 'onboarding.overwhelmed.cta' })
    expect(overwhelmedButtons).toBeNull()
  })

  it('tapping CTA calls markOnboardingComplete then navigates', () => {
    const { getByRole } = render(<CompleteScreen />)
    fireEvent.press(getByRole('button', { name: 'onboarding.complete.cta' }))
    expect(mockMarkOnboardingComplete).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/')
    // Verify call order: markOnboardingComplete before replace
    expect(mockMarkOnboardingComplete.mock.invocationCallOrder[0]!)
      .toBeLessThan(mockReplace.mock.invocationCallOrder[0]!)
  })

  it('does NOT call markOnboardingComplete on mount (only on CTA tap)', () => {
    render(<CompleteScreen />)
    expect(mockMarkOnboardingComplete).not.toHaveBeenCalled()
  })
})
