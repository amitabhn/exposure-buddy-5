import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts && 'technique' in opts ? `${key}:${opts.technique}` : key),
  }),
}))

const mockBack = jest.fn()
const mockUseLocalSearchParams = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))

jest.mock('../../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

import RelaxationComingSoonScreen from './coming-soon'

beforeEach(() => {
  jest.clearAllMocks()
  mockUseLocalSearchParams.mockReturnValue({ technique: 'bodyScan' })
})

describe('RelaxationComingSoonScreen (Story 19.2)', () => {
  it('names the technique that is not available yet', () => {
    const { getByText } = render(<RelaxationComingSoonScreen />)
    expect(getByText('relaxation.comingSoon.title')).toBeTruthy()
    expect(getByText('relaxation.comingSoon.body:relaxation.techniques.bodyScan.label')).toBeTruthy()
  })

  it('offers a way back to the picker', () => {
    const { getByRole } = render(<RelaxationComingSoonScreen />)
    fireEvent.press(getByRole('button', { name: 'relaxation.comingSoon.back' }))
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it.each([{ technique: 'notATechnique' }, {}, { technique: undefined }])(
    'falls back to the generic message for an unknown or missing technique (%j), without crashing',
    (params) => {
      mockUseLocalSearchParams.mockReturnValue(params)
      const { getByText, getByRole } = render(<RelaxationComingSoonScreen />)
      expect(getByText('relaxation.comingSoon.bodyGeneric')).toBeTruthy()
      expect(getByRole('button', { name: 'relaxation.comingSoon.back' })).toBeTruthy()
    },
  )
})
