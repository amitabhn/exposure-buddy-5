import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { CalmMeButton } from '@exposure-buddy/ui'

// packages/ui has no RN-renderable test infra (Vitest, node environment) — this
// component is verified here, the only package with @testing-library/react-native set up.
describe('CalmMeButton', () => {
  it('has accessibilityRole="button" and the given accessibilityLabel', () => {
    const { getByRole } = render(
      <CalmMeButton onPress={jest.fn()} accessibilityLabel="Calm Me" />,
    )
    const el = getByRole('button')
    expect(el.props.accessibilityLabel).toBe('Calm Me')
  })

  it('passes accessibilityHint through when provided', () => {
    const { getByRole } = render(
      <CalmMeButton onPress={jest.fn()} accessibilityLabel="Calm Me" accessibilityHint="Opens calming techniques" />,
    )
    const el = getByRole('button')
    expect(el.props.accessibilityHint).toBe('Opens calming techniques')
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByRole } = render(
      <CalmMeButton onPress={onPress} accessibilityLabel="Calm Me" />,
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
