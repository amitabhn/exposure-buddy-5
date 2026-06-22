import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { SudsScale } from './SudsScale'

describe('SudsScale', () => {
  it('renders 11 tap targets (0–10)', () => {
    const { getAllByRole } = render(<SudsScale value={null} onChange={jest.fn()} />)
    expect(getAllByRole('button')).toHaveLength(11)
  })

  it('tapping a target calls onChange with correct value', () => {
    const mockOnChange = jest.fn()
    const { getByText } = render(<SudsScale value={null} onChange={mockOnChange} />)
    fireEvent.press(getByText('7'))
    expect(mockOnChange).toHaveBeenCalledWith(7)
  })

  // The radiogroup container is intentionally not marked `accessible` — individual
  // tap targets stay independently focusable for screen reader users (the established,
  // working pattern), so we query the container's raw props via the UNSAFE_ escape hatch
  // rather than `getByRole`, which filters by RNTL's `isAccessibilityElement` check.
  it('container has accessibilityRole="radiogroup"', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={null} onChange={jest.fn()} />)
    expect(UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })).toBeTruthy()
  })

  it('sets accessibilityValue min=0 and max=10 on the radiogroup container', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={null} onChange={jest.fn()} />)
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.min).toBe(0)
    expect(group.props.accessibilityValue.max).toBe(10)
  })

  it('sets accessibilityValue.now to the selected value', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={4} onChange={jest.fn()} />)
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.now).toBe(4)
  })

  it('omits accessibilityValue.now when nothing is selected', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={null} onChange={jest.fn()} />)
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.now).toBeUndefined()
  })

  it('includes the anchor text in accessibilityValue.text for a value with a translated anchor', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={8} onChange={jest.fn()} />)
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.text).toBe('session.suds.anchor8')
  })

  it('omits accessibilityValue.text for a value with no translated anchor', () => {
    const { UNSAFE_getByProps } = render(<SudsScale value={5} onChange={jest.fn()} />)
    const group = UNSAFE_getByProps({ accessibilityRole: 'radiogroup' })
    expect(group.props.accessibilityValue.text).toBeUndefined()
  })
})
