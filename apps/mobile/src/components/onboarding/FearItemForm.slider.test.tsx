import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { value?: number; word?: string }) =>
      key === 'session.suds.valueText' ? `${opts?.value} out of 10, ${opts?.word}` : key,
  }),
}))

jest.mock('@exposure-buddy/core', () => ({
  detectCrisisKeywords: () => false,
}))

import { FearItemForm } from './FearItemForm'

// FearItemForm.test.tsx stubs SudsSlider; this file renders the real one so the
// value/onChange wiring between the form and the slider is covered.
describe('FearItemForm with the real SudsSlider', () => {
  it('enables Add after the + button sets a rating, and saves that rating', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    const { getByRole, getByPlaceholderText, getByLabelText } = render(
      <FearItemForm onSave={onSave} onCrisisDetected={jest.fn()} />
    )
    fireEvent.changeText(getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder'), 'a situation')
    const add = getByRole('button', { name: 'onboarding.fearLadder.addCta' })
    expect(add.props.accessibilityState.disabled).toBe(true)

    fireEvent.press(getByLabelText('session.suds.increase'))

    expect(getByRole('button', { name: 'onboarding.fearLadder.addCta' }).props.accessibilityState.disabled).toBe(false)
    fireEvent.press(getByRole('button', { name: 'onboarding.fearLadder.addCta' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('a situation', 5))
  })
})
