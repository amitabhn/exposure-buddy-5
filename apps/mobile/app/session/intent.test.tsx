import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockSetSessionInProgress = jest.fn()
const mockSetSessionIntention = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
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
  mockUseAuth.mockReturnValue({
    authState: { userId: 'user-123' },
    isAuthenticated: true,
    setSessionInProgress: mockSetSessionInProgress,
    setSessionIntention: mockSetSessionIntention,
  })
  useLocalSearchParams.mockReturnValue({
    fearItemId: 'item-uuid-1',
    sessionId: 'session-uuid-1',
    description: 'Test fear situation',
    predictedSuds: '5',
    technique: 'somatic',
  })
})

const IntentScreen = require('./intent').default

describe('IntentScreen', () => {
  it('renders pre-exposure SUDS scale with 11 buttons', () => {
    const { getAllByTestId } = render(<IntentScreen />)
    const buttons = getAllByTestId(/^suds-btn-/)
    expect(buttons).toHaveLength(11)
  })

  it('Continue button is disabled until SUDS selected', () => {
    const { getByLabelText } = render(<IntentScreen />)
    const continueBtn = getByLabelText('session.intent.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true)
  })

  it('Continue button is enabled after SUDS selected (including odd value 3)', async () => {
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-3')) })
    const continueBtn = getByLabelText('session.intent.continue')
    expect(continueBtn.props.accessibilityState?.disabled).toBe(false)
  })

  it('shows intention recommended hint when predictedSuds >= 7', () => {
    useLocalSearchParams.mockReturnValue({
      fearItemId: 'item-uuid-1',
      sessionId: 'session-uuid-1',
      description: 'Test',
      predictedSuds: '7',
    })
    const { queryByText } = render(<IntentScreen />)
    expect(queryByText('session.intent.intentionRecommended')).toBeTruthy()
  })

  it('does not show intention hint when predictedSuds < 7', () => {
    useLocalSearchParams.mockReturnValue({
      fearItemId: 'item-uuid-1',
      sessionId: 'session-uuid-1',
      description: 'Test',
      predictedSuds: '4',
    })
    const { queryByText } = render(<IntentScreen />)
    expect(queryByText('session.intent.intentionRecommended')).toBeNull()
  })

  it('enqueues exposure_sessions INSERT on Continue', async () => {
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-6')) })
    await act(async () => { fireEvent.press(getByLabelText('session.intent.continue')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'INSERT',
        expect.objectContaining({ status: 'started', technique: 'somatic' })
      )
    })
  })

  it('enqueues suds_readings INSERT on Continue with selected SUDS value', async () => {
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-6')) })
    await act(async () => { fireEvent.press(getByLabelText('session.intent.continue')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'suds_readings',
        'INSERT',
        expect.objectContaining({ suds_value: 6 })
      )
    })
  })

  it('writes SessionRecoveryData JSON blob to MMKV on Continue', async () => {
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-5')) })
    await act(async () => { fireEvent.press(getByLabelText('session.intent.continue')) })
    await waitFor(() => {
      expect(mockSetSessionInProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-uuid-1',
          fearItemId: 'item-uuid-1',
          preSuds: 5,
          description: 'Test fear situation',
        })
      )
    })
  })

  it('navigates to /session/briefing on Continue', async () => {
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.intent.continue')) })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.stringContaining('/session/briefing')
      )
    })
  })

  it('enqueue payload contains technique: null when technique is absent from params', async () => {
    useLocalSearchParams.mockReturnValue({
      fearItemId: 'item-uuid-1',
      sessionId: 'session-uuid-1',
      description: 'Test fear situation',
      predictedSuds: '5',
    })
    const { getByLabelText, getByTestId } = render(<IntentScreen />)
    await act(async () => { fireEvent.press(getByTestId('suds-btn-5')) })
    await act(async () => { fireEvent.press(getByLabelText('session.intent.continue')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'INSERT',
        expect.objectContaining({ technique: null })
      )
    })
  })
})
