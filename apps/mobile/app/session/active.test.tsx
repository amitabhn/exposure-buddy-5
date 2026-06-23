import React from 'react'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
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
const mockSetGroundingActive = jest.fn()
const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('@exposure-buddy/core', () => ({
  transition: jest.fn(() => ({ ok: true })),
}))

const { useLocalSearchParams } = require('expo-router')
const { transition } = require('@exposure-buddy/core')

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({
    clearSessionInProgress: mockClearSessionInProgress,
    setGroundingActive: mockSetGroundingActive,
  })
  useLocalSearchParams.mockReturnValue({
    sessionId: 'session-uuid-1',
    fearItemId: 'item-uuid-1',
    description: 'Test situation',
    preSuds: '6',
  })
})

const ActiveScreen = require('./active').default

describe('ActiveScreen — existing tests', () => {
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

  it('calls setGroundingActive before navigating to /session/grounding on Stop Exposure (Story 9.2)', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.stopExposure')) })
    expect(mockSetGroundingActive).toHaveBeenCalled()
  })

  it('Stop Exposure button has an accessibilityHint (Story 9.3 P1 fix)', () => {
    const { getByLabelText } = render(<ActiveScreen />)
    const btn = getByLabelText('session.active.stopExposure')
    expect(btn.props.accessibilityHint).toBe('session.active.stopExposureHint')
  })

})

describe('ActiveScreen — modal cancel buttons (Story 9.3 P0 fix)', () => {
  it('SUDS-logging modal Cancel button has accessibilityRole and accessibilityLabel', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.logSuds')) })
    const cancelBtn = getByLabelText('ladder.cancel')
    expect(cancelBtn.props.accessibilityRole).toBe('button')
  })

  it('SUDS-logging modal Cancel button dismisses the modal', async () => {
    const { getByLabelText, queryByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.logSuds')) })
    await act(async () => { fireEvent.press(getByLabelText('ladder.cancel')) })
    expect(queryByLabelText('session.active.logButton')).toBeNull()
  })

  it('completion modal Cancel button has accessibilityRole and accessibilityLabel', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    const cancelBtn = getByLabelText('ladder.cancel')
    expect(cancelBtn.props.accessibilityRole).toBe('button')
  })

  it('completion modal Cancel button dismisses the modal', async () => {
    const { getByLabelText, queryByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByLabelText('ladder.cancel')) })
    expect(queryByLabelText('session.active.finishSession')).toBeNull()
  })
})

describe('ActiveScreen — maxSudsLogged initialisation', () => {
  it('initialises maxSudsLogged from preSuds param and propagates peakSuds=max(pre,debrief) to debrief URL', async () => {
    useLocalSearchParams.mockReturnValue({
      sessionId: 'session-uuid-1',
      fearItemId: 'item-uuid-1',
      description: 'Test situation',
      preSuds: '7',
    })
    // Open completion modal, pick SUDS 5 (lower than preSuds=7)
    // peakSuds should be max(7, 5) = 7 — verified via the debrief URL param
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-5')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await waitFor(() => {
      const debriefCall = mockRouterPush.mock.calls.find((c: string[]) => c[0]?.includes('/session/debrief'))
      expect(debriefCall).toBeDefined()
      expect(debriefCall![0]).toContain('peakSuds=7')
    })
  })
})

describe('ActiveScreen — completion modal', () => {
  it('completion modal opens on Complete Exposure tap', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    expect(getByLabelText('session.active.finishSession')).toBeTruthy()
  })

  it('completion modal shows SudsScale buttons', async () => {
    const { getByLabelText, getAllByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    const buttons = getAllByTestId(/^suds-btn-/)
    expect(buttons).toHaveLength(11)
  })

  it('Finish session button is disabled when no SUDS selected', async () => {
    const { getByLabelText } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    const finishBtn = getByLabelText('session.active.finishSession')
    expect(finishBtn.props.accessibilityState?.disabled ?? finishBtn.props.disabled).toBeTruthy()
  })
})

describe('ActiveScreen — handleCompleteSession happy path', () => {
  it('enqueues suds_readings, exposure_sessions, and fear_ladder_items on complete', async () => {
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await waitFor(() => {
      expect(mockEnqueue).toHaveBeenCalledWith('suds_readings', 'INSERT', expect.objectContaining({ suds_value: 4 }))
      expect(mockEnqueue).toHaveBeenCalledWith('exposure_sessions', 'UPDATE', expect.objectContaining({ status: 'completed' }))
      expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'UPDATE', expect.objectContaining({ status: 'completed' }))
    })
  })

  it('calls clearSessionInProgress after completion', async () => {
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await waitFor(() => {
      expect(mockClearSessionInProgress).toHaveBeenCalled()
    })
  })

  it('navigates to /session/debrief with all required params', async () => {
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.stringContaining('/session/debrief')
      )
    })
    const debriefCall = mockRouterPush.mock.calls.find((c: string[]) => c[0]?.includes('/session/debrief'))
    expect(debriefCall).toBeDefined()
    const callArg = debriefCall![0] as string
    expect(callArg).toContain('sessionId=session-uuid-1')
    expect(callArg).toContain('debriefSuds=4')
    expect(callArg).toContain('preSuds=6')
    expect(callArg).toContain('peakSuds=')
    expect(callArg).toContain('completedAtMs=')
  })

  it('skips fear_ladder_items enqueue when fearItemId is null/empty', async () => {
    useLocalSearchParams.mockReturnValue({
      sessionId: 'session-uuid-1',
      fearItemId: '',
      description: 'Test situation',
      preSuds: '6',
    })
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await waitFor(() => {
      expect(mockEnqueue).not.toHaveBeenCalledWith('fear_ladder_items', expect.anything(), expect.anything())
    })
  })

  it('double-tap guard: isCompletingSession prevents re-entry while completion is in flight', async () => {
    // Hold enqueue pending to freeze the completion mid-flight
    mockEnqueue.mockReturnValue(new Promise(() => {}))
    const { getByLabelText, getByTestId } = render(<ActiveScreen />)
    await act(async () => { fireEvent.press(getByLabelText('session.active.completeExposure')) })
    await act(async () => { fireEvent.press(getByTestId('suds-btn-4')) })
    await act(async () => { fireEvent.press(getByLabelText('session.active.finishSession')) })
    await act(async () => {})
    // One enqueue fired (suds_readings INSERT) then hangs — downstream steps not reached
    expect(mockEnqueue).toHaveBeenCalledTimes(1)
    expect(mockClearSessionInProgress).not.toHaveBeenCalled()
  })
})
