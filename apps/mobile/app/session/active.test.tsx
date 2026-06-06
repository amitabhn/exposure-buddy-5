import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: mockEnqueue })),
}))

jest.mock('../../src/components/session/SudsScale', () => ({
  SudsScale: ({ onChange }: { onChange: (v: number) => void }) => {
    const { TouchableOpacity, Text } = require('react-native')
    return (
      <>
        {Array.from({ length: 11 }, (_, i) => i).map((v) => (
          <TouchableOpacity key={v} testID={`suds-btn-${v}`} onPress={() => onChange(v)}>
            <Text>{v}</Text>
          </TouchableOpacity>
        ))}
      </>
    )
  },
}))

const { useLocalSearchParams } = require('expo-router')

beforeEach(() => {
  jest.clearAllMocks()
  useLocalSearchParams.mockReturnValue({
    sessionId: 'session-uuid-1',
    fearItemId: 'item-uuid-1',
    description: 'Test situation',
    preSuds: '6',
  })
})

const ActiveScreen = require('./active').default

describe('ActiveScreen', () => {
  it('renders fear item description from params', () => {
    const { getByText } = render(<ActiveScreen />)
    expect(getByText('Test situation')).toBeTruthy()
  })

  it('renders Stop Exposure button', () => {
    const { getByLabelText } = render(<ActiveScreen />)
    expect(getByLabelText('session.active.stopExposure')).toBeTruthy()
  })

  it('opens SUDS modal with 11 buttons on log button press', async () => {
    const { getByLabelText, getAllByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.logSuds')) })
    const buttons = getAllByTestId(/^suds-btn-/)
    expect(buttons).toHaveLength(11)
  })

  it('enqueues suds_readings on log confirm (including odd value 3)', async () => {
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.logSuds')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-3')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.logButton')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'suds_readings',
        'INSERT',
        expect.objectContaining({ suds_value: 3 })
      )
    })
  })

  it('navigates to /session/grounding with fearItemId on Stop Exposure', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.stopExposure')) })
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('fearItemId=item-uuid-1')
    )
  })

  it('renders CalmMe button', () => {
    const { getByLabelText } = render(<ActiveScreen />)
    expect(getByLabelText('session.active.calmMe')).toBeTruthy()
  })

  it('CalmMe button navigates to /calm-me', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.calmMe')) })
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })
})
