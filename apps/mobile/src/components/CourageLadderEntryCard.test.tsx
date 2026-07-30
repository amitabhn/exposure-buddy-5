import React from 'react'
import { render } from '@testing-library/react-native'
import { CourageLadderEntryCard } from '@exposure-buddy/ui'

// packages/ui has no RN-renderable test infra (Vitest, node environment) — this
// component is verified here, the only package with @testing-library/react-native set up.
describe('CourageLadderEntryCard SUDS clamp', () => {
  const baseItem = { id: 'a', description: 'Elevator ride', position: 1 }
  const baseProps = {
    onPress: () => {},
    nextStepLabel: 'Your next step',
    ctaLabel: 'Start this step',
    sudsPrefix: 'Anxiety ',
    sudsSuffix: '/10',
    fallbackLabel: 'No pending items',
  }

  it('clamps predictedSuds above 10 down to 10', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        {...baseProps}
        lowestPendingItem={{ ...baseItem, predictedSuds: 12 }}
        accessibilityLabel="Elevator ride, anxiety level 10 out of 10"
      />,
    )
    expect(getByText('Anxiety 10/10')).toBeTruthy()
  })

  it('clamps predictedSuds below 0 up to 0', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        {...baseProps}
        lowestPendingItem={{ ...baseItem, predictedSuds: -3 }}
        accessibilityLabel="Elevator ride, anxiety level 0 out of 10"
      />,
    )
    expect(getByText('Anxiety 0/10')).toBeTruthy()
  })

  it('rounds an in-range fractional predictedSuds', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        {...baseProps}
        lowestPendingItem={{ ...baseItem, predictedSuds: 7.6 }}
        accessibilityLabel="Elevator ride, anxiety level 8 out of 10"
      />,
    )
    expect(getByText('Anxiety 8/10')).toBeTruthy()
  })

  it('passes through an in-range integer predictedSuds unchanged', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        {...baseProps}
        lowestPendingItem={{ ...baseItem, predictedSuds: 5 }}
        accessibilityLabel="Elevator ride, anxiety level 5 out of 10"
      />,
    )
    expect(getByText('Anxiety 5/10')).toBeTruthy()
  })

  it('reflects the accessibilityLabel prop on the rendered button (Story 9.3 P0 fix)', () => {
    const { getByRole } = render(
      <CourageLadderEntryCard
        {...baseProps}
        lowestPendingItem={{ ...baseItem, predictedSuds: 5 }}
        accessibilityLabel="Elevator ride, anxiety level 5 out of 10"
      />,
    )
    expect(getByRole('button').props.accessibilityLabel).toBe('Elevator ride, anxiety level 5 out of 10')
  })

  it('renders fallbackLabel when there is no lowestPendingItem', () => {
    const { getByText } = render(
      <CourageLadderEntryCard {...baseProps} lowestPendingItem={null} accessibilityLabel="No pending items" />,
    )
    expect(getByText('No pending items')).toBeTruthy()
  })
})
