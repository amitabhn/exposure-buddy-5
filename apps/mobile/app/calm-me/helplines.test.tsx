import React from 'react'
import { Linking } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'
import type { Helpline } from '@exposure-buddy/core'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockRouterBack }),
}))

// Override slot so the AC #2 empty-state test can swap HELPLINES to [] for one render — a real
// getter (via Object.defineProperty, not object-spread, which would eagerly snapshot the value)
// means apps/mobile/app/calm-me/helplines.tsx's `import { HELPLINES }` (compiled to a property
// access on every read, per Babel's live-binding CJS interop) picks up the change without
// re-requiring the module graph, which would otherwise create a second React instance.
let mockHelplinesOverride: Helpline[] | null = null

jest.mock('@exposure-buddy/core', () => {
  const actual = jest.requireActual('@exposure-buddy/core')
  return Object.defineProperty({ ...actual }, 'HELPLINES', {
    enumerable: true,
    get: () => mockHelplinesOverride ?? actual.HELPLINES,
  })
})

import HelplinesScreen from './helplines'

describe('HelplinesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHelplinesOverride = null
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('AC #1: renders the intro and all 5 HELPLINES entries with name, displayNumber, and a Call button', () => {
    const { getByText, getAllByText } = render(<HelplinesScreen />)

    expect(getByText('helplines.intro')).toBeTruthy()
    expect(getByText('Tele MANAS')).toBeTruthy()
    expect(getByText('1800-891-4416')).toBeTruthy()
    expect(getByText('KIRAN')).toBeTruthy()
    expect(getByText('1800-599-0019')).toBeTruthy()
    expect(getByText('iCall')).toBeTruthy()
    expect(getByText('9152987821')).toBeTruthy()
    expect(getByText('Vandrevala Foundation')).toBeTruthy()
    expect(getByText('9999-666-555')).toBeTruthy()
    expect(getByText('AASRA')).toBeTruthy()
    expect(getByText('+91-22-27546669')).toBeTruthy()
    expect(getAllByText('helplines.call')).toHaveLength(5)
  })

  it('AC #3: tapping a Call button dials tel: + that entry\'s number', () => {
    const { getByLabelText } = render(<HelplinesScreen />)
    fireEvent.press(getByLabelText('helplines.call Tele MANAS: 1800-891-4416'))
    expect(Linking.openURL).toHaveBeenCalledWith('tel:18008914416')
  })

  it('AC #3: a rejected Linking.openURL is caught, logged via console.error, and the screen renders unchanged', async () => {
    const openURL = Linking.openURL as jest.Mock
    openURL.mockRejectedValueOnce(new Error('no dialer'))
    const { getByLabelText, getByText } = render(<HelplinesScreen />)

    await act(async () => {
      fireEvent.press(getByLabelText('helplines.call Tele MANAS: 1800-891-4416'))
      await Promise.resolve()
    })

    expect(console.error).toHaveBeenCalledWith('[HelplinesScreen] call failed:', expect.any(Error))
    expect(getByText('Tele MANAS')).toBeTruthy()
  })

  it('AC #3: a synchronous throw from Linking.openURL is caught and logged, no crash', () => {
    const openURL = Linking.openURL as jest.Mock
    openURL.mockImplementationOnce(() => {
      throw new Error('sync failure')
    })
    const { getByLabelText } = render(<HelplinesScreen />)

    expect(() => {
      fireEvent.press(getByLabelText('helplines.call Tele MANAS: 1800-891-4416'))
    }).not.toThrow()
    expect(console.error).toHaveBeenCalledWith('[HelplinesScreen] call failed:', expect.any(Error))
  })

  it('the top-left Back button calls router.back() with no error', () => {
    const { getByLabelText } = render(<HelplinesScreen />)
    fireEvent.press(getByLabelText('calmMe.back'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('AC #7/#8: each Call button has minHeight >= 56 and the expected accessibilityLabel format', () => {
    const { getByLabelText } = render(<HelplinesScreen />)
    const button = getByLabelText('helplines.call Tele MANAS: 1800-891-4416')
    expect(button).toHaveStyle({ minHeight: 56 })
    expect(button.props.accessibilityRole).toBe('button')

    expect(getByLabelText('helplines.call KIRAN: 1800-599-0019')).toBeTruthy()
    expect(getByLabelText('helplines.call iCall: 9152987821')).toBeTruthy()
    expect(getByLabelText('helplines.call Vandrevala Foundation: 9999-666-555')).toBeTruthy()
    expect(getByLabelText('helplines.call AASRA: +91-22-27546669')).toBeTruthy()
  })

  it('AC #2: renders the unavailable fallback instead of a blank list when HELPLINES is empty', () => {
    mockHelplinesOverride = []
    const { getByText, queryByText } = render(<HelplinesScreen />)

    expect(getByText('helplines.unavailable')).toBeTruthy()
    expect(queryByText('Tele MANAS')).toBeNull()
  })
})
