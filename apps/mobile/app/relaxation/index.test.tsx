import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
    const { getByRole } = render(<RelaxationPickerScreen />)
    for (const key of ['boxBreathing', 'grounding54321', 'breathing478', 'bhramari', 'nadiShodhana', 'bodyScan']) {
      expect(getByRole('button', { name: `relaxation.techniques.${key}.label` })).toBeTruthy()
    }
  })

  it('Box Breathing opens the existing breathing screen', () => {
    const { getByRole } = render(<RelaxationPickerScreen />)
    fireEvent.press(getByRole('button', { name: 'relaxation.techniques.boxBreathing.label' }))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/calm-me/breathing')
  })

  it('5-4-3-2-1 Grounding opens the existing grounding screen', () => {
    const { getByRole } = render(<RelaxationPickerScreen />)
    fireEvent.press(getByRole('button', { name: 'relaxation.techniques.grounding54321.label' }))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/calm-me/grounding')
  })

  it.each(['breathing478', 'bhramari', 'nadiShodhana', 'bodyScan'])(
    'unbuilt technique %s opens the Coming soon screen carrying its key',
    (key) => {
      const { getByRole } = render(<RelaxationPickerScreen />)
      fireEvent.press(getByRole('button', { name: `relaxation.techniques.${key}.label` }))
      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/relaxation/coming-soon', params: { technique: key } })
    },
  )

  it('never routes into the exposure flow and carries no fearItemId or sessionId', () => {
    for (const technique of RELAXATION_TECHNIQUES) {
      mockPush.mockClear()
      mockFocusCallbacks.forEach((cb) => cb()) // re-arm the double-tap guard between presses
      const { getByRole, unmount } = render(<RelaxationPickerScreen />)
      fireEvent.press(getByRole('button', { name: `relaxation.techniques.${technique.key}.label` }))
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
    const { getByRole } = render(<RelaxationPickerScreen />)
    const card = getByRole('button', { name: 'relaxation.techniques.boxBreathing.label' })
    fireEvent.press(card)
    fireEvent.press(card)
    expect(mockPush).toHaveBeenCalledTimes(1)

    // back from the technique screen: the picker regains focus
    act(() => { mockFocusCallbacks.forEach((cb) => cb()) })
    fireEvent.press(card)
    expect(mockPush).toHaveBeenCalledTimes(2)
  })
})
