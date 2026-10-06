import React from 'react'
import { render, fireEvent, act, within } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts && 'technique' in opts ? `${key}:${opts.technique}` : key),
  }),
}))

const mockPush = jest.fn()
const mockFocusCallbacks: Array<() => void> = []

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    require('react').useEffect(() => {
      mockFocusCallbacks.push(cb)
      return cb()
    }, [])
  },
}))

jest.mock('../../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

import RelaxationPickerScreen from './index'
import { RELAXATION_TECHNIQUES } from '../../src/relaxation/techniques'

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusCallbacks.length = 0
})

describe('RelaxationPickerScreen (Story 19.2)', () => {
  it('lists the six relaxation techniques by name', () => {
    const { getByTestId, getByText } = render(<RelaxationPickerScreen />)
    for (const { key } of RELAXATION_TECHNIQUES) {
      expect(getByTestId(`relaxation-card-${key}`)).toBeTruthy()
      expect(getByText(`relaxation.techniques.${key}.label`)).toBeTruthy()
    }
  })

  it('shows a visible "Coming soon" badge on the four unbuilt techniques only', () => {
    const { getAllByText, getByTestId } = render(<RelaxationPickerScreen />)
    expect(getAllByText('relaxation.comingSoon.badge')).toHaveLength(4)
    for (const { key, route } of RELAXATION_TECHNIQUES) {
      const card = getByTestId(`relaxation-card-${key}`)
      const hasBadge = within(card).queryByText('relaxation.comingSoon.badge') !== null
      expect(hasBadge).toBe(route === null)
    }
  })

  it('announces an unbuilt technique as coming soon, and a built one by its plain name', () => {
    const { getByTestId } = render(<RelaxationPickerScreen />)
    for (const { key, route } of RELAXATION_TECHNIQUES) {
      const label = getByTestId(`relaxation-card-${key}`).props.accessibilityLabel
      expect(label).toBe(
        route === null
          ? `relaxation.comingSoon.cardLabel:relaxation.techniques.${key}.label`
          : `relaxation.techniques.${key}.label`,
      )
    }
  })

  it('Box Breathing opens the existing breathing screen', () => {
    const { getByTestId } = render(<RelaxationPickerScreen />)
    fireEvent.press(getByTestId('relaxation-card-boxBreathing'))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/calm-me/breathing')
  })

  it('5-4-3-2-1 Grounding opens the existing grounding screen', () => {
    const { getByTestId } = render(<RelaxationPickerScreen />)
    fireEvent.press(getByTestId('relaxation-card-grounding54321'))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/calm-me/grounding')
  })

  it.each(['breathing478', 'bhramari', 'nadiShodhana', 'bodyScan'])(
    'unbuilt technique %s opens the Coming soon screen carrying its key',
    (key) => {
      const { getByTestId } = render(<RelaxationPickerScreen />)
      fireEvent.press(getByTestId(`relaxation-card-${key}`))
      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/relaxation/coming-soon', params: { technique: key } })
    },
  )

  it('never routes into the exposure flow and carries no fearItemId or sessionId', () => {
    for (const technique of RELAXATION_TECHNIQUES) {
      mockPush.mockClear()
      mockFocusCallbacks.forEach((cb) => cb()) // re-arm the double-tap guard between presses
      const { getByTestId, unmount } = render(<RelaxationPickerScreen />)
      fireEvent.press(getByTestId(`relaxation-card-${technique.key}`))
      expect(mockPush).toHaveBeenCalledTimes(1)
      const [target] = mockPush.mock.calls[0] as [string | { pathname: string; params?: Record<string, string> }]
      if (typeof target === 'string') {
        expect(target.startsWith('/session')).toBe(false)
      } else {
        expect(target.pathname.startsWith('/session')).toBe(false)
        expect(Object.keys(target.params ?? {})).not.toEqual(expect.arrayContaining(['fearItemId']))
        expect(Object.keys(target.params ?? {})).not.toEqual(expect.arrayContaining(['sessionId']))
      }
      unmount()
    }
  })

  it('a rapid double tap on a card opens the technique once, and the picker re-arms when it regains focus', () => {
    const { getByTestId } = render(<RelaxationPickerScreen />)
    const card = getByTestId('relaxation-card-boxBreathing')
    fireEvent.press(card)
    fireEvent.press(card)
    expect(mockPush).toHaveBeenCalledTimes(1)

    // back from the technique screen: the picker regains focus
    act(() => { mockFocusCallbacks.forEach((cb) => cb()) })
    fireEvent.press(card)
    expect(mockPush).toHaveBeenCalledTimes(2)
  })
})
