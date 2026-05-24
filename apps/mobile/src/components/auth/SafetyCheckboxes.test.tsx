import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { SafetyCheckboxes } from './SafetyCheckboxes'

describe('SafetyCheckboxes', () => {
  const defaultProps = {
    ageConfirmed: false,
    medicoLegalConfirmed: false,
    onToggleAge: jest.fn(),
    onToggleMedicoLegal: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the intro text', () => {
    const { getByText } = render(<SafetyCheckboxes {...defaultProps} />)
    expect(getByText('auth.safety.consentIntro')).toBeTruthy()
  })

  it('renders both checkbox rows with correct labels', () => {
    const { getByText } = render(<SafetyCheckboxes {...defaultProps} />)
    expect(getByText('auth.safety.ageConfirmation')).toBeTruthy()
    expect(getByText('auth.safety.medicoLegalDisclaimer')).toBeTruthy()
  })

  it('both checkboxes are unchecked by default', () => {
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} />)
    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0].props.accessibilityState.checked).toBe(false)
    expect(checkboxes[1].props.accessibilityState.checked).toBe(false)
  })

  it('calls onToggleAge when age checkbox row is pressed', () => {
    const onToggleAge = jest.fn()
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} onToggleAge={onToggleAge} />)
    const checkboxes = getAllByRole('checkbox')
    fireEvent.press(checkboxes[0])
    expect(onToggleAge).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleMedicoLegal when medico-legal checkbox row is pressed', () => {
    const onToggleMedicoLegal = jest.fn()
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} onToggleMedicoLegal={onToggleMedicoLegal} />)
    const checkboxes = getAllByRole('checkbox')
    fireEvent.press(checkboxes[1])
    expect(onToggleMedicoLegal).toHaveBeenCalledTimes(1)
  })

  it('age checkbox reflects checked state via accessibilityState', () => {
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} ageConfirmed={true} />)
    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes[0].props.accessibilityState.checked).toBe(true)
    expect(checkboxes[1].props.accessibilityState.checked).toBe(false)
  })

  it('medico-legal checkbox reflects checked state via accessibilityState', () => {
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} medicoLegalConfirmed={true} />)
    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes[0].props.accessibilityState.checked).toBe(false)
    expect(checkboxes[1].props.accessibilityState.checked).toBe(true)
  })

  it('age checkbox has correct accessibilityRole and label', () => {
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} />)
    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes[0].props.accessibilityRole).toBe('checkbox')
    expect(checkboxes[0].props.accessibilityLabel).toBe('auth.safety.ageConfirmation')
  })

  it('medico-legal checkbox has correct accessibilityRole and label', () => {
    const { getAllByRole } = render(<SafetyCheckboxes {...defaultProps} />)
    const checkboxes = getAllByRole('checkbox')
    expect(checkboxes[1].props.accessibilityRole).toBe('checkbox')
    expect(checkboxes[1].props.accessibilityLabel).toBe('auth.safety.medicoLegalDisclaimer')
  })
})
