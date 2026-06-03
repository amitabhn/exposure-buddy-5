import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockDetectCrisisKeywords = jest.fn().mockReturnValue(false)

jest.mock('@exposure-buddy/core', () => ({
  detectCrisisKeywords: (text: string) => mockDetectCrisisKeywords(text),
}))

jest.mock('./SudsCalibrationWidget', () => {
  const { TouchableOpacity } = require('react-native')
  return {
    SudsCalibrationWidget: ({ onChange }: { onChange: (v: number) => void }) => (
      <TouchableOpacity testID="suds-widget" accessibilityRole="none" onPress={() => onChange(6)} />
    ),
  }
})

import { FearItemForm } from './FearItemForm'

describe('FearItemForm', () => {
  const mockOnSave = jest.fn()
  const mockOnCrisisDetected = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockDetectCrisisKeywords.mockReturnValue(false)
  })

  it('renders description input', () => {
    const { getByPlaceholderText } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    expect(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder')).toBeTruthy()
  })

  it('Add button is disabled when description empty', () => {
    const { getByRole } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    const button = getByRole('button', { name: 'onboarding.fearLadder.addCta' })
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('Add button is disabled when suds not selected', () => {
    const { getByRole, getByPlaceholderText } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'test description')
    const button = getByRole('button', { name: 'onboarding.fearLadder.addCta' })
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('Add button is disabled when description is only whitespace', () => {
    const { getByRole, getByPlaceholderText } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), '   ')
    const button = getByRole('button', { name: 'onboarding.fearLadder.addCta' })
    expect(button.props.accessibilityState.disabled).toBe(true)
  })

  it('pressing Add with valid inputs calls onSave and clears form', () => {
    const { getByRole, getByPlaceholderText, getByTestId } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'test description')
    fireEvent.press(getByTestId('suds-widget'))
    fireEvent.press(getByRole('button', { name: 'onboarding.fearLadder.addCta' }))
    expect(mockOnSave).toHaveBeenCalledWith('test description', 6)
    expect(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder').props.value).toBe('')
  })

  it('calls onCrisisDetected when detectCrisisKeywords returns true', () => {
    mockDetectCrisisKeywords.mockReturnValue(true)
    const { getByPlaceholderText } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'crisis text')
    expect(mockOnCrisisDetected).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onCrisisDetected twice for same form instance', () => {
    mockDetectCrisisKeywords.mockReturnValue(true)
    const { getByPlaceholderText } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'crisis text')
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'crisis text again')
    expect(mockOnCrisisDetected).toHaveBeenCalledTimes(1)
  })

  it('save is NOT blocked when crisis detected', () => {
    mockDetectCrisisKeywords.mockReturnValue(true)
    const { getByRole, getByPlaceholderText, getByTestId } = render(
      <FearItemForm onSave={mockOnSave} onCrisisDetected={mockOnCrisisDetected} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'crisis text')
    fireEvent.press(getByTestId('suds-widget'))
    fireEvent.press(getByRole('button', { name: 'onboarding.fearLadder.addCta' }))
    expect(mockOnSave).toHaveBeenCalledWith('crisis text', 6)
  })
})
