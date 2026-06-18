import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()
const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace, back: mockRouterBack }),
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

const mockClearSessionInProgress = jest.fn()
const mockClearSessionIntention = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@exposure-buddy/core', () => ({
  CALM_ME_AFFIRMATIONS: ['calmMe.affirmation.1'],
}))

const { useLocalSearchParams } = require('expo-router')

const sessionRecoveryData = {
  sessionId: 'session-uuid-1',
  fearItemId: 'item-uuid-1',
  preSuds: 6,
  description: 'Test situation',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEnqueue.mockResolvedValue(undefined)
  mockUseAuth.mockReturnValue({
    sessionRecoveryData: null,
    clearSessionInProgress: mockClearSessionInProgress,
    clearSessionIntention: mockClearSessionIntention,
  })
  useLocalSearchParams.mockReturnValue({})
})

const CalmMeScreen = require('./index').default

describe('CalmMeScreen — non-session layout', () => {
  it('renders the affirmation and technique picker without an action footer', () => {
    const { getByText, queryByLabelText } = render(<CalmMeScreen />)
    expect(getByText('calmMe.affirmation.1')).toBeTruthy()
    expect(getByText('calmMe.technique.breathing')).toBeTruthy()
    expect(getByText('calmMe.technique.grounding')).toBeTruthy()
    expect(getByText('calmMe.technique.helplines')).toBeTruthy()
    expect(queryByLabelText('calmMe.keepGoing')).toBeNull()
    expect(queryByLabelText('calmMe.needToStop')).toBeNull()
  })

  it('navigates to the breathing placeholder route on tap', () => {
    const { getByLabelText } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.technique.breathing'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me/breathing')
  })
})

describe('CalmMeScreen — in-session layout', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ inSession: '1' })
    mockUseAuth.mockReturnValue({
      sessionRecoveryData,
      clearSessionInProgress: mockClearSessionInProgress,
      clearSessionIntention: mockClearSessionIntention,
    })
  })

  it('renders the action footer', () => {
    const { getByLabelText } = render(<CalmMeScreen />)
    expect(getByLabelText('calmMe.keepGoing')).toBeTruthy()
    expect(getByLabelText('calmMe.needToStop')).toBeTruthy()
  })

  it('does not show the footer when sessionRecoveryData is null even if inSession=1', () => {
    mockUseAuth.mockReturnValue({
      sessionRecoveryData: null,
      clearSessionInProgress: mockClearSessionInProgress,
      clearSessionIntention: mockClearSessionIntention,
    })
    const { queryByLabelText } = render(<CalmMeScreen />)
    expect(queryByLabelText('calmMe.keepGoing')).toBeNull()
  })

  it('Keep Going dismisses the screen via router.back with no enqueue/state change', () => {
    const { getByLabelText } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.keepGoing'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockClearSessionInProgress).not.toHaveBeenCalled()
  })

  it('Need to Stop -> Not now routes home without enqueueing', () => {
    const { getByLabelText, getByText } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.needToStop'))
    expect(getByText('calmMe.debriefNow')).toBeTruthy()
    fireEvent.press(getByLabelText('calmMe.notNow'))
    expect(mockRouterReplace).toHaveBeenCalledWith('/')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('Need to Stop -> Yes -> fresh SUDS prompt -> selecting a value enqueues abandonment and routes to debrief with the fresh SUDS value', async () => {
    const { getByLabelText, getByTestId } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.needToStop'))
    fireEvent.press(getByLabelText('calmMe.yes'))
    await act(async () => { fireEvent.press(getByTestId('suds-btn-3')) })

    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith(
        'exposure_sessions',
        'UPDATE',
        expect.objectContaining({ id: 'session-uuid-1', status: 'abandoned' })
      )
      expect(mockEnqueue).toHaveBeenCalledWith(
        'fear_ladder_items',
        'UPDATE',
        expect.objectContaining({ id: 'item-uuid-1', status: 'pending' })
      )
      expect(mockClearSessionInProgress).toHaveBeenCalled()
      expect(mockClearSessionIntention).toHaveBeenCalledWith('session-uuid-1')
    })

    const debriefCall = mockRouterPush.mock.calls.find((c: string[]) => c[0]?.includes('/session/debrief'))
    expect(debriefCall).toBeDefined()
    const url = debriefCall![0] as string
    expect(url).toContain('sessionId=session-uuid-1')
    expect(url).toContain('fearItemId=item-uuid-1')
    expect(url).toContain('preSuds=6')
    expect(url).toContain('debriefSuds=3')
    expect(url).toContain('peakSuds=3')
    expect(url).toContain('completedAtMs=')
  })

  it('guards a null fearItemId in the debrief URL instead of interpolating the literal string "null"', async () => {
    mockUseAuth.mockReturnValue({
      sessionRecoveryData: { ...sessionRecoveryData, fearItemId: null },
      clearSessionInProgress: mockClearSessionInProgress,
      clearSessionIntention: mockClearSessionIntention,
    })
    const { getByLabelText, getByTestId } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.needToStop'))
    fireEvent.press(getByLabelText('calmMe.yes'))
    await act(async () => { fireEvent.press(getByTestId('suds-btn-5')) })

    await waitFor(() => {
      const debriefCall = mockRouterPush.mock.calls.find((c: string[]) => c[0]?.includes('/session/debrief'))
      expect(debriefCall).toBeDefined()
      expect(debriefCall![0]).toContain('fearItemId=&')
      expect(debriefCall![0]).not.toContain('fearItemId=null')
      expect(mockEnqueue).not.toHaveBeenCalledWith('fear_ladder_items', expect.anything(), expect.anything())
    })
  })

  it('Exit dismisses the screen via router.back with no state change', () => {
    const { getByLabelText } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.exit'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockClearSessionInProgress).not.toHaveBeenCalled()
  })

  it('Exit while the Debrief now? confirm is open dismisses both the confirm and the screen, with no state change', () => {
    const { getByLabelText, getByText } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.needToStop'))
    expect(getByText('calmMe.debriefNow')).toBeTruthy()
    fireEvent.press(getByLabelText('calmMe.exit'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockClearSessionInProgress).not.toHaveBeenCalled()
  })

  it('Exit while the fresh-SUDS prompt is open dismisses it and the screen, with no enqueue/state change', () => {
    const { getByLabelText, getByTestId } = render(<CalmMeScreen />)
    fireEvent.press(getByLabelText('calmMe.needToStop'))
    fireEvent.press(getByLabelText('calmMe.yes'))
    expect(getByTestId('suds-btn-0')).toBeTruthy()
    fireEvent.press(getByLabelText('calmMe.exit'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalledWith(expect.stringContaining('/session/debrief'))
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockClearSessionInProgress).not.toHaveBeenCalled()
  })
})
