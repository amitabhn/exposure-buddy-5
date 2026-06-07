import React from 'react'
import { render, act } from '@testing-library/react-native'
import { SudsArcChart } from '@exposure-buddy/ui'

describe('SudsArcChart', () => {
  it('renders without crashing for minimum 2 readings', () => {
    const { getByRole } = render(<SudsArcChart readings={[6, 4]} />)
    expect(getByRole('image')).toBeTruthy()
  })

  it('renders without crashing for a single reading (edge case)', () => {
    expect(() => render(<SudsArcChart readings={[5]} />)).not.toThrow()
  })

  it('returns null for empty readings array', () => {
    const { toJSON } = render(<SudsArcChart readings={[]} />)
    expect(toJSON()).toBeNull()
  })

  it('renders with accessibilityLabel when provided', () => {
    const { getByLabelText } = render(
      <SudsArcChart readings={[7, 4]} accessibilityLabel="Session SUDS chart" />
    )
    expect(getByLabelText('Session SUDS chart')).toBeTruthy()
  })

  it('renders correct dot and line elements after layout event fires', async () => {
    const { getByRole, UNSAFE_getAllByType } = render(
      <SudsArcChart readings={[6, 4, 3]} />
    )
    const container = getByRole('image')
    // Simulate layout event — sets containerWidth so dots and lines render
    await act(async () => {
      const onLayout = container.props.onLayout
      if (onLayout) {
        onLayout({ nativeEvent: { layout: { width: 300, height: 80 } } })
      }
    })
    const { View } = require('react-native')
    // 3 readings → 3 dots + 2 connecting lines + 1 container = 6 Views minimum
    const views = UNSAFE_getAllByType(View)
    expect(views.length).toBeGreaterThanOrEqual(6)
  })
})
