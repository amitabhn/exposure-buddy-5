import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

jest.mock('@exposure-buddy/ui', () => {
  const { Pressable } = require('react-native')
  return {
    AccessiblePressable: ({ children, onPress, accessibilityRole, accessibilityState, accessibilityLabel, style }: any) => (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        {children}
      </Pressable>
    ),
  }
})

import { SudsCalibrationWidget } from './SudsCalibrationWidget'

describe('SudsCalibrationWidget', () => {
  it('renders 11 tap targets (0–10)', () => {
    const { getAllByRole } = render(
      <SudsCalibrationWidget value={null} onChange={jest.fn()} />
    )
    expect(getAllByRole('radio')).toHaveLength(11)
  })

  it('tapping a target calls onChange with correct value', () => {
    const mockOnChange = jest.fn()
    const { getByText } = render(
      <SudsCalibrationWidget value={null} onChange={mockOnChange} />
    )
    fireEvent.press(getByText('7'))
    expect(mockOnChange).toHaveBeenCalledWith(7)
  })

  it('anchor labels 0, 5, 10 are rendered', () => {
    const { getByText } = render(
      <SudsCalibrationWidget value={null} onChange={jest.fn()} />
    )
    expect(getByText('onboarding.assessment.sudsAnchor0')).toBeTruthy()
    expect(getByText('onboarding.assessment.sudsAnchor5')).toBeTruthy()
    expect(getByText('onboarding.assessment.sudsAnchor10')).toBeTruthy()
  })

  it('selected value tap-target has contextual label and selected style', () => {
    const { getByLabelText } = render(
      <SudsCalibrationWidget value={5} onChange={jest.fn()} />
    )
    const target = getByLabelText('5 out of 10')
    expect(target).toBeTruthy()
    expect(target).toHaveStyle({ backgroundColor: '#111827' })
    expect(target.props.accessibilityState.checked).toBe(true)
  })
})
