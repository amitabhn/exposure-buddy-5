import React from 'react'
import { render } from '@testing-library/react-native'
import { CourageLadderEntryCard } from '@exposure-buddy/ui'

// packages/ui has no RN-renderable test infra (Vitest, node environment) — this
// component is verified here, the only package with @testing-library/react-native set up.
describe('CourageLadderEntryCard SUDS clamp', () => {
  const baseItem = { id: 'a', description: 'Elevator ride', position: 1 }

  it('clamps predictedSuds above 10 down to 10', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        ladderItemCount={1}
        lowestPendingItem={{ ...baseItem, predictedSuds: 12 }}
        onPress={() => {}}
      />,
    )
    expect(getByText('Anxiety: 10/10')).toBeTruthy()
  })

  it('clamps predictedSuds below 0 up to 0', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        ladderItemCount={1}
        lowestPendingItem={{ ...baseItem, predictedSuds: -3 }}
        onPress={() => {}}
      />,
    )
    expect(getByText('Anxiety: 0/10')).toBeTruthy()
  })

  it('rounds an in-range fractional predictedSuds', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        ladderItemCount={1}
        lowestPendingItem={{ ...baseItem, predictedSuds: 7.6 }}
        onPress={() => {}}
      />,
    )
    expect(getByText('Anxiety: 8/10')).toBeTruthy()
  })

  it('passes through an in-range integer predictedSuds unchanged', () => {
    const { getByText } = render(
      <CourageLadderEntryCard
        ladderItemCount={1}
        lowestPendingItem={{ ...baseItem, predictedSuds: 5 }}
        onPress={() => {}}
      />,
    )
    expect(getByText('Anxiety: 5/10')).toBeTruthy()
  })
})
