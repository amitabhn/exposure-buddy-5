import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ReducedMotionProvider, useAnimation } from '../src/contexts/AnimationContext'

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
}))

function AnimationContextProbe() {
  const { reduced } = useAnimation()
  return <Text testID="probe">{String(reduced)}</Text>
}

describe('_layout.tsx provider nesting', () => {
  it('ReducedMotionProvider inside SafeAreaProvider provides AnimationContext to child tree', () => {
    // Mirrors the nesting order in _layout.tsx: SafeAreaProvider → ReducedMotionProvider → children
    const { getByTestId } = render(
      <SafeAreaProvider>
        <ReducedMotionProvider>
          <AnimationContextProbe />
        </ReducedMotionProvider>
      </SafeAreaProvider>,
    )
    // Context value is a boolean — undefined would indicate provider is missing from tree
    const probe = getByTestId('probe')
    expect(['true', 'false']).toContain(probe.props.children)
  })
})
