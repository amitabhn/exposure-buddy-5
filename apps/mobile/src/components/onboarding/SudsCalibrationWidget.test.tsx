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

  // The radiogroup container is intentionally not marked `accessible` — individual
  // radio targets stay independently focusable for screen reader users (the established,
  // working pattern), so we query the container's raw props via the UNSAFE_ escape hatch
  // rather than `getByRole`, which filters by RNTL's `isAccessibilityElement` check.
  it('sets accessibilityValue min=0 and max=10 on the radiogroup container', () => {
    const { UNSAFE_getByProps } = render(
      <SudsCalibrationWidget value={null} onChange={jest.fn()} />
    )
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.min).toBe(0)
    expect(group.props.accessibilityValue.max).toBe(10)
  })

  it('sets accessibilityValue.now to the selected value', () => {
    const { UNSAFE_getByProps } = render(
      <SudsCalibrationWidget value={7} onChange={jest.fn()} />
    )
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.now).toBe(7)
  })

  it('omits accessibilityValue.now when nothing is selected', () => {
    const { UNSAFE_getByProps } = render(
      <SudsCalibrationWidget value={null} onChange={jest.fn()} />
    )
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.now).toBeUndefined()
  })

  it('includes the anchor text in accessibilityValue.text for a value with a translated anchor', () => {
    const { UNSAFE_getByProps } = render(
      <SudsCalibrationWidget value={0} onChange={jest.fn()} />
    )
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.text).toBe('onboarding.assessment.sudsAnchor0')
  })

  it('omits accessibilityValue.text for a value with no translated anchor', () => {
    const { UNSAFE_getByProps } = render(
      <SudsCalibrationWidget value={3} onChange={jest.fn()} />
    )
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.text).toBeUndefined()
  })
})
